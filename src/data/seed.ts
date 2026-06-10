// 시드 데이터 — 시트 41_Demo_Scenario_Script (FEAT-RPA-001 "Remote Parking Assist") 중심
import type {
  AuditLog,
  DefectRecord,
  Evidence,
  FlagStateRecord,
  Feature,
  FeatureRequest,
  Gate,
  GateCode,
  ReleaseCandidateRecord,
  ReleasePlan,
  RequirementRecord,
  SupplierWorkPackage,
  TestRunRecord,
  WorkbenchItemRecord,
} from "../domain/types";
import { GATES } from "../domain/codeMaster";
import { buildVehicles, type ActivationRecord, type EligibilityRuleRecord, type EligibilityVersionRecord, type FieldIssueRecord, type VehicleRecord } from "./population";

const now = "2026-06-09T09:00:00.000Z";

function mkGates(featureId: string, statuses: Partial<Record<GateCode, Gate["status"]>>): Gate[] {
  return GATES.map((g) => ({
    id: `${featureId}-${g.code}`,
    featureId,
    gateCode: g.code,
    status: statuses[g.code] ?? "NOT_STARTED",
    owner: g.leadOwnerRole,
    evidenceCount: statuses[g.code] === "PASS" ? 2 : statuses[g.code] === "PENDING" ? 1 : 0,
    approver: statuses[g.code] === "PASS" ? "Gate Approver" : undefined,
    approvalDate: statuses[g.code] === "PASS" ? now : undefined,
    blockingReason: statuses[g.code] === "BLOCK" ? "Critical open issue" : undefined,
  }));
}

export interface SeedData {
  features: Feature[];
  featureRequests: FeatureRequest[];
  gates: Gate[];
  evidence: Evidence[];
  supplierWorkPackages: SupplierWorkPackage[];
  releasePlans: ReleasePlan[];
  auditLogs: AuditLog[];
  vehicles: VehicleRecord[];
  eligibilityRules: EligibilityRuleRecord[];
  eligibilityHistory: EligibilityVersionRecord[];
  activations: ActivationRecord[];
  fieldIssues: FieldIssueRecord[];
  requirements: RequirementRecord[];
  tests: TestRunRecord[];
  defects: DefectRecord[];
  releaseCandidates: ReleaseCandidateRecord[];
  flagStates: FlagStateRecord[];
  workbenchItems: WorkbenchItemRecord[];
}

export function buildSeed(): SeedData {
  const features: Feature[] = [
    {
      id: "FEAT-RPA-001",
      name: "Remote Parking Assist",
      description: "스마트폰으로 차량을 원격 주차/출차하는 기능",
      status: "Developing",
      owners: {
        productOwner: "P. Product",
        systemOwner: "S. System",
        swOwner: "W. Software",
        releaseOwner: "R. Release",
        operationOwner: "O. Operations",
      },
      targetRegion: "KR, EU",
      targetTrim: "Premium, Signature",
      deployType: "Binary OTA",
      customerValue: "주차 편의성 및 프리미엄 차별화",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "FEAT-ALK-002",
      name: "Adaptive Lane Keeping",
      description: "차로 중앙 유지 보조 고도화",
      status: "Verified",
      owners: {
        productOwner: "P. Product",
        systemOwner: "S. System",
        swOwner: "W. Software",
        releaseOwner: "R. Release",
        operationOwner: "O. Operations",
      },
      targetRegion: "US, KR",
      targetTrim: "All",
      deployType: "Hybrid",
      customerValue: "ADAS 안전성 강화",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "FEAT-DST-003",
      name: "Drive Mode Subscription",
      description: "고성능 드라이브 모드 구독형 활성화",
      status: "Released",
      owners: {
        productOwner: "P. Product",
        systemOwner: "S. System",
        swOwner: "W. Software",
        releaseOwner: "R. Release",
        operationOwner: "O. Operations",
      },
      targetRegion: "Global",
      targetTrim: "Sport",
      deployType: "Policy-only",
      customerValue: "구독 매출 창출",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "FEAT-VFC-004",
      name: "Cabin Climate Pre-Conditioning",
      description: "출발 전 실내 온도 사전 조절",
      status: "Approved",
      owners: { productOwner: "P. Product", systemOwner: "S. System" },
      targetRegion: "KR",
      targetTrim: "All",
      deployType: "Binary OTA",
      customerValue: "사용 편의성",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const gates: Gate[] = [
    // FEAT-RPA-001: Developing 단계 — RG1~3 PASS, RG7 PASS, RG4~6 진행 중 (RG5 PENDING)
    ...mkGates("FEAT-RPA-001", {
      RG1: "PASS",
      RG2: "PASS",
      RG3: "PASS",
      RG7: "PASS",
      RG4: "PASS",
      RG5: "PENDING",
      RG6: "PASS",
    }),
    // FEAT-ALK-002: Verified — RG1~7 PASS, RG8/RG9 진행 중
    ...mkGates("FEAT-ALK-002", {
      RG1: "PASS",
      RG2: "PASS",
      RG3: "PASS",
      RG4: "PASS",
      RG5: "PASS",
      RG6: "PASS",
      RG7: "PASS",
      RG8: "PENDING",
      RG9: "PENDING",
    }),
    // FEAT-DST-003: Released — 9/9 PASS → GO
    ...mkGates("FEAT-DST-003", {
      RG1: "PASS",
      RG2: "PASS",
      RG3: "PASS",
      RG4: "PASS",
      RG5: "PASS",
      RG6: "PASS",
      RG7: "PASS",
      RG8: "PASS",
      RG9: "PASS",
    }),
    // FEAT-VFC-004: Approved — RG1~3 PASS
    ...mkGates("FEAT-VFC-004", { RG1: "PASS", RG2: "PASS", RG3: "PASS" }),
  ];

  const evidence: Evidence[] = [
    { id: "EV-001", featureId: "FEAT-RPA-001", gateCode: "RG5", type: "HIL Test Report", fileName: "rpa_hil_v1.pdf", version: "v1", status: "PENDING", submittedBy: "W. Software", submittedAt: now },
    { id: "EV-002", featureId: "FEAT-RPA-001", gateCode: "RG6", type: "API Contract Test", fileName: "rpa_api_test.json", version: "v2", status: "ACCEPTED", submittedBy: "Acme Supplier", submittedAt: now },
    { id: "EV-003", featureId: "FEAT-RPA-001", gateCode: "RG7", type: "TARA Report", fileName: "rpa_tara.pdf", version: "v1", status: "ACCEPTED", submittedBy: "Q. Quality", submittedAt: now },
  ];

  const supplierWorkPackages: SupplierWorkPackage[] = [
    { id: "WP-001", featureId: "FEAT-RPA-001", supplier: "Acme Supplier", workPackage: "Parking ECU SW", sow: "SOW-2026-014", apiContract: "API-RPA-01 v2", evidenceStatus: "SUBMITTED", reviewStatus: "PENDING", dueDate: "2026-07-15" },
    { id: "WP-002", featureId: "FEAT-ALK-002", supplier: "Bosch-Sim", workPackage: "Lane Camera Pipeline", sow: "SOW-2026-009", apiContract: "API-ALK-03 v1", evidenceStatus: "ACCEPTED", reviewStatus: "ACCEPTED", dueDate: "2026-05-30" },
  ];

  const releasePlans: ReleasePlan[] = [
    { id: "RP-001", featureId: "FEAT-DST-003", deployType: "Policy-only", targetVinGroup: "Sport-Global-2026", rolloutWaves: "Pilot 1% → 10% → 100%", rollbackPlan: "Policy revert to v0", rollbackReady: true, decision: "GO" },
    { id: "RP-002", featureId: "FEAT-ALK-002", deployType: "Hybrid", targetVinGroup: "US-KR-MY26", rolloutWaves: "Pilot 1% → Hold", rollbackPlan: "Binary rollback to prev", rollbackReady: true, decision: "HOLD" },
  ];

  const featureRequests: FeatureRequest[] = [
    { id: "FRQ-2026-0007", name: "Voice Assistant Wake Word", businessNeed: "음성 비서 호출어 커스터마이징", targetRegion: "KR", targetTrim: "All", deployType: "Binary OTA", expectedValue: "사용자 만족도 향상", requester: "K. Requester", status: "SUBMITTED", completeness: "PASS", createdAt: now },
    { id: "FRQ-2026-0008", name: "Trailer Hitch Assist", businessNeed: "트레일러 연결 보조", targetRegion: "US", targetTrim: "Pickup", deployType: "Binary OTA", requester: "K. Requester", status: "DRAFT", createdAt: now },
  ];

  const auditLogs: AuditLog[] = [
    { id: "AU-0001", actor: "J. PMO", action: "REGISTER", objectType: "Feature", objectId: "FEAT-RPA-001", before: "PROPOSED", after: "Proposed (Registered)", reason: "Intake board approved", timestamp: now },
    { id: "AU-0002", actor: "S. System", action: "GATE_PASS", objectType: "Gate", objectId: "FEAT-RPA-001-RG2", before: "PENDING", after: "PASS", reason: "Requirement baseline approved", timestamp: now },
  ];

  const requirements: RequirementRecord[] = [
    { id: "REQ-RPA-001", featureId: "FEAT-RPA-001", type: "Functional", text: "스마트폰 앱으로 원격 주차 시작/중단", asil: "QM", verifyMethod: "Vehicle", status: "APPROVED" },
    { id: "REQ-RPA-002", featureId: "FEAT-RPA-001", type: "Safety", text: "장애물 감지 시 1초 이내 정지", asil: "ASIL B", verifyMethod: "HIL", status: "VERIFIED" },
    { id: "REQ-RPA-003", featureId: "FEAT-RPA-001", type: "Security", text: "원격 제어 세션 위·변조 방지(mTLS)", asil: "QM", verifyMethod: "Review", status: "APPROVED" },
    { id: "REQ-RPA-004", featureId: "FEAT-RPA-001", type: "Functional", text: "연결 끊김 시 안전 정지", asil: "ASIL B", verifyMethod: "SIL", status: "DRAFT" },
    { id: "REQ-ALK-001", featureId: "FEAT-ALK-002", type: "Safety", text: "차로 이탈 시 보조 토크 한계 준수", asil: "ASIL D", verifyMethod: "HIL", status: "VERIFIED" },
    { id: "REQ-ALK-002", featureId: "FEAT-ALK-002", type: "Functional", text: "곡선로 차로 중앙 유지 오차 ≤ 0.2m", asil: "ASIL C", verifyMethod: "Vehicle", status: "APPROVED" },
  ];

  const tests: TestRunRecord[] = [
    { id: "TST-RPA-001", featureId: "FEAT-RPA-001", suite: "Parking Regression", env: "SIL", passed: 124, total: 142, status: "FAIL" },
    { id: "TST-RPA-002", featureId: "FEAT-RPA-001", suite: "Obstacle Stop HIL", env: "HIL", passed: 87, total: 100, status: "RUNNING" },
    { id: "TST-ALK-001", featureId: "FEAT-ALK-002", suite: "Lane Keep Full", env: "Vehicle", passed: 318, total: 318, status: "PASS" },
    { id: "TST-DST-001", featureId: "FEAT-DST-003", suite: "Drive Mode CI", env: "CI", passed: 96, total: 96, status: "PASS" },
  ];

  const defects: DefectRecord[] = [
    { id: "DEF-2026-114", featureId: "FEAT-RPA-001", severity: "Blocker", summary: "저조도 환경 장애물 오감지", owner: "Acme Supplier", status: "OPEN" },
    { id: "DEF-2026-110", featureId: "FEAT-RPA-001", severity: "Major", summary: "앱 재연결 시 상태 불일치", owner: "W. Software", status: "FIXED" },
    { id: "DEF-2026-098", featureId: "FEAT-ALK-002", severity: "Minor", summary: "HMI 경고음 지연", owner: "W. Software", status: "VERIFIED" },
  ];

  const releaseCandidates: ReleaseCandidateRecord[] = [
    { id: "RC-2026-08", name: "August Wave", featureIds: ["FEAT-DST-003", "FEAT-ALK-002"], swBaseline: "SWB-26.8", targetEnv: "prod", status: "DEPLOYED" },
    { id: "RC-2026-09", name: "September RC", featureIds: ["FEAT-RPA-001"], swBaseline: "SWB-26.9", targetEnv: "qa", status: "FROZEN" },
    { id: "RC-2026-10", name: "October Draft", featureIds: ["FEAT-VFC-004"], swBaseline: "SWB-26.10", targetEnv: "dev", status: "DRAFT" },
  ];

  const off = { enabled: false, rollout: 0 };
  const flagStates: FlagStateRecord[] = [
    { id: "FEAT-DST-003", flagKey: "feature_dst_003", envs: { dev: { enabled: true, rollout: 100 }, qa: { enabled: true, rollout: 100 }, prod: { enabled: true, rollout: 100 } }, constraintsSummary: "trim ∈ {Sport}", lastSyncAt: now },
    { id: "FEAT-ALK-002", flagKey: "feature_alk_002", envs: { dev: { enabled: true, rollout: 100 }, qa: { enabled: true, rollout: 50 }, prod: off }, constraintsSummary: "region ∈ {US, KR}", lastSyncAt: now },
  ];

  const wb = (page: string, group: string, title: string, status: string, sub?: string, owner?: string): WorkbenchItemRecord =>
    ({ id: `WB-${page.toUpperCase()}-${title.replace(/[^A-Za-z0-9]+/g, "").slice(0, 8)}-${Math.abs([...title].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)) % 9000 + 1000}`, page, group, title, status, sub, owner });
  const workbenchItems: WorkbenchItemRecord[] = [
    // Product & Scope
    wb("product", "Pricing", "FEAT-DST-003 · Subscription $9.9/mo", "승인완료", "Performance 패키지", "Product Owner"),
    wb("product", "Pricing", "FEAT-RPA-001 · One-time $299", "가격검토", "Convenience 패키지", "Product Owner"),
    wb("product", "Scope", "FEAT-RPA-001 · KR·EU / Premium", "가격검토", "MY26, ADAS Lv2+", "System Owner"),
    // SW & API
    wb("swapi", "API", "API-RPA-01 · POST /park/start", "배포", "mTLS+OAuth, v2", "SW Owner"),
    wb("swapi", "API", "API-RPA-02 · GET /park/status", "리뷰", "mTLS, v2", "SW Owner"),
    wb("swapi", "Component", "CMP-APP-02 · mobile-app v1.4.2", "설계", "W. Software", "SW Owner"),
    // Control & Runtime
    wb("control", "Policy", "POL-RPA-01 · parked && entitled && region∈scope", "활성", "Safe default: Disabled", "System Owner"),
    wb("control", "Policy", "POL-DST-01 · subscription.active", "활성", "Safe default: Standard", "System Owner"),
    wb("control", "Policy", "POL-RPA-02 · offline 안전정지", "초안", "검증 전", "System Owner"),
    // Architecture
    wb("arch", "API Contract", "API-007 · Register Official Feature", "승인", "POST /api/features/register", "PMO/Product"),
    wb("arch", "API Contract", "API-021 · Validate API Contract", "검증", "POST /api/api-contracts/{id}/validate", "SW/Supplier"),
    wb("arch", "Event", "EVT-012 · KillSwitchActivated", "초안", "Policy Service", "Release Owner"),
    // Retirement
    wb("retire", "Deprecation", "FEAT-LEGACY-12 · 활성 84,200대", "영향분석", "대체: FEAT-DST-003", "Operation Owner"),
    wb("retire", "Retirement", "FEAT-LEGACY-09 · 활성 0대", "종료승인", "7년 보관, Cold storage", "Operation Owner"),
    // Governance & Data
    wb("gov", "Change Request", "CR-2026-201 · API v2→v3", "검토", "영향 게이트 RG4/RG6", "PMO"),
    wb("gov", "Change Request", "CR-2026-198 · EU 지역 확대", "승인", "영향 게이트 RG3", "PMO"),
    wb("gov", "Baseline", "BL-ALK-002-v3 · Req+API+Test", "접수", "Lock 대기", "PMO"),
    // Operating Model
    wb("operating", "Backlog", "Guided request wizard", "진행", "Pilot feedback · High adoption", "PMO"),
    wb("operating", "Backlog", "Rollback readiness blocker", "TODO", "Release simulation · Critical", "Release Owner"),
    wb("operating", "Training", "Supplier Evidence Portal 교육", "TODO", "Supplier session", "SW Owner"),
    // Ops Control
    wb("opsctl", "Alert", "ALT-001 · Safety/Security KPI CRITICAL", "FIRING", "BLOCK/ROLLBACK · Immediate", "System/Safety"),
    wb("opsctl", "Alert", "ALT-003 · Telemetry Missing CRITICAL", "ACK", "HOLD · 1 day", "Operation Owner"),
    wb("opsctl", "Alert", "ALT-008 · Activation Failure WARNING", "RESOLVED", "Managed HOLD", "Operation Owner"),
    // Launch & Adoption
    wb("launch", "Pilot", "Gate trial (RG1~9 dry-run)", "진행", "Wave 2 · Gate Review Board", "Gate Board"),
    wb("launch", "Pilot", "Release simulation", "미착수", "Wave 3 · Release Owner", "Release Owner"),
    wb("launch", "Migration", "Requirements → FeatureRequirement", "진행", "Wave 1 · ALM/DOORS", "System Owner"),
  ];

  return { features, featureRequests, gates, evidence, supplierWorkPackages, releasePlans, auditLogs, vehicles: buildVehicles(), eligibilityRules: [], eligibilityHistory: [], activations: [], fieldIssues: [], requirements, tests, defects, releaseCandidates, flagStates, workbenchItems };
}
