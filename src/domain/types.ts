// 도메인 타입 정의 — 엑셀 시트 05/17/26/38/43 기반

export type LifecycleStatus =
  | "Proposed"
  | "Approved"
  | "Developing"
  | "Verified"
  | "Released"
  | "Deprecated"
  | "Retired";

export type GateCode =
  | "RG1"
  | "RG2"
  | "RG3"
  | "RG4"
  | "RG5"
  | "RG6"
  | "RG7"
  | "RG8"
  | "RG9";

export type GateStatus =
  | "PASS"
  | "PENDING"
  | "CONDITIONAL"
  | "BLOCK"
  | "REWORK"
  | "NOT_STARTED";

export type ProductionDecision = "GO" | "HOLD" | "BLOCK";

export type RequestStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "REWORK_REQUESTED"
  | "REGISTERED"
  | "REJECTED"
  | "MERGED";

export type OwnerRoleKey =
  | "productOwner"
  | "systemOwner"
  | "swOwner"
  | "releaseOwner"
  | "operationOwner";

export interface Owners {
  productOwner?: string;
  systemOwner?: string;
  swOwner?: string;
  releaseOwner?: string;
  operationOwner?: string;
}

export interface Feature {
  id: string; // FEAT-RPA-001
  name: string;
  description?: string;
  status: LifecycleStatus;
  owners: Owners;
  targetRegion: string;
  targetTrim: string;
  deployType: "Binary OTA" | "Policy-only" | "Hybrid";
  customerValue?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureRequest {
  id: string; // FRQ-2026-0001
  name: string;
  businessNeed: string;
  targetRegion: string;
  targetTrim: string;
  deployType: Feature["deployType"];
  expectedValue?: string;
  requester: string;
  status: RequestStatus;
  completeness?: "PASS" | "FAIL";
  duplicateResult?: string;
  featureId?: string; // 등록 후 발급된 Feature ID
  createdAt: string;

  // 제안서 상세 (3-Step 등록 위저드)
  department?: string; // 제안 부서
  needsSource?: string; // 고객 니즈 근거 자료 유형
  customerNeeds?: string; // 고객 니즈
  reviewBackground?: string; // 검토 배경
  devAgreement?: string; // 개발 협의
  techConcept?: string; // 기술 컨셉
  useCase?: string; // 유즈케이스
  competitorTrend?: string; // 경쟁사 동향
  regionScopeNote?: string; // 권역 협의 범위
  applyScope?: Record<string, string[]>; // 적용 범위: 권역 → 브랜드[]
  desiredVehicle?: string; // 희망 차종
  relatedDepts?: string[]; // 유관 부서
  execDirective?: boolean; // 경영층 지시사항 여부
  execDirectiveNote?: string; // 경영층 지시 내용
}

export interface Gate {
  id: string;
  featureId: string;
  gateCode: GateCode;
  status: GateStatus;
  owner: string;
  evidenceCount: number;
  approver?: string;
  approvalDate?: string;
  blockingReason?: string;
}

export type EvidenceStatus = "SUBMITTED" | "ACCEPTED" | "REWORK" | "PENDING";

export interface Evidence {
  id: string;
  featureId: string;
  gateCode: GateCode;
  type: string;
  fileName: string;
  version: string;
  status: EvidenceStatus;
  submittedBy: string;
  submittedAt: string;
}

export interface SupplierWorkPackage {
  id: string;
  featureId: string;
  supplier: string;
  workPackage: string;
  sow: string;
  apiContract: string;
  evidenceStatus: EvidenceStatus;
  reviewStatus: "PENDING" | "ACCEPTED" | "REWORK" | "BLOCK";
  dueDate: string;
}

export interface ReleasePlan {
  id: string;
  featureId: string;
  deployType: Feature["deployType"];
  targetVinGroup: string;
  rolloutWaves: string;
  rollbackPlan: string;
  rollbackReady: boolean;
  decision: ProductionDecision;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  objectType: string;
  objectId: string;
  before?: string;
  after?: string;
  reason?: string;
  timestamp: string;
}
