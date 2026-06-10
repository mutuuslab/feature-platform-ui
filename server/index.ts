// Feature Platform 백엔드 stub (Node/TS + Express). 시트 28 API Contract + OpenAPI.
// 실행: npm install && npm run dev  →  http://localhost:9100  (Swagger UI: /docs)
import "dotenv/config"; // server/.env 자동 로드 (ANTHROPIC_API_KEY 등) — 다른 import보다 먼저 실행
import express, { type Request, type Response } from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { buildServerDb, type ResourceName } from "./seed.js";
import { openapi } from "./openapi.js";
import { AI_TASKS, type AiTaskKey } from "./ai.js";
import { unleashEnabled, syncFlag as unleashSync, toggleFlag, getFlag, flagMetrics } from "./unleash.js";

const PORT = Number(process.env.PORT) || 9100; // 포트 8000 금지 규칙
const app = express();
app.set("trust proxy", true); // 터널/프록시(Cloudflare 등) 뒤에서 실제 클라이언트 IP 인식

// CORS: 기본은 전체 허용. 공개 배포 시 ALLOWED_ORIGIN 에 Pages 도메인만 지정 권장.
//   예) ALLOWED_ORIGIN=https://mutuuslab.github.io
const ORIGINS = (process.env.ALLOWED_ORIGIN || "*").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: ORIGINS.includes("*") ? true : ORIGINS }));
app.use(express.json());

// AI 엔드포인트 간이 레이트리밋 (IP당 분당 호출 제한) — 공개 백엔드의 키 남용/비용 폭주 방지.
const AI_RATE_PER_MIN = Number(process.env.AI_RATE_PER_MIN) || 30;
const aiHits = new Map<string, { count: number; resetAt: number }>();
app.use("/api/ai", (req, res, next) => {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const e = aiHits.get(ip);
  if (!e || now > e.resetAt) {
    aiHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return next();
  }
  if (e.count >= AI_RATE_PER_MIN) {
    res.setHeader("Retry-After", Math.ceil((e.resetAt - now) / 1000));
    return res.status(429).json({ error: `요청이 너무 많습니다 (분당 ${AI_RATE_PER_MIN}회 제한).` });
  }
  e.count += 1;
  next();
});

let db = buildServerDb();
const RESOURCES = Object.keys(db) as ResourceName[];
let seq = 5000;
const genId = (r: string) => `${r.slice(0, 3).toUpperCase()}-${(seq += 1)}`;

const audit = (entry: Record<string, unknown>) =>
  db.auditLogs.unshift({ id: genId("AU"), timestamp: new Date().toISOString(), ...entry } as never);

const GATES = ["RG1", "RG2", "RG3", "RG4", "RG5", "RG6", "RG7", "RG8", "RG9"] as const;
function gateSummary(featureId: string) {
  const gs = db.gates.filter((g) => g.featureId === featureId);
  const by = new Map(gs.map((g) => [g.gateCode, g.status]));
  let pass = 0, pending = 0, block = 0;
  for (const code of GATES) {
    const s = by.get(code) ?? "NOT_STARTED";
    if (s === "BLOCK") block += 1;
    else if (s === "PASS" || s === "CONDITIONAL") pass += 1;
    else pending += 1;
  }
  const decision = block > 0 ? "BLOCK" : pass === GATES.length ? "GO" : "HOLD";
  return { passCount: pass, pendingCount: pending, blockCount: block, total: GATES.length, decision };
}

// ── Meta ──
app.get("/health", (_req, res) => res.json({ status: "ok", resources: RESOURCES, time: new Date().toISOString() }));
app.get("/openapi.json", (_req, res) => res.json(openapi));
app.get("/docs", (_req, res) =>
  res.type("html").send(`<!doctype html><html><head><meta charset="utf-8"><title>Feature Platform API</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"></head>
<body><div id="ui"></div><script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>window.onload=()=>SwaggerUIBundle({url:'/openapi.json',dom_id:'#ui'})</script></body></html>`),
);
app.get("/api/bootstrap", (_req, res) => res.json(db));

// ── 시트 28 명명 계약 (generic CRUD보다 먼저 매칭) ──
app.post("/api/feature-requests/:id/submit", (req, res) => {
  const r = db.featureRequests.find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: "not found" });
  r.status = "SUBMITTED";
  audit({ actor: "api", action: "REQUEST_SUBMITTED", objectType: "FeatureRequest", objectId: r.id, after: "SUBMITTED" });
  res.json({ ok: true, status: "SUBMITTED" });
});

app.get("/api/features/duplicates", (req, res) => {
  const q = String(req.query.featureName ?? "").toLowerCase();
  const candidates = db.features.filter((f) => q && f.name.toLowerCase().includes(q)).map((f) => ({ id: f.id, name: f.name, similarity: 0.6 }));
  res.json({ candidates, result: candidates.length ? "DUPLICATE_CANDIDATES" : "NO_DUPLICATE" });
});

app.post("/api/intake-reviews/:id/decision", (req, res) => {
  const { decision, reason } = req.body ?? {};
  audit({ actor: "api", action: `INTAKE_${decision}`, objectType: "FeatureRequest", objectId: req.params.id, reason });
  res.json({ ok: true, decision });
});

app.post("/api/features/register", (req, res) => {
  const body = req.body ?? {};
  const fid = body.id || genId("FEAT");
  const feature = { id: fid, name: body.name ?? "Unnamed", status: "Proposed", owners: body.owners ?? {}, targetRegion: body.targetRegion ?? "", targetTrim: body.targetTrim ?? "", deployType: body.deployType ?? "Binary OTA", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.features.unshift(feature as never);
  GATES.forEach((code) => db.gates.push({ id: `${fid}-${code}`, featureId: fid, gateCode: code, status: "NOT_STARTED", owner: "", evidenceCount: 0 } as never));
  audit({ actor: "api", action: "FEATURE_REGISTERED", objectType: "Feature", objectId: fid, after: "Proposed" });
  res.status(201).json(feature);
});

app.put("/api/features/:id/owners", (req, res) => {
  const f = db.features.find((x) => x.id === req.params.id);
  if (!f) return res.status(404).json({ error: "not found" });
  (f as { owners: unknown }).owners = req.body ?? {};
  audit({ actor: "api", action: "OWNER_CHANGED", objectType: "Feature", objectId: f.id });
  res.json(f);
});

app.put("/api/features/:id/gates/:gateCode", (req, res) => {
  const g = db.gates.find((x) => x.featureId === req.params.id && x.gateCode === req.params.gateCode);
  if (!g) return res.status(404).json({ error: "not found" });
  const before = g.status;
  Object.assign(g, { status: req.body?.status ?? g.status, approver: req.body?.approver, approvalDate: new Date().toISOString() });
  audit({ actor: "api", action: `GATE_${g.status}`, objectType: "Gate", objectId: g.id, before, after: g.status });
  res.json(g);
});

app.get("/api/features/:id/gates/summary", (req, res) => res.json(gateSummary(req.params.id)));

app.post("/api/features/:id/production-activation", (req, res) => {
  const f = db.features.find((x) => x.id === req.params.id);
  if (!f) return res.status(404).json({ error: "not found" });
  const sum = gateSummary(f.id);
  if (sum.decision !== "GO") return res.status(409).json({ error: "NOT_GO", summary: sum });
  (f as { status: string }).status = "Released";
  audit({ actor: "api", action: "PRODUCTION_ACTIVATION_GO", objectType: "Feature", objectId: f.id, after: "Released" });
  res.json({ ok: true, status: "Released" });
});

// ── AI 어시스트 (실제 Claude / claude-opus-4-8) ──
// 프런트 src/data/aiProvider.ts 가 USE_BACKEND 시 이 엔드포인트를 호출. 키 미설정 시 503.
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

app.post("/api/ai/:task", async (req: Request, res: Response) => {
  const cfg = AI_TASKS[req.params.task as AiTaskKey];
  if (!cfg) return res.status(404).json({ error: "unknown ai task" });
  if (!anthropic)
    return res.status(503).json({ error: "ANTHROPIC_API_KEY 미설정 — 백엔드 AI 비활성. 프런트는 Mock으로 동작합니다." });
  try {
    // adaptive thinking + output_config 는 런타임 API 지원(설치 SDK 타입 lag) → any로 전달.
    const body: any = {
      model: "claude-opus-4-8",
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: cfg.system,
      messages: [{ role: "user", content: cfg.user(req.body ?? {}) }],
      output_config: { format: { type: "json_schema", schema: cfg.schema } },
    };
    const msg = await anthropic.messages.create(body);
    const text = msg.content.find((b): b is Anthropic.TextBlock => b.type === "text")?.text ?? "{}";
    res.json(JSON.parse(text));
  } catch (e) {
    console.error("AI error", e);
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── Unleash Feature Flag (안 A · headless 어댑터) ──
// 프런트(src/data/flagProvider.ts)가 USE_BACKEND 시 호출. 미설정 시 503 → 프런트 Mock.
const flagGuard = (res: Response) => res.status(503).json({ error: "UNLEASH_URL/UNLEASH_ADMIN_TOKEN 미설정 — 프런트는 Mock 으로 동작합니다." });

app.post("/api/flags/sync", async (req: Request, res: Response) => {
  if (!unleashEnabled) return flagGuard(res);
  try {
    const { flagKey, environment, rollout, constraints } = req.body ?? {};
    const r = await unleashSync({ flagKey, environment, rollout: Number(rollout) || 0, constraints: constraints ?? [] });
    audit({ actor: "api", action: "FLAG_SYNC", objectType: "FeatureFlag", objectId: flagKey, after: `${environment} ${rollout}%` });
    res.json(r);
  } catch (e) { res.status(502).json({ error: (e as Error).message }); }
});

app.post("/api/flags/:feature/toggle", async (req: Request, res: Response) => {
  if (!unleashEnabled) return flagGuard(res);
  try {
    const { flagKey, environment, enabled } = req.body ?? {};
    res.json(await toggleFlag(flagKey, environment, Boolean(enabled)));
  } catch (e) { res.status(502).json({ error: (e as Error).message }); }
});

app.get("/api/flags/:flagKey", async (req: Request, res: Response) => {
  if (!unleashEnabled) return flagGuard(res);
  try { res.json(await getFlag(req.params.flagKey)); } catch (e) { res.status(502).json({ error: (e as Error).message }); }
});

app.get("/api/flags/:flagKey/metrics", async (req: Request, res: Response) => {
  if (!unleashEnabled) return flagGuard(res);
  try { res.json(await flagMetrics(req.params.flagKey)); } catch (e) { res.status(502).json({ error: (e as Error).message }); }
});

// ── Generic CRUD (Refine simple-rest 호환) ──
function isResource(r: string): r is ResourceName {
  return (RESOURCES as string[]).includes(r);
}

app.get("/api/:resource", (req: Request, res: Response) => {
  if (!isResource(req.params.resource)) return res.status(404).json({ error: "unknown resource" });
  const all = db[req.params.resource] as unknown[];
  res.setHeader("X-Total-Count", String(all.length));
  res.setHeader("Access-Control-Expose-Headers", "X-Total-Count");
  res.json(all);
});

app.get("/api/:resource/:id", (req, res) => {
  if (!isResource(req.params.resource)) return res.status(404).json({ error: "unknown resource" });
  const item = (db[req.params.resource] as { id: string }[]).find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: "not found" });
  res.json(item);
});

app.post("/api/:resource", (req, res) => {
  if (!isResource(req.params.resource)) return res.status(404).json({ error: "unknown resource" });
  const item = { id: req.body?.id || genId(req.params.resource), ...req.body };
  (db[req.params.resource] as unknown[]).unshift(item);
  audit({ actor: "api", action: "CREATE", objectType: req.params.resource, objectId: item.id });
  res.status(201).json(item);
});

function patch(req: Request, res: Response) {
  if (!isResource(req.params.resource)) return res.status(404).json({ error: "unknown resource" });
  const arr = db[req.params.resource] as { id: string }[];
  const idx = arr.findIndex((x) => x.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: "not found" });
  arr[idx] = { ...arr[idx], ...req.body };
  res.json(arr[idx]);
}
app.patch("/api/:resource/:id", patch);
app.put("/api/:resource/:id", patch);

app.delete("/api/:resource/:id", (req, res) => {
  if (!isResource(req.params.resource)) return res.status(404).json({ error: "unknown resource" });
  const arr = db[req.params.resource] as { id: string }[];
  const idx = arr.findIndex((x) => x.id === req.params.id);
  if (idx >= 0) arr.splice(idx, 1);
  res.json({ id: req.params.id });
});

app.post("/api/_reset", (_req, res) => { db = buildServerDb(); res.json({ ok: true }); });

app.listen(PORT, () => {
  console.log(`Feature Platform API stub → http://localhost:${PORT}`);
  console.log(`  Swagger UI: http://localhost:${PORT}/docs`);
  console.log(`  Bootstrap : http://localhost:${PORT}/api/bootstrap`);
  console.log(`  AI(/api/ai): ${anthropic ? "ENABLED (claude-opus-4-8)" : "DISABLED — ANTHROPIC_API_KEY 미설정 → 503"}`);
  console.log(`  Flags(/api/flags): ${unleashEnabled ? "ENABLED (Unleash Admin API)" : "DISABLED — UNLEASH_URL/TOKEN 미설정 → 503"}`);
  console.log(`  CORS origin: ${ORIGINS.includes("*") ? "* (전체 허용)" : ORIGINS.join(", ")} · AI rate: ${AI_RATE_PER_MIN}/min`);
});
