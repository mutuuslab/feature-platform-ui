// Unleash Feature Flag 연동 추상화 (안 A · headless).
// 플랫폼이 SoR — flag "원하는/동기화된" 상태를 store(flagStates)에 보관(= UI 표시·드리프트 비교).
// USE_BACKEND(=VITE_API_URL) 시 백엔드 /api/flags 로도 push(실제 Unleash Admin API 어댑터).
// dataProvider/aiProvider 와 동일한 Mock↔real 패턴.
import { store } from "./store";
import { API_URL, USE_BACKEND } from "./apiConfig";
import type { UnleashConstraint } from "./population";
import type { FlagEnv, FlagEnvState, FlagStateRecord } from "../domain/types";

export const flagMode = (): "unleash" | "mock" => (USE_BACKEND ? "unleash" : "mock");
export const FLAG_ENVS: FlagEnv[] = ["dev", "qa", "prod"];

export function flagKeyOf(featureId: string): string {
  return `feature_${featureId.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
}

const OFF: FlagEnvState = { enabled: false, rollout: 0 };

export function getFlagState(featureId: string): FlagStateRecord {
  return (
    store.get<FlagStateRecord>("flagStates", featureId) ?? {
      id: featureId,
      flagKey: flagKeyOf(featureId),
      envs: { dev: { ...OFF }, qa: { ...OFF }, prod: { ...OFF } },
      constraintsSummary: "",
    }
  );
}

function persist(s: FlagStateRecord) {
  if (store.get<FlagStateRecord>("flagStates", s.id)) store.update<FlagStateRecord>("flagStates", s.id, s);
  else store.create<FlagStateRecord>("flagStates", s);
}

// 백엔드(실제 Unleash) push — 연결 시에만. UI는 store 상태로 즉시 반영(낙관적).
function pushBackend(path: string, body: unknown) {
  if (!USE_BACKEND) return;
  fetch(`${API_URL}/api/flags/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
}

/** 룰을 Unleash로 동기화(해당 env 활성 + rollout + constraints 적용). store.audit 남김.
 *  constraints: 실제 Unleash flexibleRollout 전략에 적용할 제약(미지정 시 룰 없음). */
export function syncFlag(featureId: string, summary: string, env: FlagEnv, rollout: number, actor: string, constraints: UnleashConstraint[] = []) {
  const s = getFlagState(featureId);
  const next: FlagStateRecord = { ...s, envs: { ...s.envs, [env]: { enabled: true, rollout } }, constraintsSummary: summary, lastSyncAt: new Date().toISOString() };
  persist(next);
  store.audit({ actor, action: "FLAG_SYNC", objectType: "FeatureFlag", objectId: next.flagKey, after: `${env} ${rollout}%`, reason: summary });
  // 실제 Unleash Admin API 가 제약을 적용하도록 flagKey + constraints + stickiness 동봉.
  pushBackend("sync", { featureId, flagKey: next.flagKey, environment: env, rollout, summary, constraints, stickiness: "vin" });
}

export function setFlagEnabled(featureId: string, env: FlagEnv, on: boolean, actor: string) {
  const s = getFlagState(featureId);
  persist({ ...s, envs: { ...s.envs, [env]: { ...s.envs[env], enabled: on } } });
  store.audit({ actor, action: on ? "FLAG_ENABLE" : "FLAG_KILL", objectType: "FeatureFlag", objectId: s.flagKey, after: `${env}:${on ? "on" : "off"}` });
  // toggle 라우트는 body.flagKey 를 사용 → 반드시 동봉.
  pushBackend(`${featureId}/toggle`, { flagKey: s.flagKey, environment: env, enabled: on });
}

/** rollout 변경은 store(낙관적)에만 반영. 실제 Unleash 반영은 Sync 시 일괄 push(별도 rollout 라우트 없음). */
export function setFlagRollout(featureId: string, env: FlagEnv, rollout: number) {
  const s = getFlagState(featureId);
  persist({ ...s, envs: { ...s.envs, [env]: { ...s.envs[env], rollout } } });
}

/** 드리프트: 현재 룰 요약(desired) vs 마지막 동기화된 요약(actual). 미동기화면 null. */
export function flagDrift(featureId: string, desiredSummary: string): boolean | null {
  const s = store.get<FlagStateRecord>("flagStates", featureId);
  if (!s || !s.lastSyncAt) return null;
  return s.constraintsSummary !== desiredSummary;
}

/** 결정적 metrics (노출/활성) — 데모용. */
export function flagMetrics(featureId: string): { exposures: number; enabledPct: number } {
  let h = 0;
  for (let i = 0; i < featureId.length; i++) h = (h * 31 + featureId.charCodeAt(i)) | 0;
  h = Math.abs(h);
  return { exposures: 5000 + (h % 90000), enabledPct: 70 + (h % 28) };
}
