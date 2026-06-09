// RBAC — 시트 23_UI_RBAC_Matrix. Legend: C=Create, R=Read/Update, A=Approve, V=View, N=No Access
import type { GateCode } from "../domain/types";

export type RoleId =
  | "Requester"
  | "PMO"
  | "ProductOwner"
  | "SystemOwner"
  | "SWOwner"
  | "Supplier"
  | "ReleaseOwner"
  | "OperationOwner"
  | "Quality"
  | "Admin";

export interface RoleMeta {
  id: RoleId;
  label: string;
}

export const ROLES: RoleMeta[] = [
  { id: "Requester", label: "Feature Requester" },
  { id: "PMO", label: "Feature Registrar / PMO" },
  { id: "ProductOwner", label: "Feature Product Owner" },
  { id: "SystemOwner", label: "Feature System Owner" },
  { id: "SWOwner", label: "Feature SW Owner" },
  { id: "Supplier", label: "Supplier" },
  { id: "ReleaseOwner", label: "Feature Release Owner" },
  { id: "OperationOwner", label: "Feature Operation Owner" },
  { id: "Quality", label: "Quality / Safety / Security" },
  { id: "Admin", label: "System Admin / PMO" },
];

// 데모용 권한 능력(capability) 집합. 시트 23 매트릭스를 액션 단위로 단순화.
export type Capability =
  | "request.create" // Feature Request 작성/제출
  | "intake.decide" // Intake Board 승인/반려/Merge
  | "owner.assign" // Owner 지정
  | "registry.edit" // Feature 속성 수정
  | "gate.update" // 게이트 상태 변경 (게이트별 추가 검사 필요)
  | "evidence.upload" // Evidence 업로드
  | "evidence.review" // Evidence 검토
  | "supplier.access" // Supplier Portal 접근
  | "release.approve" // Release/Rollout 승인
  | "audit.export"; // Audit Export

const MATRIX: Record<RoleId, Capability[]> = {
  Requester: ["request.create"],
  PMO: ["intake.decide", "owner.assign", "registry.edit", "audit.export"],
  ProductOwner: ["intake.decide", "owner.assign", "registry.edit", "gate.update"],
  SystemOwner: ["registry.edit", "gate.update", "evidence.review"],
  SWOwner: ["gate.update", "evidence.review", "evidence.upload"],
  Supplier: ["supplier.access", "evidence.upload"],
  ReleaseOwner: ["gate.update", "release.approve"],
  OperationOwner: ["gate.update"],
  Quality: ["evidence.review", "audit.export"],
  Admin: [
    "request.create",
    "intake.decide",
    "owner.assign",
    "registry.edit",
    "gate.update",
    "evidence.upload",
    "evidence.review",
    "supplier.access",
    "release.approve",
    "audit.export",
  ],
};

export function can(role: RoleId, cap: Capability): boolean {
  return MATRIX[role]?.includes(cap) ?? false;
}

// 게이트별 결정 권한 (시트 23 RBAC-019). Admin/PMO는 데모상 전체 허용.
const GATE_ROLE_MAP: Record<GateCode, RoleId[]> = {
  RG1: ["ProductOwner"],
  RG2: ["SystemOwner"],
  RG3: ["SystemOwner"],
  RG4: ["SystemOwner"],
  RG5: ["SWOwner"],
  RG6: ["SWOwner"],
  RG7: ["SystemOwner", "Quality"],
  RG8: ["ReleaseOwner"],
  RG9: ["OperationOwner"],
};

export function canDecideGate(role: RoleId, gate: GateCode): boolean {
  if (role === "Admin" || role === "PMO") return true;
  return GATE_ROLE_MAP[gate]?.includes(role) ?? false;
}
