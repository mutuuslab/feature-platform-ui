// 9 Gate → Production Activation 판단 로직 (시트 14_9Gate_Readiness / 41 step 12·14)
import type { Gate, GateCode, GateStatus, LifecycleStatus, ProductionDecision } from "./types";
import { GATE_BUNDLE, GATES, LIFECYCLE_SEQUENCE } from "./codeMaster";

export interface GateSummary {
  passCount: number;
  pendingCount: number;
  blockCount: number;
  total: number;
  decision: ProductionDecision;
}

const isPassing = (s: GateStatus) => s === "PASS" || s === "CONDITIONAL";

/**
 * Production Activation 결정 (시트 41):
 * - 어떤 게이트라도 BLOCK → BLOCK
 * - 9개 모두 PASS(또는 CONDITIONAL) → GO
 * - 그 외(PENDING/REWORK/NOT_STARTED 존재) → HOLD
 * 핵심: OTA(RG8) PASS여도 Verification(RG5) PENDING이면 GO가 아니라 HOLD (step 14).
 */
export function computeGateSummary(gates: Gate[]): GateSummary {
  const byCode = new Map<GateCode, GateStatus>();
  gates.forEach((g) => byCode.set(g.gateCode, g.status));

  let passCount = 0;
  let pendingCount = 0;
  let blockCount = 0;

  for (const meta of GATES) {
    const status = byCode.get(meta.code) ?? "NOT_STARTED";
    if (status === "BLOCK") blockCount += 1;
    else if (isPassing(status)) passCount += 1;
    else pendingCount += 1; // PENDING / REWORK / NOT_STARTED
  }

  const total = GATES.length;
  let decision: ProductionDecision;
  if (blockCount > 0) decision = "BLOCK";
  else if (passCount === total) decision = "GO";
  else decision = "HOLD";

  return { passCount, pendingCount, blockCount, total, decision };
}

/** 특정 Lifecycle 전이에 필요한 게이트 묶음과 충족 여부 */
export function transitionGateState(
  from: LifecycleStatus,
  gates: Gate[],
): { to: LifecycleStatus | null; requiredGates: GateCode[]; satisfied: boolean; blocking: GateCode[] } {
  const idx = LIFECYCLE_SEQUENCE.indexOf(from);
  const to = idx >= 0 && idx < LIFECYCLE_SEQUENCE.indexOf("Released") ? LIFECYCLE_SEQUENCE[idx + 1] : null;
  if (!to) return { to: null, requiredGates: [], satisfied: false, blocking: [] };

  const requiredGates = GATE_BUNDLE[`${from}->${to}`] ?? [];
  const byCode = new Map<GateCode, GateStatus>();
  gates.forEach((g) => byCode.set(g.gateCode, g.status));

  const blocking = requiredGates.filter((c) => !isPassing(byCode.get(c) ?? "NOT_STARTED"));
  return { to, requiredGates, satisfied: blocking.length === 0, blocking };
}

/** 현재 게이트 상태에서 도달 가능한 최고 Lifecycle 상태 (데모용 파생) */
export function derivedLifecycleStatus(gates: Gate[]): LifecycleStatus {
  let current: LifecycleStatus = "Proposed";
  for (let i = 0; i < LIFECYCLE_SEQUENCE.indexOf("Released"); i += 1) {
    const { satisfied } = transitionGateState(current, gates);
    if (satisfied) current = LIFECYCLE_SEQUENCE[i + 1];
    else break;
  }
  return current;
}
