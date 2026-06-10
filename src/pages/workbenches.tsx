// 도메인 워크벤치 모음 — 시트 17 UI 인벤토리의 나머지 UI-0xx를 탭으로 커버.
import { Alert, Button, Empty, Progress, Space, Table, Tag } from "antd";
import { Link } from "react-router";
import { Workbench, type WbTab } from "../components/Workbench";
import { store, useList, useMutate } from "../data/useStore";
import type { FieldIssueRecord } from "../data/population";
import type { DefectRecord, Feature, Gate, ReleaseCandidateRecord, RequirementRecord, TestRunRecord, WorkbenchItemRecord } from "../domain/types";
import { derivedLifecycleStatus } from "../domain/gateLogic";
import { useRole } from "../auth/RoleContext";

// ── Product & Scope (UI-013, UI-014) ──────────────────────────────
const PRODUCT_TABS: WbTab[] = [
  {
    key: "pricing", uiId: "UI-013", label: "Product Strategy / Pricing", desc: "고객가치·가격·구독/옵션 전략 정의 (RG1). 유료/구독 Feature는 Entitlement와 연결.",
    columns: [{ title: "Feature", dataIndex: "feature", mono: true }, { title: "Model", dataIndex: "model" }, { title: "Price", dataIndex: "price", mono: true }, { title: "Package", dataIndex: "pkg" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { feature: "FEAT-DST-003", model: "Subscription", price: "$9.9/mo", pkg: "Performance", status: "PASS" },
      { feature: "FEAT-RPA-001", model: "One-time", price: "$299", pkg: "Convenience", status: "PENDING" },
      { feature: "FEAT-ALK-002", model: "Standard", price: "Included", pkg: "Safety", status: "PASS" },
    ],
    note: "유료/구독 Feature는 RG1 PASS 및 Entitlement DB 연동 필요.",
  },
  {
    key: "scope", uiId: "UI-014", label: "Region / Trim / Vehicle Scope", desc: "국가·트림·차종 적용 범위 및 Exclusion Rule 정의 (RG1/RG3).",
    columns: [{ title: "Feature", dataIndex: "feature", mono: true }, { title: "Region", dataIndex: "region" }, { title: "Trim", dataIndex: "trim" }, { title: "Model Year", dataIndex: "my", mono: true }, { title: "Exclusion", dataIndex: "excl" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { feature: "FEAT-DST-003", region: "Global", trim: "Sport", my: "MY24~26", excl: "EV only", status: "PASS" },
      { feature: "FEAT-RPA-001", region: "KR, EU", trim: "Premium", my: "MY26", excl: "ADAS Lv2+", status: "PASS" },
    ],
  },
];

// ── Requirements & System (UI-015, UI-016) ────────────────────────
const REQ_TABS: WbTab[] = [
  {
    key: "req", uiId: "UI-015", label: "Vehicle Requirement Editor", desc: "차량 기능 요구사항 작성/승인, Parent/Child·ASIL/Security 연결 (RG2).",
    columns: [{ title: "Req ID", dataIndex: "id", mono: true }, { title: "Requirement", dataIndex: "req" }, { title: "ASIL", dataIndex: "asil", tagColor: "#9a3412" }, { title: "Verify", dataIndex: "verify" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "SYS-REQ-014", req: "원격 주차 시 장애물 감지 정지", asil: "ASIL-B", verify: "HIL+Vehicle", status: "PASS" },
      { id: "SYS-REQ-015", req: "스마트폰 연결 끊김 시 안전 정지", asil: "ASIL-B", verify: "SIL", status: "PENDING" },
      { id: "SYS-REQ-016", req: "주차 경로 재계산 ≤ 200ms", asil: "QM", verify: "SIL", status: "PENDING" },
    ],
  },
  {
    key: "impact", uiId: "UI-016", label: "System Impact Analysis", desc: "ECU/Sensor/Actuator/Backend/CCS 영향 분석 (RG2/RG7).",
    columns: [{ title: "Component", dataIndex: "comp" }, { title: "Impact", dataIndex: "impact" }, { title: "Level", dataIndex: "level", status: true }, { title: "Mitigation", dataIndex: "mit" }],
    rows: [
      { comp: "Parking ECU", impact: "신규 SW Component", level: "PENDING", mit: "Supplier WP 관리" },
      { comp: "Surround View Camera", impact: "신호 추가", level: "PASS", mit: "기존 인터페이스 재사용" },
      { comp: "CCS Backend", impact: "Policy API 추가", level: "PASS", mit: "API Contract v2" },
    ],
  },
];

// ── Safety & Security (UI-019, UI-020) ────────────────────────────
const SAFETY_TABS: WbTab[] = [
  {
    key: "class", uiId: "UI-019", label: "Safety / Security Classification", desc: "HARA/TARA 필요 여부와 등급 분류 (RG7). Critical Open Issue 시 BLOCK.",
    columns: [{ title: "Feature", dataIndex: "feature", mono: true }, { title: "ASIL", dataIndex: "asil", tagColor: "#9a3412" }, { title: "Cybersecurity", dataIndex: "csl" }, { title: "Privacy", dataIndex: "privacy" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { feature: "FEAT-RPA-001", asil: "ASIL-B", csl: "CAL 3", privacy: "Medium", status: "PASS" },
      { feature: "FEAT-ALK-002", asil: "ASIL-D", csl: "CAL 4", privacy: "Low", status: "PASS" },
    ],
  },
  {
    key: "evidence", uiId: "UI-020", label: "HARA / TARA Evidence", desc: "HARA/TARA 산출물 링크 및 Open Item 추적.",
    columns: [{ title: "ID", dataIndex: "id", mono: true }, { title: "Type", dataIndex: "type" }, { title: "Goal / Threat", dataIndex: "goal" }, { title: "Review", dataIndex: "review", status: true }],
    rows: [
      { id: "HARA-RPA-01", type: "HARA", goal: "주차 중 충돌 회피", review: "ACCEPTED" },
      { id: "TARA-RPA-01", type: "TARA", goal: "원격제어 위조 방지", review: "ACCEPTED" },
      { id: "TARA-RPA-02", type: "TARA", goal: "세션 하이재킹 방지", review: "PENDING" },
    ],
  },
];

// ── SW & API (UI-021, UI-022, UI-023) ─────────────────────────────
const SWAPI_TABS: WbTab[] = [
  {
    key: "comp", uiId: "UI-021", label: "SW Component Map", desc: "Feature 구현 SW Component·Owner·Version·Repository (RG4/RG5).",
    columns: [{ title: "Component", dataIndex: "id", mono: true }, { title: "Owner", dataIndex: "owner" }, { title: "Version", dataIndex: "ver", mono: true }, { title: "Repository", dataIndex: "repo" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "CMP-PARK-01", owner: "Acme Supplier", ver: "v2.3.0", repo: "git/park-ecu", status: "PASS" },
      { id: "CMP-APP-02", owner: "W. Software", ver: "v1.4.2", repo: "git/mobile-app", status: "PENDING" },
    ],
  },
  {
    key: "api", uiId: "UI-022", label: "API Catalog / Contract", desc: "내부/협력사 API 규격·버전·에러코드·보안 (RG4/RG6). API 승인 없는 구현 금지.",
    columns: [{ title: "API ID", dataIndex: "id", mono: true }, { title: "Endpoint", dataIndex: "ep", mono: true }, { title: "Version", dataIndex: "ver", mono: true }, { title: "Security", dataIndex: "sec" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "API-RPA-01", ep: "POST /park/start", ver: "v2", sec: "mTLS + OAuth", status: "ACCEPTED" },
      { id: "API-RPA-02", ep: "GET /park/status", ver: "v2", sec: "mTLS", status: "PENDING" },
    ],
  },
  {
    key: "dep", uiId: "UI-023", label: "Dependency Graph", desc: "Feature 간/Component 간 의존성 및 Version 제약, Conflict 확인 (RG4/5/6).",
    columns: [{ title: "From", dataIndex: "from", mono: true }, { title: "Depends On", dataIndex: "to", mono: true }, { title: "Constraint", dataIndex: "con", mono: true }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { from: "FEAT-RPA-001", to: "CCS Policy Engine", con: ">=v2.0", status: "PASS" },
      { from: "FEAT-RPA-001", to: "FEAT-ALK-002", con: "shared sensor", status: "PENDING" },
    ],
    note: "Release 충돌 방지: Conflict 발생 시 DEPENDENCY_CONFLICT.",
  },
];

// ── Control & Runtime (UI-024, UI-025, UI-026, UI-027) ────────────
const CONTROL_TABS: WbTab[] = [
  {
    key: "policy", uiId: "UI-024", label: "Policy Rule Builder", desc: "Runtime Feature 활성 조건·Policy-only Deploy Rule·Safe Default (RG4/RG8).",
    columns: [{ title: "Policy ID", dataIndex: "id", mono: true }, { title: "Condition", dataIndex: "cond" }, { title: "Safe Default", dataIndex: "safe" }, { title: "Version", dataIndex: "ver", mono: true }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "POL-RPA-01", cond: "vehicle.parked && entitled && region∈scope", safe: "Disabled", ver: "v3", status: "PASS" },
      { id: "POL-DST-01", cond: "subscription.active", safe: "Standard mode", ver: "v5", status: "PASS" },
    ],
    note: "Runtime Policy 조건식은 Feature Targeting & Eligibility에서 Wave별 Rule을 적용하면 자동 생성되어 RG3 Variant Gate 근거로 연결됩니다 (UI-017→UI-024→RG3).",
  },
  {
    key: "context", uiId: "UI-025", label: "Runtime Context Schema", desc: "차량 Runtime 판단 Context 데이터·Source·Update Rate·Cache TTL (RG4/RG9).",
    columns: [{ title: "Field", dataIndex: "field", mono: true }, { title: "Source", dataIndex: "src" }, { title: "Update Rate", dataIndex: "rate" }, { title: "Default", dataIndex: "def" }],
    rows: [
      { field: "vehicle.gear", src: "VCU", rate: "10Hz", def: "P" },
      { field: "entitlement.status", src: "CCS Backend", rate: "on-demand", def: "false" },
      { field: "connectivity", src: "TCU", rate: "1Hz", def: "offline" },
    ],
  },
  {
    key: "simulation", uiId: "UI-027", label: "Policy Simulation / What-if", desc: "배포 전 대상 차량/조건 평가 시뮬레이션. 미검증 정책 배포 방지 (RG4/5/8).",
    columns: [{ title: "Scenario", dataIndex: "sc" }, { title: "Target Sample", dataIndex: "tgt", mono: true }, { title: "Activated", dataIndex: "act", mono: true }, { title: "False Activation", dataIndex: "fa", mono: true }, { title: "Result", dataIndex: "status", status: true }],
    rows: [
      { sc: "Sport trim / KR", tgt: "10,000", act: "9,920", fa: "0", status: "PASS" },
      { sc: "Non-eligible HW", tgt: "5,000", act: "0", fa: "0", status: "PASS" },
      { sc: "Edge: offline+parked", tgt: "2,000", act: "1,840", fa: "12", status: "PENDING" },
    ],
    note: "Kill Switch / Safe Default 설정은 Fleet Control Tower에서 실행 (UI-026).",
  },
];

// ── Verification (UI-032, UI-033, UI-034, UI-035) ─────────────────
const VERIFY_TABS: WbTab[] = [
  {
    key: "plan", uiId: "UI-032", label: "Test Plan & Coverage", desc: "Feature별 검증계획·Coverage·Open Defect (RG5).",
    columns: [{ title: "Feature", dataIndex: "feature", mono: true }, { title: "Test Cases", dataIndex: "tc", mono: true }, { title: "Coverage", dataIndex: "cov", mono: true }, { title: "Open Defect", dataIndex: "def", mono: true }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { feature: "FEAT-RPA-001", tc: "142", cov: "91%", def: "3", status: "PENDING" },
      { feature: "FEAT-ALK-002", tc: "318", cov: "98%", def: "0", status: "PASS" },
    ],
  },
  {
    key: "cicd", uiId: "UI-033", label: "CI/CD/CT Build Dashboard", desc: "Build·Integration·Regression 상태 (RG5). One-binary 검증.",
    columns: [{ title: "Build", dataIndex: "build", mono: true }, { title: "Commit", dataIndex: "commit", mono: true }, { title: "Pipeline", dataIndex: "pipe", status: true }, { title: "Tests", dataIndex: "tests", mono: true }],
    rows: [
      { build: "build#1051", commit: "a3f9c2", pipe: "PASS", tests: "318/318" },
      { build: "build#1042", commit: "7b1e08", pipe: "PASS", tests: "316/318" },
      { build: "build#1039", commit: "c44d91", pipe: "BLOCK", tests: "302/318" },
    ],
  },
  {
    key: "hilsil", uiId: "UI-034", label: "HIL/SIL/Test Evidence Viewer", desc: "SIL/HIL/Vehicle 검증 Evidence 조회 (RG5). Production 전 필수.",
    columns: [{ title: "Evidence", dataIndex: "id", mono: true }, { title: "Env", dataIndex: "env" }, { title: "Result", dataIndex: "result", status: true }, { title: "Coverage", dataIndex: "cov", mono: true }],
    rows: [
      { id: "HIL-RPA-014", env: "HIL Rig 3", result: "PENDING", cov: "87%" },
      { id: "SIL-RPA-009", env: "SIL Farm", result: "PASS", cov: "96%" },
    ],
  },
  {
    key: "defect", uiId: "UI-035", label: "Defect / Rework Tracker", desc: "검증 실패·Rework·Open Defect 관리 (RG5/RG6). Blocking defect 시 Gate PASS 불가.",
    columns: [{ title: "Defect", dataIndex: "id", mono: true }, { title: "Severity", dataIndex: "sev", status: true }, { title: "Feature", dataIndex: "feature", mono: true }, { title: "Owner", dataIndex: "owner" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "DEF-2026-114", sev: "BLOCK", feature: "FEAT-RPA-001", owner: "Acme Supplier", status: "PENDING" },
      { id: "DEF-2026-110", sev: "REWORK", feature: "FEAT-RPA-001", owner: "W. Software", status: "PENDING" },
    ],
  },
];

// ── Release & OTA (UI-039, UI-041, UI-042) ────────────────────────
const OTA_TABS: WbTab[] = [
  {
    key: "rc", uiId: "UI-039", label: "Release Candidate Dashboard", desc: "Release 후보·포함 Feature·SW Baseline·Freeze (RG8).",
    columns: [{ title: "RC ID", dataIndex: "id", mono: true }, { title: "Features", dataIndex: "feats" }, { title: "SW Baseline", dataIndex: "bl", mono: true }, { title: "Policy", dataIndex: "pol", mono: true }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "RC-2026-08", feats: "DST-003, ALK-002", bl: "SWB-26.8", pol: "POL-v5", status: "PASS" },
      { id: "RC-2026-09", feats: "RPA-001", bl: "SWB-26.9", pol: "POL-v3", status: "PENDING" },
    ],
  },
  {
    key: "console", uiId: "UI-041", label: "OTA / Policy Deployment Console", desc: "Binary Deploy 또는 Policy-only Deploy 실행 (RG8). 실행과 승인 분리.",
    columns: [{ title: "Deploy", dataIndex: "id", mono: true }, { title: "Type", dataIndex: "type" }, { title: "Target VIN", dataIndex: "tgt", mono: true }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "DEP-2026-221", type: "Policy-only", tgt: "1,840,000", status: "PASS" },
      { id: "DEP-2026-219", type: "Binary OTA", tgt: "9,800", status: "PENDING" },
    ],
    note: "대량 배포 진행 상황은 Fleet Control Tower에서 Wave 단위로 모니터링.",
  },
  {
    key: "rollback", uiId: "UI-042", label: "Rollback Plan & Drill", desc: "Rollback 전략·사전 Drill·Recovery Time·Trigger (RG8/RG5). Drill 미완료 시 HOLD.",
    columns: [{ title: "Feature", dataIndex: "feature", mono: true }, { title: "Prev Version", dataIndex: "prev", mono: true }, { title: "Drill Result", dataIndex: "drill", status: true }, { title: "Recovery", dataIndex: "rec", mono: true }],
    rows: [
      { feature: "FEAT-DST-003", prev: "POL-v4", drill: "PASS", rec: "< 5 min" },
      { feature: "FEAT-RPA-001", prev: "n/a", drill: "PENDING", rec: "—" },
    ],
  },
];

// ── Field Operations (UI-044, UI-045, UI-031, UI-047) ─────────────
const FIELD_TABS: WbTab[] = [
  {
    key: "alert", uiId: "UI-044", label: "Alert Rule Configuration", desc: "운영 이상징후 감지 Rule·Warning/Critical Threshold·Escalation (RG9, 시트 62).",
    columns: [{ title: "KPI", dataIndex: "kpi" }, { title: "Warning", dataIndex: "warn", mono: true }, { title: "Critical", dataIndex: "crit", mono: true }, { title: "Channel", dataIndex: "ch" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { kpi: "Activation Failure Rate", warn: "3%", crit: "5%", ch: "PagerDuty + Teams", status: "PASS" },
      { kpi: "Safety Field Issue", warn: "1", crit: "1", ch: "Emergency Board", status: "PASS" },
    ],
  },
  {
    key: "field", uiId: "UI-045", label: "Field Issue Monitor", desc: "실차 이슈·고객 VOC·Severity·RCA/CAPA (RG9/LC10). Rollback/Deprecation Input.",
    columns: [{ title: "Issue", dataIndex: "id", mono: true }, { title: "Feature", dataIndex: "feature", mono: true }, { title: "Severity", dataIndex: "sev", status: true }, { title: "Affected VIN", dataIndex: "vin", mono: true }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "FI-2026-077", feature: "FEAT-DST-003", sev: "PENDING", vin: "1,240", status: "PENDING" },
      { id: "FI-2026-072", feature: "FEAT-ALK-002", sev: "REWORK", vin: "18", status: "PASS" },
    ],
  },
  {
    key: "capa", uiId: "UI-031", label: "Supplier CAPA / Field Issue", desc: "협력사 원인 Field Issue·Root Cause·Corrective Action·Effectiveness (RG9/LC10).",
    columns: [{ title: "CAPA", dataIndex: "id", mono: true }, { title: "Supplier", dataIndex: "sup" }, { title: "Root Cause", dataIndex: "rc" }, { title: "SLA", dataIndex: "sla", mono: true }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "CAPA-2026-031", sup: "Acme Supplier", rc: "센서 캘리브레이션 드리프트", sla: "D-3", status: "PENDING" },
    ],
  },
  {
    key: "entitlement", uiId: "UI-047", label: "Customer / Entitlement Status", desc: "고객 구독/권한 상태와 Feature 활성 상태 (RG1/RG8/RG9). 구독 Feature 운영 필수.",
    columns: [{ title: "Customer", dataIndex: "cust", mono: true }, { title: "VIN", dataIndex: "vin", mono: true }, { title: "Subscription", dataIndex: "sub" }, { title: "Entitlement", dataIndex: "ent", status: true }, { title: "Feature", dataIndex: "feat", status: true }],
    rows: [
      { cust: "CUS-0029481", vin: "KMHxx…1842", sub: "Performance Monthly", ent: "ACCEPTED", feat: "PASS" },
      { cust: "CUS-0031107", vin: "KMHxx…9930", sub: "Expired", ent: "REJECTED", feat: "REWORK" },
    ],
  },
];

// ── Retirement (UI-048, UI-049) ───────────────────────────────────
const RETIRE_TABS: WbTab[] = [
  {
    key: "deprecate", uiId: "UI-048", label: "Deprecation Impact Analysis", desc: "중단/대체 전 활성 차량수·대체수단·고객/법규 영향 분석 (LC10).",
    columns: [{ title: "Feature", dataIndex: "feature", mono: true }, { title: "Active Vehicles", dataIndex: "av", mono: true }, { title: "Replacement", dataIndex: "rep" }, { title: "Customer Impact", dataIndex: "ci" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { feature: "FEAT-LEGACY-12", av: "84,200", rep: "FEAT-DST-003", ci: "Medium", status: "PENDING" },
    ],
  },
  {
    key: "retire", uiId: "UI-049", label: "Retirement Approval", desc: "Feature 종료 승인·데이터 보관 (LC10). 활성 차량 0 및 보관 조건 필요.",
    columns: [{ title: "Feature", dataIndex: "feature", mono: true }, { title: "Active", dataIndex: "av", mono: true }, { title: "Retention", dataIndex: "ret" }, { title: "Archive", dataIndex: "arch" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { feature: "FEAT-LEGACY-09", av: "0", ret: "7 years", arch: "Cold storage", status: "PASS" },
      { feature: "FEAT-LEGACY-12", av: "84,200", ret: "—", arch: "—", status: "HOLD" },
    ],
    note: "활성 차량 > 0이면 HOLD (Retirement Block).",
  },
];

// ── Governance & Data (UI-010, UI-011, UI-051, UI-052, UI-054, UI-056) ─
const GOV_TABS: WbTab[] = [
  {
    key: "baseline", uiId: "UI-010", label: "Baseline Management", desc: "승인 Feature Baseline 생성·Compare·Lock/Unlock (RG1~RG9).",
    columns: [{ title: "Baseline", dataIndex: "id", mono: true }, { title: "Feature", dataIndex: "feature", mono: true }, { title: "Snapshot", dataIndex: "snap" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "BL-DST-003-v5", feature: "FEAT-DST-003", snap: "Req+API+Test+Policy", status: "PASS" },
      { id: "BL-ALK-002-v3", feature: "FEAT-ALK-002", snap: "Req+API+Test", status: "PENDING" },
    ],
  },
  {
    key: "change", uiId: "UI-011", label: "Change Request / Revision", desc: "Feature 변경 요청·영향분석·Gate 재승인 Trigger 연결.",
    columns: [{ title: "CR ID", dataIndex: "id", mono: true }, { title: "Reason", dataIndex: "reason" }, { title: "Affected Gate", dataIndex: "gate", mono: true }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "CR-2026-201", reason: "API v2 → v3 변경", gate: "RG4/RG6", status: "PENDING" },
      { id: "CR-2026-198", reason: "지역 확대 EU 추가", gate: "RG3", status: "PASS" },
    ],
    note: "Scope/API/Policy/Vehicle 변경 시 affected gate 재승인 (KPI-LC-005).",
  },
  {
    key: "codemaster", uiId: "UI-051", label: "Code Master / Reference Admin", desc: "Lifecycle/Gate/Decision/Status Code 기준값 관리 (시트 07).",
    columns: [{ title: "Code Type", dataIndex: "type" }, { title: "Values", dataIndex: "vals", mono: true }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { type: "Lifecycle Status", vals: "Proposed…Retired (7)", status: "PASS" },
      { type: "Gate Code", vals: "RG1~RG9 (9)", status: "PASS" },
      { type: "Decision Code", vals: "PASS/CONDITIONAL/BLOCK/REWORK", status: "PASS" },
    ],
  },
  {
    key: "tasks", uiId: "UI-052", label: "Notification / Task Inbox", desc: "Gate·Rework·Approval·Evidence Due 알림 관리 (Workflow Engine).",
    columns: [{ title: "Task", dataIndex: "id", mono: true }, { title: "Related", dataIndex: "rel", mono: true }, { title: "Due", dataIndex: "due", mono: true }, { title: "Assignee", dataIndex: "who" }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "TASK-5521", rel: "FEAT-RPA-001/RG5", due: "D-2", who: "SW Owner", status: "PENDING" },
      { id: "TASK-5519", rel: "WP-001 Evidence", due: "D-5", who: "Acme Supplier", status: "PENDING" },
    ],
  },
  {
    key: "integration", uiId: "UI-054", label: "Integration Health Monitor", desc: "ALM/CI/CD/OTA/Telemetry 연계 상태 (시트 46).",
    columns: [{ title: "Connector", dataIndex: "conn" }, { title: "Last Sync", dataIndex: "sync", mono: true }, { title: "Queue", dataIndex: "q", mono: true }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { conn: "ALM (Polarion)", sync: "2 min ago", q: "0", status: "PASS" },
      { conn: "OTA Platform", sync: "30 s ago", q: "12", status: "PASS" },
      { conn: "Telemetry Lake", sync: "5 min ago", q: "1.2k", status: "PENDING" },
    ],
  },
  {
    key: "import", uiId: "UI-056", label: "Bulk Import / Export", desc: "Feature/Requirement/Gate/Evidence 일괄 등록·추출 (초기 Migration).",
    columns: [{ title: "Job", dataIndex: "id", mono: true }, { title: "Type", dataIndex: "type" }, { title: "Rows", dataIndex: "rows", mono: true }, { title: "Errors", dataIndex: "err", mono: true }, { title: "Status", dataIndex: "status", status: true }],
    rows: [
      { id: "IMP-2026-04", type: "Feature Import", rows: "1,204", err: "3", status: "PENDING" },
      { id: "EXP-2026-09", type: "Audit Export", rows: "8,920", err: "0", status: "PASS" },
    ],
  },
];

// ── Engineering / Architecture (시트 28 API Contract, 45 Event Workflow) ──
const ARCH_TABS: WbTab[] = [
  {
    key: "api-contract", uiId: "Sheet 28", label: "API Contract Catalog", desc: "UI Action ↔ Backend API Contract 매핑 (Frontend-Backend Interface). 총 35개 계약 중 대표 16종.",
    columns: [
      { title: "API ID", dataIndex: "id", mono: true },
      { title: "Name", dataIndex: "name" },
      { title: "Method", dataIndex: "method", tagColor: "#1f4e78" },
      { title: "Endpoint", dataIndex: "ep", mono: true },
      { title: "Auth Role", dataIndex: "role" },
      { title: "Audit Event", dataIndex: "audit", mono: true },
      { title: "Pri", dataIndex: "pri", status: true },
    ],
    rows: [
      { id: "API-001", name: "Create Feature Request", method: "POST", ep: "/api/feature-requests", role: "Requester", audit: "AUDIT_DRAFT_CREATED", pri: "MVP" },
      { id: "API-003", name: "Submit Feature Request", method: "POST", ep: "/api/feature-requests/{id}/submit", role: "Requester", audit: "AUDIT_REQUEST_SUBMITTED", pri: "MVP" },
      { id: "API-004", name: "Search Duplicate Feature", method: "GET", ep: "/api/features/duplicates", role: "PMO", audit: "AUDIT_DUPLICATE_CHECKED", pri: "MVP" },
      { id: "API-006", name: "Submit Intake Decision", method: "POST", ep: "/api/intake-reviews/{id}/decision", role: "Intake Board", audit: "AUDIT_INTAKE_DECISION", pri: "MVP" },
      { id: "API-007", name: "Register Official Feature", method: "POST", ep: "/api/features/register", role: "PMO/Product", audit: "AUDIT_FEATURE_REGISTERED", pri: "MVP" },
      { id: "API-010", name: "Assign Owners", method: "PUT", ep: "/api/features/{id}/owners", role: "PMO/Product", audit: "AUDIT_OWNER_CHANGED", pri: "MVP" },
      { id: "API-012", name: "Approve Requirement Bundle", method: "POST", ep: "/api/features/{id}/requirements/approve", role: "System Owner", audit: "AUDIT_REQUIREMENT_APPROVED", pri: "MVP" },
      { id: "API-016", name: "Simulate Policy Rule", method: "POST", ep: "/api/policy-rules/{id}/simulate", role: "System/SW", audit: "AUDIT_POLICY_SIMULATED", pri: "MVP" },
      { id: "API-019", name: "Review Supplier Evidence", method: "POST", ep: "/api/evidence/{id}/review", role: "SW Owner/QA", audit: "AUDIT_EVIDENCE_REVIEWED", pri: "MVP" },
      { id: "API-021", name: "Validate API Contract", method: "POST", ep: "/api/api-contracts/{id}/validate", role: "SW/Supplier", audit: "AUDIT_API_CONTRACT_VALIDATED", pri: "MVP" },
      { id: "API-023", name: "Update Gate Status", method: "PUT", ep: "/api/features/{id}/gates/{gate}", role: "Gate Lead", audit: "AUDIT_GATE_STATUS_CHANGED", pri: "MVP" },
      { id: "API-024", name: "Get 9 Gate Summary", method: "GET", ep: "/api/features/{id}/gates/summary", role: "Authorized", audit: "AUDIT_VIEW_OPTIONAL", pri: "MVP" },
      { id: "API-027", name: "Approve Production Activation", method: "POST", ep: "/api/features/{id}/production-activation", role: "Release Board", audit: "AUDIT_PRODUCTION_ACTIVATION", pri: "MVP" },
      { id: "API-031", name: "Trigger Rollback", method: "POST", ep: "/api/features/{id}/rollback", role: "Release/Operation", audit: "AUDIT_ROLLBACK_TRIGGERED", pri: "MVP" },
      { id: "API-034", name: "Approve Retirement", method: "POST", ep: "/api/features/{id}/retirement", role: "Operation/PMO", audit: "AUDIT_FEATURE_RETIRED", pri: "P2" },
      { id: "API-035", name: "Get Audit Log", method: "GET", ep: "/api/audit-logs", role: "PMO/Auditor", audit: "AUDIT_VIEW_OPTIONAL", pri: "MVP" },
    ],
    note: "API 승인 없는 협력사 구현 금지. 모든 변경 API는 Audit Event 발생 (시트 28).",
  },
  {
    key: "events", uiId: "Sheet 45", label: "Event & Workflow Design", desc: "상태전이·Gate·Supplier·Release/Operation 흐름의 핵심 이벤트 (Producer→Consumer, Idempotency, Failure Handling).",
    columns: [
      { title: "Event ID", dataIndex: "id", mono: true },
      { title: "Event", dataIndex: "name" },
      { title: "Producer", dataIndex: "prod" },
      { title: "Trigger", dataIndex: "trig" },
      { title: "Workflow Impact", dataIndex: "impact" },
      { title: "Idempotency Key", dataIndex: "idem", mono: true },
      { title: "Pri", dataIndex: "pri", status: true },
    ],
    rows: [
      { id: "EVT-001", name: "FeatureRequestSubmitted", prod: "Request Service", trig: "Requester 제출", impact: "LC0 review task 생성", idem: "request_id+ver", pri: "MVP" },
      { id: "EVT-002", name: "IntakeDecisionRecorded", prod: "Intake Service", trig: "Approve/Rework/…", impact: "Owner Assign 또는 분기", idem: "decision_id", pri: "MVP" },
      { id: "EVT-003", name: "FeatureRegistered", prod: "Registry Service", trig: "Feature ID 발급", impact: "Lifecycle=Proposed", idem: "feature_id", pri: "MVP" },
      { id: "EVT-005", name: "LifecycleTransitionRequested", prod: "Lifecycle Service", trig: "상태 전이 요청", impact: "Guard condition 평가", idem: "transition_request_id", pri: "MVP" },
      { id: "EVT-007", name: "GateDecisionChanged", prod: "Gate Service", trig: "Gate approved/blocked", impact: "9 Gate summary 재계산", idem: "gate_status_id+seq", pri: "MVP" },
      { id: "EVT-008", name: "SupplierEvidenceRejected", prod: "Supplier Service", trig: "OEM 반려", impact: "Supplier Rework task", idem: "review_id", pri: "MVP" },
      { id: "EVT-010", name: "ProductionActivationDecision", prod: "Gate Service", trig: "RG1~9 계산", impact: "GO/HOLD/BLOCK 표시", idem: "feature_id+summary_ver", pri: "MVP" },
      { id: "EVT-011", name: "FieldIssueCreated", prod: "Operations Service", trig: "Telemetry/CS 이슈", impact: "Rollback/hold 검토 task", idem: "issue_id", pri: "P1" },
      { id: "EVT-012", name: "KillSwitchActivated", prod: "Policy Service", trig: "Release owner 실행", impact: "Runtime disable + rollback tracking", idem: "kill_switch_event_id", pri: "P1" },
    ],
    note: "GateDecision PASS는 필수 Evidence 없이는 불가. GO는 BLOCK/PENDING(미waive) 존재 시 차단 (EVT-007/010).",
  },
];

// ── Launch & Adoption (시트 51 Pilot, 52 Migration, 55 Hypercare) ──
const LAUNCH_TABS: WbTab[] = [
  {
    key: "pilot", uiId: "Sheet 51", label: "Pilot Scope & Execution", desc: "MVP를 실제 조직/협력사/Release 업무에 적용하기 위한 Pilot Scope·Entry/Exit·Wave.",
    columns: [
      { title: "Workstream", dataIndex: "ws" },
      { title: "Lead Owner", dataIndex: "owner" },
      { title: "Output", dataIndex: "out" },
      { title: "Exit Criteria", dataIndex: "exit" },
      { title: "Wave", dataIndex: "wave", tagColor: "#1f4e78" },
      { title: "Pri", dataIndex: "pri", status: true },
    ],
    rows: [
      { ws: "Pilot governance", owner: "PMO", out: "Pilot Charter", exit: "Pilot board·결정규칙 승인", wave: "Wave 0", pri: "MVP" },
      { ws: "Pilot feature selection", owner: "Product Owner", out: "Pilot Feature Set", exit: "Policy-only·Supplier-heavy 포함", wave: "Wave 0", pri: "MVP" },
      { ws: "Pilot vehicle scope", owner: "System Owner", out: "Target VIN Group", exit: "Pilot target 승인", wave: "Wave 1", pri: "MVP" },
      { ws: "Supplier participation", owner: "SW Owner", out: "Supplier Pilot Agreement", exit: "Evidence 제출 경로 테스트", wave: "Wave 1", pri: "MVP" },
      { ws: "Gate trial (RG1~9 dry-run)", owner: "Gate Review Board", out: "Gate Dry-run Result", exit: "Decision·open-item 로직 검증", wave: "Wave 2", pri: "MVP" },
      { ws: "Release simulation", owner: "Release Owner", out: "Release Simulation Result", exit: "GO/HOLD/BLOCK 결정 테스트", wave: "Wave 3", pri: "P1" },
      { ws: "Operations pilot", owner: "Operation Owner", out: "Operational Readiness Result", exit: "Monitoring·Incident 경로 검증", wave: "Wave 3", pri: "P1" },
      { ws: "Executive review", owner: "Steering Committee", out: "Scale/Rework/Stop Decision", exit: "결정·action owner 기록", wave: "Wave 4", pri: "MVP" },
    ],
  },
  {
    key: "migration", uiId: "Sheet 52", label: "Migration & Cutover", desc: "기존 Feature/Variant/요구사항/API/Evidence/Release 데이터를 Feature Registry로 이관.",
    columns: [
      { title: "Object", dataIndex: "obj" },
      { title: "Source", dataIndex: "src" },
      { title: "Target Entity", dataIndex: "tgt", mono: true },
      { title: "Reconciliation", dataIndex: "rec" },
      { title: "Cutover", dataIndex: "cut", tagColor: "#1f4e78" },
      { title: "Pri", dataIndex: "pri", status: true },
    ],
    rows: [
      { obj: "Existing Feature List", src: "Feature Table / CCS", tgt: "Feature", rec: "100% owner·status 보유", cut: "Pre-pilot", pri: "MVP" },
      { obj: "Variant / Applicability", src: "Variant coding / Vehicle master", tgt: "VehicleCapability", rec: "VIN eligibility match rate", cut: "Pre-pilot", pri: "MVP" },
      { obj: "Requirements", src: "ALM / DOORS / Jira", tgt: "FeatureRequirement", rec: "Traceability completeness", cut: "Wave 1", pri: "MVP" },
      { obj: "API Catalog", src: "API spec / Supplier docs", tgt: "FeatureAPIContract", rec: "Contract test 후보 식별", cut: "Wave 2", pri: "P1" },
      { obj: "Supplier Evidence", src: "Supplier portal / drive", tgt: "EvidencePackage", rec: "RG6/RG5 coverage 확인", cut: "Wave 2", pri: "P1" },
      { obj: "Release History", src: "OTA / CCS / Release notes", tgt: "ReleasePlan", rec: "Target·decision traceable", cut: "Wave 3", pri: "P1" },
      { obj: "Audit History", src: "Approval emails / logs", tgt: "AuditLog", rec: "Critical 결정 audit 샘플 검증", cut: "Before go-live", pri: "MVP" },
    ],
    note: "각 객체는 Rollback/Fallback 보유 (source freeze, read-only import, manual override+audit).",
  },
  {
    key: "hypercare", uiId: "Sheet 55", label: "Hypercare Runbook", desc: "Go-live 이후 운영 상황별 Detection→Triage→Decision→Recovery 기준.",
    columns: [
      { title: "Scenario", dataIndex: "sc" },
      { title: "Severity", dataIndex: "sev", status: true },
      { title: "Triage Owner", dataIndex: "owner" },
      { title: "Immediate Action", dataIndex: "action" },
      { title: "Decision Path", dataIndex: "path" },
      { title: "SLA", dataIndex: "sla", tagColor: "#9a3412" },
    ],
    rows: [
      { sc: "Gate status BLOCK", sev: "PENDING", owner: "Gate Owner", action: "다음 Lifecycle 진행 동결", path: "Gate Review Board", sla: "24h triage" },
      { sc: "Supplier evidence rejected", sev: "PENDING", owner: "SW Owner", action: "Supplier rework 요청", path: "Supplier Evidence Review", sla: "5 days" },
      { sc: "Wrong target VIN suspected", sev: "BLOCK", owner: "System/Release", action: "Rollout Hold + VIN rule 검증", path: "Release Readiness Board", sla: "Immediate" },
      { sc: "Telemetry missing after release", sev: "PENDING", owner: "Operation Owner", action: "Scale-up Hold + pipeline 검증", path: "Operations Review", sla: "24h" },
      { sc: "Safety/security field issue", sev: "BLOCK", owner: "System/Security", action: "Kill switch / disable 검토", path: "Emergency Review Board", sla: "Immediate" },
      { sc: "Rollback execution failure", sev: "BLOCK", owner: "Release Owner", action: "Fallback·escalation 활성화", path: "Emergency Release Board", sla: "Immediate" },
      { sc: "KPI threshold breach", sev: "PENDING", owner: "Operation Owner", action: "Field issue 생성 + 다음 wave hold", path: "Operations Review", sla: "Next cycle" },
    ],
  },
];

export function ArchitecturePage() {
  return <Workbench title="Engineering & Architecture" subtitle="시트 28/45 · API Contract Catalog · Event & Workflow Design" icon="🧩" tabs={ARCH_TABS} customTabs={[useWbLiveTab("arch", "API/Event 작업")]} />;
}
export function LaunchAdoptionPage() {
  return <Workbench title="Launch & Adoption" subtitle="시트 51/52/55 · Pilot Scope · Migration/Cutover · Hypercare Runbook" icon="🚩" tabs={LAUNCH_TABS} customTabs={[useWbLiveTab("launch", "Pilot/Migration 작업")]} />;
}
export function ProductScopePage() {
  return <Workbench title="Product & Scope" subtitle="UI-013/014 · 상품 전략·가격·적용 범위" icon="💲" tabs={PRODUCT_TABS} customTabs={[useWbLiveTab("product", "Pricing/Scope 승인")]} />;
}
export function SwApiPage() {
  return <Workbench title="SW & API" subtitle="UI-021/022/023 · Component·API Contract·Dependency" icon="🔌" tabs={SWAPI_TABS} customTabs={[useWbLiveTab("swapi", "API/Component 작업")]} />;
}
export function ControlRuntimePage() {
  return <Workbench title="Control & Runtime" subtitle="UI-024/025/027 · Policy·Context·Simulation" icon="⚙️" tabs={CONTROL_TABS} customTabs={[useWbLiveTab("control", "Policy 작업")]} />;
}

// ── Phase 2 심화: store 연동 Live 탭 헬퍼 ──
const asilColor = (a: string) => (a === "ASIL D" ? "#b91c1c" : a === "ASIL C" ? "#c2410c" : a === "ASIL B" ? "#b45309" : a === "ASIL A" ? "#ca8a04" : "#64748b");
const REQ_COLOR: Record<string, string> = { DRAFT: "#64748b", APPROVED: "#0891b2", VERIFIED: "#15803d", REJECTED: "#b91c1c" };
const TEST_COLOR: Record<string, string> = { PASS: "#15803d", FAIL: "#b91c1c", RUNNING: "#b45309" };
const DEF_SEV: Record<string, string> = { Blocker: "#b91c1c", Major: "#b45309", Minor: "#64748b" };
const DEF_COLOR: Record<string, string> = { OPEN: "#b45309", FIXED: "#0891b2", VERIFIED: "#15803d" };
const RC_COLOR: Record<string, string> = { DRAFT: "#64748b", FROZEN: "#b45309", DEPLOYED: "#15803d", ROLLED_BACK: "#b91c1c" };
const ENV_COLOR: Record<string, string> = { dev: "#64748b", qa: "#b45309", prod: "#15803d" };

// ── 정적 워크벤치 9종 → store 연동 Live 탭(단계 전이 + audit) ──
const WB_FLOW: Record<string, string[]> = {
  product: ["가격검토", "승인완료"],
  swapi: ["설계", "리뷰", "배포"],
  control: ["초안", "활성", "폐기"],
  arch: ["초안", "검증", "승인"],
  retire: ["영향분석", "승인대기", "종료승인"],
  gov: ["접수", "검토", "승인"],
  operating: ["TODO", "진행", "완료"],
  opsctl: ["FIRING", "ACK", "RESOLVED"],
  launch: ["미착수", "진행", "완료"],
};
const WB_COLOR: Record<string, string> = {
  승인완료: "#15803d", 배포: "#15803d", 승인: "#15803d", 종료승인: "#15803d", 완료: "#15803d", RESOLVED: "#15803d", 활성: "#15803d",
  리뷰: "#0891b2", 검증: "#0891b2", 진행: "#0891b2", 검토: "#0891b2", ACK: "#0891b2", 승인대기: "#b45309",
  FIRING: "#b91c1c", 폐기: "#b91c1c",
};
const wbColor = (s: string) => WB_COLOR[s] ?? "#64748b";

function useWbLiveTab(page: string, label: string) {
  const items = useList<WorkbenchItemRecord>("workbenchItems").filter((i) => i.page === page);
  const mutate = useMutate();
  const { userName } = useRole();
  const flow = WB_FLOW[page] ?? ["TODO", "진행", "완료"];
  const advance = (it: WorkbenchItemRecord) => {
    const next = flow[(flow.indexOf(it.status) + 1) % flow.length];
    mutate(() => {
      store.update<WorkbenchItemRecord>("workbenchItems", it.id, { status: next });
      store.audit({ actor: userName, action: `WB_${page.toUpperCase()}_${next}`, objectType: "WorkbenchItem", objectId: it.id, before: it.status, after: next });
    });
  };
  const done = flow[flow.length - 1];
  return {
    key: `live-${page}`,
    label: <span>⚡ {label} ({items.filter((i) => i.status !== done).length} open)</span>,
    children: items.length ? (
      <Table<WorkbenchItemRecord> rowKey="id" dataSource={items} pagination={false} scroll={{ x: "max-content" }}
        columns={[
          { title: "분류", dataIndex: "group", render: (v) => <Tag>{v}</Tag> },
          { title: "항목", dataIndex: "title" },
          { title: "메타", dataIndex: "sub", render: (v) => <span style={{ fontSize: 12, color: "#64748b" }}>{v ?? ""}</span> },
          { title: "Owner", dataIndex: "owner", render: (v) => v ?? "—" },
          { title: "Status", dataIndex: "status", render: (v) => <Tag color={wbColor(v)}>{v}</Tag> },
          { title: "Action", render: (_, it) => <Button size="small" type="primary" ghost onClick={() => advance(it)}>다음 단계 →</Button> },
        ]} />
    ) : <Empty description="항목 없음" />,
  };
}

// Requirements & System — Live Requirement Editor (store)
export function RequirementsPage() {
  const reqs = useList<RequirementRecord>("requirements");
  const mutate = useMutate();
  const { userName } = useRole();
  const cycle = (r: RequirementRecord) => {
    const next: RequirementRecord["status"] = r.status === "DRAFT" ? "APPROVED" : r.status === "APPROVED" ? "VERIFIED" : "DRAFT";
    mutate(() => {
      store.update<RequirementRecord>("requirements", r.id, { status: next });
      store.audit({ actor: userName, action: `REQ_${next}`, objectType: "Requirement", objectId: r.id, before: r.status, after: next });
    });
  };
  const liveTab = {
    key: "live-req",
    label: <span>📋 Requirements ({reqs.filter((r) => r.status !== "VERIFIED").length} open)</span>,
    children: reqs.length ? (
      <Table<RequirementRecord> rowKey="id" dataSource={reqs} pagination={false} scroll={{ x: "max-content" }}
        columns={[
          { title: "Req ID", dataIndex: "id", render: (v) => <span className="fp-mono">{v}</span> },
          { title: "Feature", dataIndex: "featureId", render: (v) => <Link to={`/features/${v}`} className="fp-mono">{v}</Link> },
          { title: "Type", dataIndex: "type", render: (v) => <Tag color={v === "Safety" ? "#b45309" : v === "Security" ? "#6d28d9" : "#1f4e78"}>{v}</Tag> },
          { title: "Requirement", dataIndex: "text" },
          { title: "ASIL", dataIndex: "asil", render: (v) => <Tag color={asilColor(v)}>{v}</Tag> },
          { title: "Verify", dataIndex: "verifyMethod" },
          { title: "Status", dataIndex: "status", render: (v) => <Tag color={REQ_COLOR[v]}>{v}</Tag> },
          { title: "Action", render: (_, r) => <Button size="small" type="primary" ghost onClick={() => cycle(r)}>{r.status === "DRAFT" ? "승인" : r.status === "APPROVED" ? "검증완료" : "재작성"}</Button> },
        ]} />
    ) : <Empty description="등록된 요구사항 없음" />,
  };
  return <Workbench title="Requirements & System" subtitle="UI-015/016 · 차량 요구사항·System 영향 (RG2)" icon="📋" tabs={REQ_TABS} customTabs={[liveTab]} />;
}

// Safety & Security — Live HARA/TARA 항목 (requirements 중 Safety/Security)
export function SafetySecurityPage() {
  const items = useList<RequirementRecord>("requirements").filter((r) => r.type === "Safety" || r.type === "Security");
  const mutate = useMutate();
  const { userName } = useRole();
  const verify = (r: RequirementRecord) => {
    const next: RequirementRecord["status"] = r.status === "VERIFIED" ? "APPROVED" : "VERIFIED";
    mutate(() => {
      store.update<RequirementRecord>("requirements", r.id, { status: next });
      store.audit({ actor: userName, action: `SAFETY_${next}`, objectType: "Requirement", objectId: r.id, before: r.status, after: next });
    });
  };
  const openHigh = items.filter((r) => (r.asil === "ASIL C" || r.asil === "ASIL D") && r.status !== "VERIFIED").length;
  const liveTab = {
    key: "live-safety",
    label: <span>🛡 Safety/Security ({items.filter((r) => r.status !== "VERIFIED").length} open)</span>,
    children: (
      <>
        {openHigh > 0 && <Alert type="warning" showIcon style={{ marginBottom: 12 }} message={`고위험(ASIL C/D) 미검증 ${openHigh}건 — RG7 PASS 전 검증 필요`} />}
        {items.length ? (
          <Table<RequirementRecord> rowKey="id" dataSource={items} pagination={false} scroll={{ x: "max-content" }}
            columns={[
              { title: "ID", dataIndex: "id", render: (v) => <span className="fp-mono">{v}</span> },
              { title: "Feature", dataIndex: "featureId", render: (v) => <Link to={`/features/${v}`} className="fp-mono">{v}</Link> },
              { title: "Type", dataIndex: "type", render: (v) => <Tag color={v === "Security" ? "#6d28d9" : "#b45309"}>{v === "Security" ? "TARA(보안)" : "HARA(안전)"}</Tag> },
              { title: "Goal / Threat", dataIndex: "text" },
              { title: "ASIL/CAL", dataIndex: "asil", render: (v) => <Tag color={asilColor(v)}>{v}</Tag> },
              { title: "Status", dataIndex: "status", render: (v) => <Tag color={REQ_COLOR[v]}>{v}</Tag> },
              { title: "Action", render: (_, r) => <Button size="small" type="primary" ghost onClick={() => verify(r)}>{r.status === "VERIFIED" ? "재검토" : "검증 승인"}</Button> },
            ]} />
        ) : <Empty description="Safety/Security 항목 없음" />}
      </>
    ),
  };
  return <Workbench title="Safety & Security" subtitle="UI-019/020 · HARA/TARA·등급 분류 (RG7)" icon="🛡" tabs={SAFETY_TABS} customTabs={[liveTab]} />;
}

// Verification — Live Test Runs + Defects (store)
export function VerificationPage() {
  const tests = useList<TestRunRecord>("tests");
  const defects = useList<DefectRecord>("defects");
  const mutate = useMutate();
  const { userName } = useRole();
  const setTest = (t: TestRunRecord, status: TestRunRecord["status"]) =>
    mutate(() => {
      store.update<TestRunRecord>("tests", t.id, status === "PASS" ? { status, passed: t.total } : { status });
      store.audit({ actor: userName, action: `TEST_${status}`, objectType: "TestRun", objectId: t.id, after: status });
    });
  const cycleDefect = (d: DefectRecord) => {
    const next: DefectRecord["status"] = d.status === "OPEN" ? "FIXED" : d.status === "FIXED" ? "VERIFIED" : "OPEN";
    mutate(() => {
      store.update<DefectRecord>("defects", d.id, { status: next });
      store.audit({ actor: userName, action: `DEFECT_${next}`, objectType: "Defect", objectId: d.id, before: d.status, after: next });
    });
  };
  const openBlockers = defects.filter((d) => d.severity === "Blocker" && d.status === "OPEN").length;
  const testsTab = {
    key: "live-tests",
    label: <span>🧪 Test Runs ({tests.filter((t) => t.status !== "PASS").length} open)</span>,
    children: tests.length ? (
      <Table<TestRunRecord> rowKey="id" dataSource={tests} pagination={false} scroll={{ x: "max-content" }}
        columns={[
          { title: "Test ID", dataIndex: "id", render: (v) => <span className="fp-mono">{v}</span> },
          { title: "Feature", dataIndex: "featureId", render: (v) => <Link to={`/features/${v}`} className="fp-mono">{v}</Link> },
          { title: "Suite", dataIndex: "suite" },
          { title: "Env", dataIndex: "env", render: (v) => <Tag>{v}</Tag> },
          { title: "통과율", render: (_, t) => <Progress percent={Math.round((t.passed / t.total) * 100)} size="small" style={{ width: 150 }} status={t.status === "FAIL" ? "exception" : t.status === "PASS" ? "success" : "active"} format={() => `${t.passed}/${t.total}`} /> },
          { title: "Status", dataIndex: "status", render: (v) => <Tag color={TEST_COLOR[v]}>{v}</Tag> },
          { title: "Action", render: (_, t) => <Space><Button size="small" type="primary" onClick={() => setTest(t, "PASS")}>통과</Button><Button size="small" danger onClick={() => setTest(t, "FAIL")}>실패</Button></Space> },
        ]} />
    ) : <Empty description="테스트 런 없음" />,
  };
  const defectsTab = {
    key: "live-defects",
    label: <span>🐞 Defects ({defects.filter((d) => d.status !== "VERIFIED").length} open)</span>,
    children: (
      <>
        {openBlockers > 0 && <Alert type="error" showIcon style={{ marginBottom: 12 }} message={`Blocker 결함 ${openBlockers}건 OPEN — RG5 PASS 불가`} />}
        {defects.length ? (
          <Table<DefectRecord> rowKey="id" dataSource={defects} pagination={false} scroll={{ x: "max-content" }}
            columns={[
              { title: "Defect", dataIndex: "id", render: (v) => <span className="fp-mono">{v}</span> },
              { title: "Severity", dataIndex: "severity", render: (v) => <Tag color={DEF_SEV[v]}>{v}</Tag> },
              { title: "Feature", dataIndex: "featureId", render: (v) => <Link to={`/features/${v}`} className="fp-mono">{v}</Link> },
              { title: "Summary", dataIndex: "summary" },
              { title: "Owner", dataIndex: "owner" },
              { title: "Status", dataIndex: "status", render: (v) => <Tag color={DEF_COLOR[v]}>{v}</Tag> },
              { title: "Action", render: (_, d) => <Button size="small" type="primary" ghost onClick={() => cycleDefect(d)}>{d.status === "OPEN" ? "수정완료" : d.status === "FIXED" ? "검증완료" : "재오픈"}</Button> },
            ]} />
        ) : <Empty description="결함 없음" />}
      </>
    ),
  };
  return <Workbench title="Verification" subtitle="UI-032/033/034/035 · Test·CI/CD·HIL/SIL·Defect (RG5)" icon="🧪" tabs={VERIFY_TABS} customTabs={[testsTab, defectsTab]} />;
}

// Release & OTA — Live Release Candidate 배포 콘솔 (store)
export function OtaPage() {
  const rcs = useList<ReleaseCandidateRecord>("releaseCandidates");
  const mutate = useMutate();
  const { userName } = useRole();
  const advance = (rc: ReleaseCandidateRecord, status: ReleaseCandidateRecord["status"], action: string) =>
    mutate(() => {
      store.update<ReleaseCandidateRecord>("releaseCandidates", rc.id, { status });
      store.audit({ actor: userName, action, objectType: "ReleaseCandidate", objectId: rc.id, before: rc.status, after: status, reason: rc.featureIds.join(", ") });
    });
  const liveTab = {
    key: "live-rc",
    label: <span>📡 Release Candidates ({rcs.filter((r) => r.status !== "DEPLOYED" && r.status !== "ROLLED_BACK").length} active)</span>,
    children: rcs.length ? (
      <Table<ReleaseCandidateRecord> rowKey="id" dataSource={rcs} pagination={false} scroll={{ x: "max-content" }}
        columns={[
          { title: "RC", dataIndex: "id", render: (v) => <span className="fp-mono">{v}</span> },
          { title: "Name", dataIndex: "name" },
          { title: "Features", dataIndex: "featureIds", render: (v: string[]) => <Space wrap size={2}>{v.map((f) => <Link key={f} to={`/features/${f}`}><Tag className="fp-mono">{f}</Tag></Link>)}</Space> },
          { title: "SW Baseline", dataIndex: "swBaseline", render: (v) => <span className="fp-mono">{v}</span> },
          { title: "Env", dataIndex: "targetEnv", render: (v) => <Tag color={ENV_COLOR[v]}>{v}</Tag> },
          { title: "Status", dataIndex: "status", render: (v) => <Tag color={RC_COLOR[v]}>{v}</Tag> },
          {
            title: "Action",
            render: (_, rc) =>
              rc.status === "DRAFT" ? <Button size="small" onClick={() => advance(rc, "FROZEN", "RC_FROZEN")}>Freeze</Button>
              : rc.status === "FROZEN" ? <Button size="small" type="primary" onClick={() => advance(rc, "DEPLOYED", "RC_DEPLOYED")}>Deploy (OTA)</Button>
              : rc.status === "DEPLOYED" ? <Space><Button size="small" danger onClick={() => advance(rc, "ROLLED_BACK", "RC_ROLLED_BACK")}>Rollback</Button><Link to="/fleet"><Button size="small">Fleet</Button></Link></Space>
              : <Tag>완료</Tag>,
          },
        ]} />
    ) : <Empty description="Release Candidate 없음" />,
  };
  return <Workbench title="Release & OTA" subtitle="UI-039/041/042 · RC·Deploy Console·Rollback (RG8)" icon="📡" tabs={OTA_TABS} customTabs={[liveTab]} />;
}
// ① Field Ops — store 연동 Live Field Issue 목록/마감 (Fleet Control에서 생성된 이슈)
export const FieldOpsPage = () => {
  const issues = useList<FieldIssueRecord>("fieldIssues");
  const mutate = useMutate();
  const { userName } = useRole();

  // 마감 시 CAPA 완료 + RG9 게이트 복원, 재오픈 시 RG9 재차단 — 자동 연계
  const setStatus = (fi: FieldIssueRecord, status: FieldIssueRecord["status"]) =>
    mutate(() => {
      store.update<FieldIssueRecord>("fieldIssues", fi.id, { status });
      const rg9Id = `${fi.featureId}-RG9`;
      const rg9 = store.get<Gate>("gates", rg9Id);
      if (status === "CLOSED") {
        store.audit({ actor: userName, action: "FIELD_ISSUE_CLOSED", objectType: "FieldIssue", objectId: fi.id, before: "OPEN", after: "CLOSED", reason: `${fi.capaId} effectiveness verified` });
        if (rg9 && rg9.status === "BLOCK") {
          const restore = fi.rg9Before && fi.rg9Before !== "BLOCK" ? fi.rg9Before : "PASS";
          store.update<Gate>("gates", rg9Id, { status: restore, blockingReason: undefined, evidenceCount: rg9.evidenceCount + 1, approver: userName });
          store.audit({ actor: userName, action: "RG9_CAPA_CLOSED", objectType: "Gate", objectId: rg9Id, before: "BLOCK", after: restore, reason: `${fi.capaId} closed` });
          const feat = store.get<Feature>("features", fi.featureId);
          const ns = derivedLifecycleStatus(store.list<Gate>("gates").filter((g) => g.featureId === fi.featureId));
          if (feat && ns !== feat.status) store.update<Feature>("features", fi.featureId, { status: ns });
        }
      } else {
        store.audit({ actor: userName, action: "FIELD_ISSUE_REOPENED", objectType: "FieldIssue", objectId: fi.id, before: "CLOSED", after: "OPEN", reason: fi.rootCause });
        if (rg9 && fi.severity === "Critical") {
          store.update<Gate>("gates", rg9Id, { status: "BLOCK", blockingReason: `Reopened field issue: ${fi.rootCause}` });
          store.audit({ actor: "system", action: "RG9_BLOCK_FIELD_ISSUE", objectType: "Gate", objectId: rg9Id, after: "BLOCK", reason: fi.rootCause });
        }
      }
    });

  const liveTab = {
    key: "live",
    label: <span>🔴 Live Field Issues ({issues.filter((i) => i.status === "OPEN").length})</span>,
    children: issues.length ? (
      <Table<FieldIssueRecord>
        rowKey="id"
        dataSource={issues}
        pagination={false}
        columns={[
          { title: "Issue ID", dataIndex: "id", render: (v) => <span className="fp-mono">{v}</span> },
          { title: "Feature", dataIndex: "featureId", render: (v) => <Link to={`/features/${v}`} className="fp-mono">{v}</Link> },
          { title: "Severity", dataIndex: "severity", render: (v) => <Tag color={v === "Critical" ? "#b91c1c" : "#b45309"}>{v}</Tag> },
          { title: "Affected VINs", dataIndex: "affectedVins", render: (v) => <span className="fp-mono">{v}</span> },
          { title: "Root Cause", dataIndex: "rootCause" },
          { title: "CAPA", dataIndex: "capaId", render: (v) => <span className="fp-mono">{v}</span> },
          { title: "Status", dataIndex: "status", render: (v) => <Tag color={v === "OPEN" ? "#b45309" : "#15803d"}>{v}</Tag> },
          {
            title: "Action",
            render: (_, fi) =>
              fi.status === "OPEN" ? (
                <Space>
                  <Button size="small" type="primary" onClick={() => setStatus(fi, "CLOSED")}>마감 (CAPA 완료)</Button>
                  <Link to="/fleet"><Button size="small">Fleet</Button></Link>
                </Space>
              ) : (
                <Button size="small" danger onClick={() => setStatus(fi, "OPEN")}>재오픈</Button>
              ),
          },
        ]}
      />
    ) : (
      <Empty description="활성 Field Issue 없음 — Fleet Control에서 활성화 실패 클러스터 발생 시 생성됩니다." />
    ),
  };

  return <Workbench title="Field Operations" subtitle="UI-044/045/031/047 · Alert·Field Issue·CAPA·Entitlement (RG9)" icon="🔧" tabs={FIELD_TABS} customTabs={[liveTab]} />;
};
export function RetirementPage() {
  return <Workbench title="Deprecation & Retirement" subtitle="UI-048/049 · 영향 분석·종료 승인 (LC10)" icon="📦" tabs={RETIRE_TABS} customTabs={[useWbLiveTab("retire", "Deprecation/Retire 결정")]} />;
}
export function GovernanceDataPage() {
  return <Workbench title="Governance & Data" subtitle="UI-010/011/051/052/054/056 · Baseline·Change·Code·Task·Integration·Import" icon="🗄" tabs={GOV_TABS} customTabs={[useWbLiveTab("gov", "Change Request/Baseline")]} />;
}

// ── Operating Model & Adoption (시트 53/54/56/57/58) ──
const OPERATING_TABS: WbTab[] = [
  {
    key: "bodies", uiId: "Sheet 53", label: "Governance Bodies", desc: "Feature Platform 운영 Board/Ceremony·의사결정권·Escalation 정의.",
    columns: [
      { title: "Board / Ceremony", dataIndex: "body" },
      { title: "Frequency", dataIndex: "freq" },
      { title: "Chair", dataIndex: "chair" },
      { title: "Decision Rights", dataIndex: "rights" },
      { title: "Escalation Trigger", dataIndex: "esc" },
    ],
    rows: [
      { body: "Feature Intake Board", freq: "Weekly / ad-hoc", chair: "PMO", rights: "Approve / Rework / Reject / Merge", esc: "Safety/security concern, missing owner" },
      { body: "Gate Review Board", freq: "Per Gate / Wave", chair: "Gate Owner", rights: "PASS / Conditional / BLOCK", esc: "Critical evidence missing, waiver" },
      { body: "Release Readiness Board", freq: "Before release wave", chair: "Release Owner", rights: "GO / HOLD / BLOCK / Limited Pilot", esc: "RG BLOCK or telemetry unavailable" },
      { body: "Supplier Evidence Review", freq: "Per milestone", chair: "SW Owner", rights: "Accept / Rework / Reject", esc: "API non-compliance, repeated rework" },
      { body: "Operations Review", freq: "Weekly (hypercare)", chair: "Operation Owner", rights: "Scale / Hold / Rollback / Improve", esc: "Critical field issue, KPI breach" },
      { body: "Steering Committee", freq: "Monthly / escalated", chair: "Executive Sponsor", rights: "Scale / Stop / Resource allocation", esc: "Decision beyond Owner authority" },
    ],
  },
  {
    key: "training", uiId: "Sheet 54", label: "Training & Enablement", desc: "역할별 교육·실습·완료 기준 (Change Enablement).",
    columns: [
      { title: "Audience", dataIndex: "aud" },
      { title: "Module", dataIndex: "mod" },
      { title: "Format", dataIndex: "fmt" },
      { title: "Completion Criteria", dataIndex: "done" },
      { title: "Pri", dataIndex: "pri", status: true },
    ],
    rows: [
      { aud: "Feature Requester", mod: "Feature Request & Intake Basics", fmt: "Live + guide", done: "Quiz + sample 승인", pri: "MVP" },
      { aud: "PMO / Registrar", mod: "Registry Governance Ops", fmt: "Workshop", done: "샘플 3건 결정기록 무결", pri: "MVP" },
      { aud: "System Owner", mod: "Requirement/Variant/Safety", fmt: "Workshop", done: "RG2/RG3/RG7 dry-run pass", pri: "MVP" },
      { aud: "SW Owner", mod: "API/Dependency/Supplier Evidence", fmt: "Hands-on", done: "Evidence review + audit", pri: "MVP" },
      { aud: "Release Owner", mod: "Release/Rollout/Rollback", fmt: "Tabletop", done: "Decision log + rollback plan", pri: "MVP" },
      { aud: "Operation Owner", mod: "Telemetry/KPI/Field Issue", fmt: "Dashboard demo", done: "Incident decision logged", pri: "P1" },
      { aud: "Supplier", mod: "Evidence Portal & OEM Review", fmt: "Supplier session", done: "Mock evidence 처리 완료", pri: "P1" },
    ],
  },
  {
    key: "comms", uiId: "Sheet 57", label: "Communication Plan", desc: "이해관계자별 메시지·채널·승인/증적 기준.",
    columns: [
      { title: "Stakeholder", dataIndex: "stk" },
      { title: "Message", dataIndex: "msg" },
      { title: "Timing", dataIndex: "time" },
      { title: "Channel", dataIndex: "ch" },
      { title: "Approval", dataIndex: "appr" },
    ],
    rows: [
      { stk: "Executive Sponsor", msg: "Pilot decision brief", time: "Wave 0 전 / pilot exit", ch: "Review deck", appr: "Steering Committee" },
      { stk: "Owners (5)", msg: "Workflow change notice", time: "각 wave 전", ch: "Email + workspace", appr: "PMO Lead" },
      { stk: "Suppliers", msg: "Supplier onboarding notice", time: "Supplier pilot 전", ch: "Supplier portal", appr: "Purchasing + SW Owner" },
      { stk: "Quality/Safety/Security", msg: "Gate criteria update", time: "Gate dry-run 전", ch: "Gate board", appr: "Quality/Safety leads" },
      { stk: "CS / Operations", msg: "Hypercare readiness notice", time: "Released pilot 전", ch: "Operations review", appr: "Operation Lead" },
    ],
  },
  {
    key: "backlog", uiId: "Sheet 58", label: "Post-launch Backlog", desc: "Pilot/Go-live 이후 feedback을 개선 backlog로 전환.",
    columns: [
      { title: "Source", dataIndex: "src" },
      { title: "Improvement Theme", dataIndex: "theme" },
      { title: "Severity / Value", dataIndex: "sev" },
      { title: "Target Item", dataIndex: "item" },
      { title: "Status", dataIndex: "status", status: true },
    ],
    rows: [
      { src: "Pilot user feedback", theme: "Feature Request form 복잡", sev: "Medium / High adoption", item: "Guided request wizard", status: "PENDING" },
      { src: "Gate dry-run", theme: "Gate evidence 기준 모호", sev: "High / governance", item: "Evidence checklist 강화", status: "PENDING" },
      { src: "Supplier review", theme: "Evidence template validation 필요", sev: "High / compliance", item: "Evidence pre-check", status: "PENDING" },
      { src: "Operations review", theme: "KPI threshold baseline 보정", sev: "Medium / operational", item: "KPI baseline project", status: "PENDING" },
      { src: "Release simulation", theme: "Rollback test 필수화", sev: "Critical / safety", item: "Rollback readiness blocker", status: "BLOCK" },
    ],
  },
  {
    key: "scorecard", uiId: "Sheet 56", label: "Pilot/Adoption Scorecard", desc: "Pilot/확산 판단 KPI Scorecard (Target·Actual·Status 자동판단).",
    columns: [
      { title: "Domain", dataIndex: "domain" },
      { title: "KPI", dataIndex: "kpi" },
      { title: "Target", dataIndex: "tgt", mono: true },
      { title: "Actual", dataIndex: "act", mono: true },
      { title: "Status", dataIndex: "status", status: true },
      { title: "Action if Breach", dataIndex: "action" },
    ],
    rows: [
      { domain: "Governance", kpi: "LC0 Cycle Time", tgt: "≤5d", act: "4d", status: "OK", action: "지연 요청 escalate" },
      { domain: "Gate", kpi: "Gate PASS Ratio", tgt: "100%", act: "89%", status: "WARNING", action: "Production activation HOLD" },
      { domain: "Supplier", kpi: "Supplier Rework Rate", tgt: "≤10%", act: "12%", status: "WARNING", action: "Supplier CAPA·coaching" },
      { domain: "Release", kpi: "Rollback Readiness", tgt: "100%", act: "100%", status: "OK", action: "—" },
      { domain: "Operations", kpi: "Telemetry Coverage", tgt: "100%", act: "98%", status: "WARNING", action: "Scale-up hold·pipeline 수리" },
      { domain: "Adoption", kpi: "Training Completion", tgt: "100%", act: "88%", status: "WARNING", action: "핵심 role 미완료 시 pilot 보류" },
    ],
  },
];

// ── Operations Control Pack (시트 62/63/65) ──
const OPSCTL_TABS: WbTab[] = [
  {
    key: "alert", uiId: "Sheet 62", label: "Alert & Escalation Matrix", desc: "KPI Trigger 발생 시 알림·1차 조치·Escalation L1/L2·SLA.",
    columns: [
      { title: "Alert ID", dataIndex: "id", mono: true },
      { title: "Trigger", dataIndex: "trig" },
      { title: "Severity", dataIndex: "sev", status: true },
      { title: "Primary Owner", dataIndex: "owner" },
      { title: "Escalation L1→L2", dataIndex: "esc" },
      { title: "SLA", dataIndex: "sla", tagColor: "#9a3412" },
      { title: "Decision", dataIndex: "dec" },
    ],
    rows: [
      { id: "ALT-001", trig: "Safety/Security KPI = CRITICAL", sev: "BLOCK", owner: "System/Safety Lead", esc: "Governance Board → Exec Safety", sla: "Immediate", dec: "BLOCK / ROLLBACK" },
      { id: "ALT-002", trig: "Any RG = BLOCK", sev: "BLOCK", owner: "Release Owner", esc: "Gate Owner → Governance Board", sla: "Same day", dec: "BLOCK" },
      { id: "ALT-003", trig: "Telemetry Missing = CRITICAL", sev: "PENDING", owner: "Operation Owner", esc: "Data Platform → Ops Review", sla: "1 day", dec: "HOLD" },
      { id: "ALT-004", trig: "Supplier evidence rejected / CAPA overdue", sev: "PENDING", owner: "SW Owner", esc: "Supplier Review → Purchasing", sla: "2 days", dec: "HOLD" },
      { id: "ALT-005", trig: "Rollback event failed/timeout", sev: "BLOCK", owner: "Release Owner", esc: "Ops Review → Governance Board", sla: "Immediate", dec: "ROLLBACK / BLOCK" },
      { id: "ALT-006", trig: "Unauthorized privileged action", sev: "PENDING", owner: "Security Owner", esc: "IAM Admin → Security Board", sla: "Same day", dec: "BLOCK (action)" },
      { id: "ALT-008", trig: "Activation Failure = WARNING (wave)", sev: "PENDING", owner: "Operation Owner", esc: "Release Owner → Ops Review", sla: "Next daily", dec: "Managed HOLD" },
    ],
  },
  {
    key: "lineage", uiId: "Sheet 63", label: "KPI Data Lineage", desc: "KPI가 의사결정용이 되기 위한 원천·계산·품질검사·Freshness·Decision-grade Rule.",
    columns: [
      { title: "Lineage", dataIndex: "id", mono: true },
      { title: "KPI Area", dataIndex: "area" },
      { title: "Source System", dataIndex: "src" },
      { title: "DQ Check", dataIndex: "dq" },
      { title: "Freshness SLA", dataIndex: "fresh" },
      { title: "Decision-grade Rule", dataIndex: "rule" },
    ],
    rows: [
      { id: "DL-001", area: "LC0 Intake Cycle Time", src: "Registry / Workflow", dq: "No null timestamps", fresh: "Daily", rule: "두 timestamp 모두 존재" },
      { id: "DL-002", area: "Gate Status Counts", src: "Gate Tracker / Evidence", dq: "Code in RG1~9 + master", fresh: "On demand", rule: "07_Code_Master 일치" },
      { id: "DL-003", area: "Telemetry Missing Rate", src: "Telemetry Platform", dq: "Schema valid + VIN match", fresh: "Near real-time", rule: "Sample coverage ≥ threshold" },
      { id: "DL-004", area: "Activation Failure Rate", src: "In-car Runtime / CCS", dq: "Allowed failure codes only", fresh: "Hourly (rollout)", rule: "Policy ver + VIN group 존재" },
      { id: "DL-005", area: "Rollback Preparedness", src: "OTA / Release Mgmt", dq: "Result PASS 필수", fresh: "Before gate close", rule: "Dry-run evidence required" },
      { id: "DL-009", area: "RBAC / Audit Integrity", src: "IAM / Audit Service", dq: "모든 critical action audit", fresh: "Event-based", rule: "Audit 없는 critical 결정 불가" },
    ],
    note: "Decision-grade가 아니면 KPI를 의사결정에 사용 불가 (Scale-up/GO 차단).",
  },
  {
    key: "readiness", uiId: "Sheet 65", label: "Operations Readiness Control View", desc: "운영 KPI·Gate·Alert·Rollout 준비 상태를 한 화면에 요약.",
    columns: [
      { title: "Readiness Item", dataIndex: "item" },
      { title: "Current", dataIndex: "val", mono: true },
      { title: "Status", dataIndex: "status", status: true },
      { title: "Decision Meaning", dataIndex: "mean" },
      { title: "Owner", dataIndex: "owner" },
    ],
    rows: [
      { item: "Critical KPI Count", val: "5", status: "BLOCK", mean: "Critical 존재 → activation/scale-up 차단", owner: "Operation Owner" },
      { item: "Warning KPI Count", val: "21", status: "HOLD", mean: "Warning은 owner 수용 후 scale-up", owner: "Ops Review Board" },
      { item: "TBD KPI Count", val: "1", status: "HOLD", mean: "TBD threshold = decision-grade 아님", owner: "Data/Metric Owner" },
      { item: "9 Gate PASS Count", val: "0", status: "HOLD", mean: "GO하려면 RG1~9 전부 PASS", owner: "Release Owner" },
      { item: "Overall Operations Decision", val: "BLOCK", status: "BLOCK", mean: "Critical/TBD 0 + 전 게이트 PASS여야 GO", owner: "Governance Board" },
    ],
    note: "GO: Critical=0·TBD=0·필수 게이트 PASS·telemetry decision-grade일 때만.",
  },
];

export function OperatingModelPage() {
  return <Workbench title="Operating Model & Adoption" subtitle="시트 53/54/56/57/58 · Governance·Training·Comms·Backlog·Scorecard" icon="🏛" tabs={OPERATING_TABS} customTabs={[useWbLiveTab("operating", "Backlog/Training 작업")]} />;
}
export function OpsControlPage() {
  return <Workbench title="Operations Control Pack" subtitle="시트 62/63/65 · Alert/Escalation·KPI Data Lineage·Readiness" icon="🎛" tabs={OPSCTL_TABS} customTabs={[useWbLiveTab("opsctl", "Alert 처리")]} />;
}
