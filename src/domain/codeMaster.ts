// Code Master — 시트 07_Code_Master / 16_Lifecycle / 00_Overview(9 Gate) / 39_Design_System_Tokens
import type {
  GateCode,
  GateStatus,
  LifecycleStatus,
  ProductionDecision,
} from "./types";

export const LIFECYCLE_SEQUENCE: LifecycleStatus[] = [
  "Proposed",
  "Approved",
  "Developing",
  "Verified",
  "Released",
  "Deprecated",
  "Retired",
];

// 9 Gate 정의 (시트 00_Overview / 14_9Gate_Readiness)
export interface GateMeta {
  code: GateCode;
  name: string;
  leadOwnerRole: string;
  check: string;
}

export const GATES: GateMeta[] = [
  { code: "RG1", name: "Feature Gate", leadOwnerRole: "Feature Product Owner", check: "Feature Master, Owner, 고객가치, 가격/권한, Lifecycle" },
  { code: "RG2", name: "Requirement Gate", leadOwnerRole: "Feature System Owner", check: "차량/System/SW 요구사항, Verification Criteria Trace" },
  { code: "RG3", name: "Variant Gate", leadOwnerRole: "Feature System Owner", check: "차종/국가/트림/HW/SW Baseline, VIN Eligibility" },
  { code: "RG4", name: "Control Gate", leadOwnerRole: "Feature System Owner", check: "Runtime Policy, Safe Default, Kill Switch, Rollback Control" },
  { code: "RG5", name: "Verification Gate", leadOwnerRole: "Feature SW Owner", check: "SIL/HIL/차량 검증, Rollback Test, Telemetry Validation, Defect Closure" },
  { code: "RG6", name: "Supplier Gate", leadOwnerRole: "Feature SW Owner", check: "Supplier WP, API Contract, Delivery Evidence, Change Impact" },
  { code: "RG7", name: "Safety / Security Gate", leadOwnerRole: "Feature System Owner", check: "Safety Impact, TARA, Security Review, Integrity Check" },
  { code: "RG8", name: "OTA Gate", leadOwnerRole: "Feature Release Owner", check: "Deploy Type, Target, Rollout, Rollback, Approval, Audit Log" },
  { code: "RG9", name: "Operations Gate", leadOwnerRole: "Feature Operation Owner", check: "Telemetry, KPI Threshold, Alert, Field Issue Playbook, Rollback Trigger" },
];

// Lifecycle 전이별 게이트 번들 (시트 41 Demo Script step 8~12)
export const GATE_BUNDLE: Record<string, GateCode[]> = {
  "Proposed->Approved": ["RG1", "RG2", "RG3"],
  "Approved->Developing": ["RG7"],
  "Developing->Verified": ["RG4", "RG5", "RG6"],
  "Verified->Released": ["RG8", "RG9"],
};

// 게이트별 책임 Owner 역할 (시트 23 RBAC-019) — Gate 상태를 변경(A/R)할 수 있는 역할
export const GATE_DECISION_ROLE: Record<GateCode, string> = {
  RG1: "Feature Product Owner",
  RG2: "Feature System Owner",
  RG3: "Feature System Owner",
  RG4: "Feature System Owner",
  RG5: "Feature SW Owner",
  RG6: "Feature SW Owner",
  RG7: "Feature System Owner",
  RG8: "Feature Release Owner",
  RG9: "Feature Operation Owner",
};

// 상태 코드 → 색/라벨 (시트 39 Design Tokens). 색만으로 구분 금지 → 항상 라벨 동반.
export const STATUS_COLORS = {
  pass: "#2E7D32",
  pending: "#7A5C00",
  block: "#9A3412",
  rework: "#4B5563",
  neutral: "#1F4E78",
} as const;

export function gateStatusColor(s: GateStatus): string {
  switch (s) {
    case "PASS":
      return STATUS_COLORS.pass;
    case "PENDING":
    case "CONDITIONAL":
      return STATUS_COLORS.pending;
    case "BLOCK":
      return STATUS_COLORS.block;
    case "REWORK":
      return STATUS_COLORS.rework;
    default:
      return STATUS_COLORS.rework;
  }
}

export function decisionColor(d: ProductionDecision): string {
  return d === "GO" ? STATUS_COLORS.pass : d === "HOLD" ? STATUS_COLORS.pending : STATUS_COLORS.block;
}

export function lifecycleColor(s: LifecycleStatus): string {
  switch (s) {
    case "Released":
      return STATUS_COLORS.pass;
    case "Deprecated":
    case "Retired":
      return STATUS_COLORS.rework;
    case "Verified":
    case "Developing":
    case "Approved":
      return STATUS_COLORS.pending;
    default:
      return STATUS_COLORS.neutral;
  }
}

export const DECISION_OPTIONS = [
  "APPROVE",
  "REWORK",
  "REJECT",
  "MERGE",
  "BACKLOG",
  "ESCALATE",
] as const;
