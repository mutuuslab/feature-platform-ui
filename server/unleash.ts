// Unleash Admin API 어댑터 (안 A · headless). 플랫폼 백엔드만 Unleash를 호출 — 프런트/차량은 직접 호출 안 함.
// 1차 타겟: OSS(자체 호스팅) Unleash — github.com/Unleash/unleash (docker-compose.unleash.yml + unleash-init.sh).
//   Admin API(v4/v5) 호환. Segments는 Pro 전용이라 미사용 — constraints 인라인. 유료(Paid)도 URL/토큰만 바꾸면 동일 동작.
// 비밀은 서버 env 전용: UNLEASH_URL, UNLEASH_ADMIN_TOKEN, UNLEASH_PROJECT(기본 default).
//   UNLEASH_ENV_MAP(선택): 앱 env(dev/qa/prod) → 실제 Unleash 환경명 매핑. 예 "dev:development,prod:production". 기본 identity.
// 미설정 시 enabled=false → /api/flags 는 503, 프런트는 Mock 으로 동작.
const URL_BASE = process.env.UNLEASH_URL?.replace(/\/$/, "");
const TOKEN = process.env.UNLEASH_ADMIN_TOKEN;
const PROJECT = process.env.UNLEASH_PROJECT || "default";

export const unleashEnabled = Boolean(URL_BASE && TOKEN);

// 앱 환경키 → 실제 Unleash 환경명 매핑 (OSS 인스턴스 환경명이 다를 때)
const ENV_MAP: Record<string, string> = Object.fromEntries(
  (process.env.UNLEASH_ENV_MAP || "")
    .split(",")
    .map((p) => p.split(":").map((s) => s.trim()))
    .filter((kv) => kv.length === 2 && kv[0] && kv[1]),
);
const mapEnv = (e: string) => ENV_MAP[e] ?? e;

interface UnleashConstraint { contextName: string; operator: string; values: string[] }

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(`${URL_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: TOKEN as string, ...(init.headers ?? {}) },
  });
  if (!res.ok && res.status !== 409) throw new Error(`Unleash ${res.status} ${path}`);
  return res;
}

// flag 보장(없으면 생성) — 409는 이미 존재로 간주.
async function ensureFlag(flagKey: string) {
  await api(`/api/admin/projects/${PROJECT}/features`, { method: "POST", body: JSON.stringify({ name: flagKey, type: "release" }) });
}

/** 룰 동기화: flag 보장 → 해당 환경에 flexibleRollout 전략(rollout + constraints) 설정 → 환경 enable. */
export async function syncFlag(input: { flagKey: string; environment: string; rollout: number; constraints: UnleashConstraint[]; stickiness?: string }) {
  const { flagKey, rollout, constraints } = input;
  const env = mapEnv(input.environment);
  await ensureFlag(flagKey);
  await api(`/api/admin/projects/${PROJECT}/features/${flagKey}/environments/${env}/strategies`, {
    method: "POST",
    body: JSON.stringify({ name: "flexibleRollout", parameters: { rollout: String(rollout), stickiness: input.stickiness ?? "vin", groupId: flagKey }, constraints }),
  });
  await api(`/api/admin/projects/${PROJECT}/features/${flagKey}/environments/${env}/on`, { method: "POST" });
  return { ok: true };
}

export async function toggleFlag(flagKey: string, environment: string, enabled: boolean) {
  const env = mapEnv(environment);
  await api(`/api/admin/projects/${PROJECT}/features/${flagKey}/environments/${env}/${enabled ? "on" : "off"}`, { method: "POST" });
  return { ok: true, enabled };
}

export async function getFlag(flagKey: string) {
  const res = await api(`/api/admin/projects/${PROJECT}/features/${flagKey}`);
  return res.json();
}

export async function flagMetrics(flagKey: string) {
  const res = await api(`/api/admin/client-metrics/features/${flagKey}`);
  return res.json();
}
