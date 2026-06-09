// 백엔드 시드 — 프론트 resource 형태와 동일(features/gates/...). bootstrap 시 프론트 store에 overlay된다.
const GATE_CODES = ["RG1", "RG2", "RG3", "RG4", "RG5", "RG6", "RG7", "RG8", "RG9"] as const;
const GATE_OWNER: Record<string, string> = {
  RG1: "Feature Product Owner", RG2: "Feature System Owner", RG3: "Feature System Owner", RG4: "Feature System Owner",
  RG5: "Feature SW Owner", RG6: "Feature SW Owner", RG7: "Feature System Owner", RG8: "Feature Release Owner", RG9: "Feature Operation Owner",
};
const now = "2026-06-09T09:00:00.000Z";

function mkGates(fid: string, statuses: Record<string, string>) {
  return GATE_CODES.map((code) => ({
    id: `${fid}-${code}`, featureId: fid, gateCode: code, status: statuses[code] ?? "NOT_STARTED",
    owner: GATE_OWNER[code], evidenceCount: statuses[code] === "PASS" ? 2 : 0,
    approver: statuses[code] === "PASS" ? "Gate Approver" : undefined, approvalDate: statuses[code] === "PASS" ? now : undefined,
  }));
}

export function buildServerDb() {
  return {
    features: [
      { id: "FEAT-RPA-001", name: "Remote Parking Assist", description: "스마트폰 원격 주차/출차", status: "Developing", owners: { productOwner: "P. Product", systemOwner: "S. System", swOwner: "W. Software", releaseOwner: "R. Release", operationOwner: "O. Operations" }, targetRegion: "KR, EU", targetTrim: "Premium, Signature", deployType: "Binary OTA", customerValue: "주차 편의/프리미엄 차별화", createdAt: now, updatedAt: now },
      { id: "FEAT-ALK-002", name: "Adaptive Lane Keeping", description: "차로 중앙 유지 보조 고도화", status: "Verified", owners: { productOwner: "P. Product", systemOwner: "S. System", swOwner: "W. Software", releaseOwner: "R. Release", operationOwner: "O. Operations" }, targetRegion: "US, KR", targetTrim: "All", deployType: "Hybrid", customerValue: "ADAS 안전성", createdAt: now, updatedAt: now },
      { id: "FEAT-DST-003", name: "Drive Mode Subscription", description: "고성능 드라이브 모드 구독", status: "Released", owners: { productOwner: "P. Product", systemOwner: "S. System", swOwner: "W. Software", releaseOwner: "R. Release", operationOwner: "O. Operations" }, targetRegion: "Global", targetTrim: "Sport", deployType: "Policy-only", customerValue: "구독 매출", createdAt: now, updatedAt: now },
      { id: "FEAT-VFC-004", name: "Cabin Climate Pre-Conditioning", description: "출발 전 실내 온도 조절", status: "Approved", owners: { productOwner: "P. Product", systemOwner: "S. System" }, targetRegion: "KR", targetTrim: "All", deployType: "Binary OTA", customerValue: "편의성", createdAt: now, updatedAt: now },
    ],
    gates: [
      ...mkGates("FEAT-RPA-001", { RG1: "PASS", RG2: "PASS", RG3: "PASS", RG7: "PASS", RG4: "PASS", RG5: "PENDING", RG6: "PASS" }),
      ...mkGates("FEAT-ALK-002", { RG1: "PASS", RG2: "PASS", RG3: "PASS", RG4: "PASS", RG5: "PASS", RG6: "PASS", RG7: "PASS", RG8: "PENDING", RG9: "PENDING" }),
      ...mkGates("FEAT-DST-003", { RG1: "PASS", RG2: "PASS", RG3: "PASS", RG4: "PASS", RG5: "PASS", RG6: "PASS", RG7: "PASS", RG8: "PASS", RG9: "PASS" }),
      ...mkGates("FEAT-VFC-004", { RG1: "PASS", RG2: "PASS", RG3: "PASS" }),
    ],
    featureRequests: [
      { id: "FRQ-2026-0007", name: "Voice Assistant Wake Word", businessNeed: "음성 비서 호출어 커스터마이징", targetRegion: "KR", targetTrim: "All", deployType: "Binary OTA", requester: "K. Requester", status: "SUBMITTED", completeness: "PASS", createdAt: now },
      { id: "FRQ-2026-0008", name: "Trailer Hitch Assist", businessNeed: "트레일러 연결 보조", targetRegion: "US", targetTrim: "Pickup", deployType: "Binary OTA", requester: "K. Requester", status: "DRAFT", createdAt: now },
    ],
    evidence: [
      { id: "EV-001", featureId: "FEAT-RPA-001", gateCode: "RG5", type: "HIL Test Report", fileName: "rpa_hil_v1.pdf", version: "v1", status: "PENDING", submittedBy: "W. Software", submittedAt: now },
      { id: "EV-002", featureId: "FEAT-RPA-001", gateCode: "RG6", type: "API Contract Test", fileName: "rpa_api_test.json", version: "v2", status: "ACCEPTED", submittedBy: "Acme Supplier", submittedAt: now },
    ],
    supplierWorkPackages: [
      { id: "WP-001", featureId: "FEAT-RPA-001", supplier: "Acme Supplier", workPackage: "Parking ECU SW", sow: "SOW-2026-014", apiContract: "API-RPA-01 v2", evidenceStatus: "SUBMITTED", reviewStatus: "PENDING", dueDate: "2026-07-15" },
    ],
    releasePlans: [
      { id: "RP-001", featureId: "FEAT-DST-003", deployType: "Policy-only", targetVinGroup: "Sport-Global-2026", rolloutWaves: "1% → 10% → 100%", rollbackPlan: "Policy revert to v0", rollbackReady: true, decision: "GO" },
    ],
    auditLogs: [
      { id: "AU-0001", actor: "system", action: "BOOTSTRAP", objectType: "Server", objectId: "db", after: "seeded", timestamp: now },
    ],
  };
}

export type ServerDb = ReturnType<typeof buildServerDb>;
export type ResourceName = keyof ServerDb;
