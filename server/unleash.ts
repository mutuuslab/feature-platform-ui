// Unleash Admin API 어댑터 (안 A · headless). 플랫폼 백엔드만 Unleash를 호출 — 프런트/차량은 직접 호출 안 함.
// 비밀은 서버 env 전용: UNLEASH_URL, UNLEASH_ADMIN_TOKEN, UNLEASH_PROJECT(기본 default).
// 미설정 시 enabled=false → /api/flags 는 503, 프런트는 Mock 으로 동작.
const URL_BASE = process.env.UNLEASH_URL?.replace(/\/$/, "");
const TOKEN = process.env.UNLEASH_ADMIN_TOKEN;
const PROJECT = process.env.UNLEASH_PROJECT || "default";

export const unleashEnabled = Boolean(URL_BASE && TOKEN);

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
  const { flagKey, environment, rollout, constraints } = input;
  await ensureFlag(flagKey);
  await api(`/api/admin/projects/${PROJECT}/features/${flagKey}/environments/${environment}/strategies`, {
    method: "POST",
    body: JSON.stringify({ name: "flexibleRollout", parameters: { rollout: String(rollout), stickiness: input.stickiness ?? "vin", groupId: flagKey }, constraints }),
  });
  await api(`/api/admin/projects/${PROJECT}/features/${flagKey}/environments/${environment}/on`, { method: "POST" });
  return { ok: true };
}

export async function toggleFlag(flagKey: string, environment: string, enabled: boolean) {
  await api(`/api/admin/projects/${PROJECT}/features/${flagKey}/environments/${environment}/${enabled ? "on" : "off"}`, { method: "POST" });
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
