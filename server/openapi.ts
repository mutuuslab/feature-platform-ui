// OpenAPI 3.0 스펙 — 시트 28 API Contract Detail 기반. /openapi.json 으로 제공, /docs Swagger UI.
export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Feature Platform API (Stub)",
    version: "0.1.0",
    description: "자동차 Feature Lifecycle 거버넌스 플랫폼 백엔드 stub. 시트 28 API Contract Detail를 반영.",
  },
  servers: [{ url: "/", description: "Local stub" }],
  tags: [
    { name: "Bootstrap" }, { name: "Resources" }, { name: "Intake (LC0)" }, { name: "Registry" }, { name: "Gates (RG1~RG9)" }, { name: "Release & OTA" }, { name: "Audit" },
  ],
  paths: {
    "/health": { get: { tags: ["Bootstrap"], summary: "Health check", responses: { "200": { description: "OK" } } } },
    "/api/bootstrap": { get: { tags: ["Bootstrap"], summary: "전체 리소스 스냅샷 (프론트 store hydrate)", responses: { "200": { description: "All resources", content: { "application/json": { schema: { $ref: "#/components/schemas/Bootstrap" } } } } } } },

    "/api/{resource}": {
      parameters: [{ name: "resource", in: "path", required: true, schema: { type: "string", enum: ["features", "gates", "featureRequests", "evidence", "supplierWorkPackages", "releasePlans", "auditLogs"] } }],
      get: { tags: ["Resources"], summary: "리소스 목록 (Refine simple-rest, X-Total-Count 헤더)", responses: { "200": { description: "List", headers: { "X-Total-Count": { schema: { type: "integer" } } }, content: { "application/json": { schema: { type: "array", items: {} } } } } } },
      post: { tags: ["Resources"], summary: "리소스 생성", requestBody: { content: { "application/json": { schema: {} } } }, responses: { "201": { description: "Created" } } },
    },
    "/api/{resource}/{id}": {
      parameters: [{ name: "resource", in: "path", required: true, schema: { type: "string" } }, { name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: ["Resources"], summary: "단건 조회", responses: { "200": { description: "OK" }, "404": { description: "Not found" } } },
      patch: { tags: ["Resources"], summary: "부분 수정", requestBody: { content: { "application/json": { schema: {} } } }, responses: { "200": { description: "Updated" } } },
      put: { tags: ["Resources"], summary: "수정", requestBody: { content: { "application/json": { schema: {} } } }, responses: { "200": { description: "Updated" } } },
      delete: { tags: ["Resources"], summary: "삭제", responses: { "200": { description: "Deleted" } } },
    },

    // 시트 28 명명 계약 (대표)
    "/api/feature-requests/{id}/submit": { post: { tags: ["Intake (LC0)"], summary: "API-003 Submit Feature Request (DRAFT→SUBMITTED)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "WorkflowResult" } } } },
    "/api/features/duplicates": { get: { tags: ["Intake (LC0)"], summary: "API-004 Search Duplicate Feature", parameters: [{ name: "featureName", in: "query", schema: { type: "string" } }], responses: { "200": { description: "DuplicateCandidateList" } } } },
    "/api/intake-reviews/{id}/decision": { post: { tags: ["Intake (LC0)"], summary: "API-006 Submit Intake Decision (Approve/Rework/Reject/Merge)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/IntakeDecisionDto" } } } }, responses: { "200": { description: "WorkflowResult" } } } },
    "/api/features/register": { post: { tags: ["Registry"], summary: "API-007 Register Official Feature (Feature ID 발급)", requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/FeatureRegistrationDto" } } } }, responses: { "201": { description: "Feature" } } } },
    "/api/features/{id}/owners": { put: { tags: ["Registry"], summary: "API-010 Assign Owners", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Owners" } } } }, responses: { "200": { description: "Owners" } } } },
    "/api/features/{id}/gates/{gateCode}": { put: { tags: ["Gates (RG1~RG9)"], summary: "API-023 Update Gate Status (PASS/PENDING/BLOCK)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "gateCode", in: "path", required: true, schema: { type: "string", enum: ["RG1", "RG2", "RG3", "RG4", "RG5", "RG6", "RG7", "RG8", "RG9"] } }], requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/GateDecisionDto" } } } }, responses: { "200": { description: "GateStatus" } } } },
    "/api/features/{id}/gates/summary": { get: { tags: ["Gates (RG1~RG9)"], summary: "API-024 Get 9 Gate Summary (GO/HOLD/BLOCK 계산)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "GateSummaryDto", content: { "application/json": { schema: { $ref: "#/components/schemas/GateSummaryDto" } } } } } } },
    "/api/features/{id}/production-activation": { post: { tags: ["Release & OTA"], summary: "API-027 Approve Production Activation (Verified→Released)", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "WorkflowResult" } } } },
    "/api/audit-logs": { get: { tags: ["Audit"], summary: "API-035 Get Audit Log", responses: { "200": { description: "AuditLogList" } } } },
  },
  components: {
    schemas: {
      Bootstrap: { type: "object", properties: { features: { type: "array", items: { $ref: "#/components/schemas/Feature" } }, gates: { type: "array", items: { $ref: "#/components/schemas/Gate" } }, featureRequests: { type: "array", items: {} }, evidence: { type: "array", items: {} }, supplierWorkPackages: { type: "array", items: {} }, releasePlans: { type: "array", items: {} }, auditLogs: { type: "array", items: {} } } },
      Feature: { type: "object", properties: { id: { type: "string", example: "FEAT-RPA-001" }, name: { type: "string" }, status: { type: "string", enum: ["Proposed", "Approved", "Developing", "Verified", "Released", "Deprecated", "Retired"] }, owners: { $ref: "#/components/schemas/Owners" }, targetRegion: { type: "string" }, targetTrim: { type: "string" }, deployType: { type: "string", enum: ["Binary OTA", "Policy-only", "Hybrid"] } }, required: ["id", "name", "status"] },
      Owners: { type: "object", properties: { productOwner: { type: "string" }, systemOwner: { type: "string" }, swOwner: { type: "string" }, releaseOwner: { type: "string" }, operationOwner: { type: "string" } } },
      Gate: { type: "object", properties: { id: { type: "string" }, featureId: { type: "string" }, gateCode: { type: "string" }, status: { type: "string", enum: ["PASS", "PENDING", "CONDITIONAL", "BLOCK", "REWORK", "NOT_STARTED"] }, owner: { type: "string" }, evidenceCount: { type: "integer" } } },
      GateDecisionDto: { type: "object", properties: { status: { type: "string" }, approver: { type: "string" }, reason: { type: "string" } } },
      GateSummaryDto: { type: "object", properties: { passCount: { type: "integer" }, pendingCount: { type: "integer" }, blockCount: { type: "integer" }, total: { type: "integer" }, decision: { type: "string", enum: ["GO", "HOLD", "BLOCK"] } } },
      IntakeDecisionDto: { type: "object", properties: { decision: { type: "string", enum: ["APPROVE", "REWORK", "REJECT", "MERGE", "BACKLOG", "ESCALATE"] }, reason: { type: "string" } }, required: ["decision"] },
      FeatureRegistrationDto: { type: "object", properties: { name: { type: "string" }, owners: { $ref: "#/components/schemas/Owners" }, targetRegion: { type: "string" } }, required: ["name"] },
    },
  },
} as const;
