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

  return { features, featureRequests, gates, evidence, supplierWorkPackages, releasePlans, auditLogs, vehicles: buildVehicles(), eligibilityRules: [], eligibilityHistory: [], activations: [], fieldIssues: [], requirements, tests, defects, releaseCandidates, flagStates };
}
