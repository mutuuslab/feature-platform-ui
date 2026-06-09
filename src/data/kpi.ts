// KPI Master — 시트 06_Operation_KPI (34 KPIs 중 대표 16종) + Decision Rules + Review Cadence.
export type KpiStatus = "OK" | "WARNING" | "CRITICAL" | "TBD";

export interface KpiRow {
  id: string;
  domain: string;
  name: string;
  gate: string;
  owner: string;
  unit: string;
  target: string;
  warning: string;
  critical: string;
  actual: string;
  status: KpiStatus;
  trigger: string;
  trend: number[];
}

export const KPIS: KpiRow[] = [
  { id: "KPI-GOV-001", domain: "Governance", name: "LC0 Intake Cycle Time", gate: "LC0", owner: "PMO", unit: "days", target: "5", warning: "7", critical: "10", actual: "4", status: "OK", trigger: "Intake Board Escalation", trend: [7, 6, 6, 5, 4, 4] },
  { id: "KPI-GOV-002", domain: "Governance", name: "Request Rework Rate", gate: "LC0", owner: "PMO", unit: "%", target: "10", warning: "20", critical: "35", actual: "18", status: "WARNING", trigger: "요청 양식/가이드 개선", trend: [22, 21, 20, 19, 18, 18] },
  { id: "KPI-LC-002", domain: "Lifecycle / Gate", name: "Gate PASS Ratio", gate: "RG1~RG9", owner: "PMO", unit: "%", target: "100", warning: "90", critical: "80", actual: "89", status: "CRITICAL", trigger: "Production Activation HOLD", trend: [82, 84, 86, 87, 88, 89] },
  { id: "KPI-LC-004", domain: "Lifecycle / Gate", name: "Blocked Gate Aging", gate: "RG1~RG9", owner: "PMO", unit: "days", target: "5", warning: "10", critical: "15", actual: "6", status: "WARNING", trigger: "Steering Escalation", trend: [12, 10, 9, 8, 7, 6] },
  { id: "KPI-TRC-001", domain: "Traceability", name: "Requirement Traceability Coverage", gate: "RG2", owner: "System Owner", unit: "%", target: "100", warning: "95", critical: "90", actual: "94", status: "CRITICAL", trigger: "RG2/RG5 Block", trend: [88, 90, 91, 92, 93, 94] },
  { id: "KPI-TRC-003", domain: "Traceability", name: "Evidence Completeness", gate: "RG5/6/7", owner: "SW Owner", unit: "%", target: "100", warning: "98", critical: "90", actual: "95", status: "CRITICAL", trigger: "Release Approval 보류", trend: [90, 92, 93, 94, 95, 95] },
  { id: "KPI-SUP-001", domain: "Supplier", name: "Supplier Evidence First Pass Rate", gate: "RG6", owner: "SW Owner", unit: "%", target: "90", warning: "80", critical: "70", actual: "82", status: "WARNING", trigger: "Supplier CAPA 요구", trend: [76, 78, 80, 81, 82, 82] },
  { id: "KPI-SUP-004", domain: "Supplier", name: "Supplier CAPA Closure SLA", gate: "RG6", owner: "SW Owner", unit: "%", target: "95", warning: "90", critical: "80", actual: "88", status: "CRITICAL", trigger: "신규 Release 반영 제한", trend: [80, 83, 85, 86, 87, 88] },
  { id: "KPI-REL-001", domain: "Release / OTA", name: "Rollback Readiness", gate: "RG8", owner: "Release Owner", unit: "%", target: "100", warning: "95", critical: "90", actual: "100", status: "OK", trigger: "RG8 Block", trend: [95, 97, 98, 99, 100, 100] },
  { id: "KPI-REL-002", domain: "Release / OTA", name: "Target VIN Accuracy", gate: "RG3/RG8", owner: "Release Owner", unit: "%", target: "100", warning: "99", critical: "98", actual: "99.5", status: "WARNING", trigger: "Wave Hold", trend: [98.8, 99.0, 99.2, 99.3, 99.4, 99.5] },
  { id: "KPI-OPS-001", domain: "Runtime / Operations", name: "Activation Success Rate", gate: "RG9", owner: "Operation Owner", unit: "%", target: "99", warning: "97", critical: "95", actual: "98", status: "WARNING", trigger: "Wave Hold / Policy 조정", trend: [95.5, 96.2, 97.1, 97.6, 97.9, 98] },
  { id: "KPI-OPS-003", domain: "Runtime / Operations", name: "Telemetry Coverage", gate: "RG9", owner: "Operation Owner", unit: "%", target: "100", warning: "98", critical: "95", actual: "98", status: "WARNING", trigger: "Scale-up 금지", trend: [96, 97, 97, 98, 98, 98] },
  { id: "KPI-FLD-001", domain: "Field Quality", name: "Safety/Security Field Issue", gate: "RG7/RG9", owner: "Operation Owner", unit: "count", target: "0", warning: "1", critical: "1", actual: "0", status: "TBD", trigger: "Emergency Review / Disable", trend: [1, 0, 0, 0, 0, 0] },
  { id: "KPI-FLD-003", domain: "Field Quality", name: "Field Issue Closure SLA", gate: "RG9", owner: "Operation Owner", unit: "%", target: "95", warning: "90", critical: "80", actual: "92", status: "WARNING", trigger: "Operations Escalation", trend: [84, 87, 89, 90, 91, 92] },
  { id: "KPI-NFR-001", domain: "System / NFR", name: "Workflow Automation Success", gate: "Workflow", owner: "PMO", unit: "%", target: "99", warning: "97", critical: "95", actual: "99", status: "OK", trigger: "manual fallback / hotfix", trend: [97, 98, 98, 99, 99, 99] },
  { id: "KPI-NFR-002", domain: "System / NFR", name: "Audit Log Completeness", gate: "Audit", owner: "PMO", unit: "%", target: "100", warning: "99", critical: "95", actual: "100", status: "OK", trigger: "Compliance Risk", trend: [99, 99, 100, 100, 100, 100] },
];

export interface DecisionRule {
  id: string;
  condition: string;
  decision: string;
  owner: string;
  escalation: string;
  gate: string;
}

export const DECISION_RULES: DecisionRule[] = [
  { id: "KPI-RULE-001", condition: "Any KPI Status = CRITICAL", decision: "Emergency Review / BLOCK / HOLD", owner: "KPI Owner", escalation: "Emergency Board", gate: "LC0/RG1~9/LC10" },
  { id: "KPI-RULE-002", condition: "Safety/Security Field Issue > 0", decision: "Feature Disable / Policy Rollback 검토", owner: "Operation Owner", escalation: "Emergency Board", gate: "RG7/RG9" },
  { id: "KPI-RULE-003", condition: "Rollback Readiness < 100%", decision: "RG8 Block / Deployment Block", owner: "Release Owner", escalation: "Release Readiness Board", gate: "RG8" },
  { id: "KPI-RULE-004", condition: "Telemetry Coverage < Critical", decision: "Scale-up 금지", owner: "Operation Owner", escalation: "Operations Review Board", gate: "RG9" },
  { id: "KPI-RULE-005", condition: "Gate PASS Ratio < 100%", decision: "Production Activation HOLD", owner: "PMO", escalation: "Release Readiness Board", gate: "RG1~RG9" },
  { id: "KPI-RULE-006", condition: "Owner Assignment < 100%", decision: "RG1 진입 보류", owner: "PMO", escalation: "Feature Governance Board", gate: "LC0/RG1" },
];

export const REVIEW_CADENCE = [
  { cadence: "Daily (rollout 중)", scope: "Activation·Telemetry·Field Issue·Rollback", decision: "Wave GO/HOLD/BLOCK", board: "Operations Review Board" },
  { cadence: "Weekly Gate Review", scope: "LC0/RG1~9 open items", decision: "PASS/REWORK/BLOCK", board: "Release Readiness Board" },
  { cadence: "Weekly Supplier Review", scope: "Supplier evidence·CAPA·API", decision: "PASS/REWORK/ESCALATE", board: "Supplier Review Board" },
  { cadence: "Monthly Governance", scope: "Portfolio KPI·adoption·backlog", decision: "SCALE_UP/REWORK/RETIRE", board: "Feature Governance Board" },
];

const STATUS_COLOR: Record<KpiStatus, string> = { OK: "#15803d", WARNING: "#b45309", CRITICAL: "#b91c1c", TBD: "#475569" };
export const kpiStatusColor = (s: KpiStatus) => STATUS_COLOR[s];
