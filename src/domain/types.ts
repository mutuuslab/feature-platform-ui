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
  applySegments?: string[]; // 적용 차급/세그먼트
  targetSOP?: string; // 양산 적용 목표 시기 (SOP / MY)
  businessModel?: string; // 과금 모델 (기본탑재/유상옵션/구독/FoD)
  volumeEstimate?: string; // 예상 적용 대수 (연간)
  desiredVehicle?: string; // 희망 차종
  relatedDepts?: string[]; // 유관 부서
  execDirective?: boolean; // 경영층 지시사항 여부
  execDirectiveNote?: string; // 경영층 지시 내용
  attachments?: AttachmentMeta[]; // 근거/첨부 자료 (Mock: 메타데이터만 저장)

  // ── Full 거버넌스 모듈 ──
  // Step1
  category?: string; // Feature 도메인 분류
  priority?: string; // 우선순위
  metricBaseline?: string; // 정량 근거 — 현재 지표
  metricTarget?: string; // 정량 근거 — 목표 지표
  // Step2 — 적용 조건·안전·보안·데이터
  dependencyHW?: string; // 필수 HW (센서/제어기/통신)
  dependencySW?: string; // 최소 SW/플랫폼
  asilLevel?: string; // 기능안전 ISO 26262 (QM/A/B/C/D)
  cyberR155?: boolean; // 사이버보안 UNECE R155 관련
  cyberNote?: string; // 보안 비고
  dataCollected?: string; // 수집 데이터 항목
  personalData?: boolean; // 개인정보 포함
  otaRollback?: boolean; // OTA 롤백 가능
  phasedRollout?: boolean; // 단계적(Wave) 적용
  // Step3 — 협의·사업성·승인
  deptStatus?: Record<string, DeptStatus>; // 부서별 협의 상태
  investBand?: string; // 개략 투자 규모
  bepNote?: string; // 손익/BEP 코멘트
  devStartTarget?: string; // 개발착수 목표 시점
  approvalRequest?: string; // 승인 요청 결정 (LC0)
}

export type DeptStatus = "미요청" | "협의중" | "완료";

export interface AttachmentMeta {
  uid: string;
  name: string;
  size: number; // bytes
  type?: string; // MIME
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
