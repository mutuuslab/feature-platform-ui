// Feature Platform 백엔드 stub (Node/TS + Express). 시트 28 API Contract + OpenAPI.
// 실행: npm install && npm run dev  →  http://localhost:9100  (Swagger UI: /docs)
import express, { type Request, type Response } from "express";
import cors from "cors";
import { buildServerDb, type ResourceName } from "./seed.js";
import { openapi } from "./openapi.js";

const PORT = Number(process.env.PORT) || 9100; // 포트 8000 금지 규칙
const app = express();
app.use(cors());
app.use(express.json());

let db = buildServerDb();
const RESOURCES = Object.keys(db) as ResourceName[];
let seq = 5000;
const genId = (r: string) => `${r.slice(0, 3).toUpperCase()}-${(seq += 1)}`;

const audit = (entry: Record<string, unknown>) =>
  db.auditLogs.unshift({ id: genId("AU"), timestamp: new Date().toISOString(), ...entry } as never);

const GATES = ["RG1", "RG2", "RG3", "RG4", "RG5", "RG6", "RG7", "RG8", "RG9"];
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
});
