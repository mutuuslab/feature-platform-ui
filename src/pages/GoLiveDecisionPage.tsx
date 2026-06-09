// 시트 59 Go-live Decision Framework — Pilot/MVP → 운영 전환 GO/HOLD/BLOCK 판단.
import { Card, Col, Row, Space, Tag, Tooltip } from "antd";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { DecisionBadge } from "../components/StatusBadge";
import { RadialGauge } from "../components/viz/Charts";
import type { ProductionDecision } from "../domain/types";

type AreaStatus = "GO" | "HOLD" | "BLOCK";

interface DecisionArea {
  area: string;
  icon: string;
  status: AreaStatus;
  go: string;
  hold: string;
  block: string;
  evidence: string;
  owner: string;
  escalation: string;
}

const AREAS: DecisionArea[] = [
  { area: "LC0 / Registry", icon: "🗂", status: "GO", go: "모든 pilot feature가 Request ID·Feature ID·Product Owner·lifecycle status 보유", hold: "경미한 metadata open item (due date 있음)", block: "Feature ID 또는 Product Owner 누락", evidence: "Feature Registry extract, owner assignment log", owner: "PMO", escalation: "Steering Committee" },
  { area: "9 Gate Readiness", icon: "🚦", status: "HOLD", go: "RG1~RG9 PASS 또는 승인된 Conditional PASS", hold: "Non-critical pending item (action owner 지정)", block: "RG BLOCK 또는 미해결 critical evidence", evidence: "14_9Gate_Readiness, 03_Gate_Evidence", owner: "Release Readiness Board", escalation: "Steering Committee" },
  { area: "Supplier Evidence", icon: "🤝", status: "GO", go: "Supplier WP·evidence review 완료", hold: "Supplier rework open (release-blocking 아님)", block: "API contract 불일치 또는 evidence 누락", evidence: "Supplier evidence audit, OEM review", owner: "SW Owner", escalation: "Purchasing / Steering" },
  { area: "Data / Migration", icon: "🗄", status: "GO", go: "Critical 이관 데이터 reconciled·freeze", hold: "Non-critical legacy data pending", block: "Variant/eligibility mismatch 미해결", evidence: "Migration reconciliation report", owner: "PMO / Data Owner", escalation: "System Owner" },
  { area: "Integration", icon: "🔗", status: "GO", go: "IAM/API/ALM/OTA/Telemetry MVP 경로 테스트", hold: "P1 통합 수동 시뮬레이션", block: "통합 실패로 core workflow 실행 불가", evidence: "Integration test report", owner: "Backend Owner", escalation: "IT/DevSecOps" },
  { area: "Security / Audit", icon: "🛡", status: "GO", go: "RBAC·supplier isolation·audit logging 테스트", hold: "저위험 audit formatting open item", block: "비인가 접근 또는 승인 audit 누락", evidence: "RBAC test, audit sample", owner: "Security / PMO", escalation: "Security Board" },
  { area: "Operations", icon: "📡", status: "HOLD", go: "Hypercare runbook·KPI·escalation·rollback 준비", hold: "교육 완료율 <100% (핵심 role은 완료)", block: "Telemetry 불가 또는 rollback 경로 미검증", evidence: "Runbook, KPI scorecard, training log", owner: "Operation Owner", escalation: "Release Owner" },
  { area: "Executive Decision", icon: "🏛", status: "HOLD", go: "BLOCK 없음·잔여 리스크 수용", hold: "Open item을 due date와 함께 수용", block: "Critical risk 미해결 또는 owner 없음", evidence: "Consolidated readiness pack", owner: "Executive Sponsor", escalation: "Steering Committee" },
];

const AREA_COLOR: Record<AreaStatus, string> = { GO: "#15803d", HOLD: "#b45309", BLOCK: "#b91c1c" };

export function GoLiveDecisionPage() {
  const goCount = AREAS.filter((a) => a.status === "GO").length;
  const overall: ProductionDecision = AREAS.some((a) => a.status === "BLOCK") ? "BLOCK" : AREAS.some((a) => a.status === "HOLD") ? "HOLD" : "GO";
  const readiness = Math.round((goCount / AREAS.length) * 100);

  return (
    <div>
      <PageHeader title="Go-live Decision" subtitle="시트 59 · Pilot/MVP → 운영 전환 GO/HOLD/BLOCK 프레임워크" icon="🏁" />
      <DataQualityBanner />

      <Card className="fp-card-lift" style={{ marginBottom: 16 }}>
        <Row gutter={24} align="middle">
          <Col flex="none" style={{ textAlign: "center" }}>
            <RadialGauge value={readiness} sublabel={`${goCount}/${AREAS.length} GO`} color={AREA_COLOR[overall]} size={150} />
          </Col>
          <Col flex="auto">
            <Space direction="vertical" size={8}>
              <span style={{ fontSize: 13, color: "#64748b" }}>Executive Go-live Decision</span>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <DecisionBadge decision={overall} />
                <span style={{ fontSize: 15, color: "#0a1f44" }}>
                  {overall === "GO" ? "모든 결정 영역 GO — 운영 전환 가능" : overall === "HOLD" ? "일부 영역 HOLD — open item을 due date와 함께 수용 시 조건부 진행" : "BLOCK 영역 존재 — 운영 전환 불가"}
                </span>
              </div>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>판단 규칙: BLOCK 1개라도 있으면 BLOCK · 아니면 HOLD 있으면 HOLD · 전부 GO면 GO</span>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {AREAS.map((a) => (
          <Col key={a.area} xs={24} md={12} xl={8}>
            <Card
              className="fp-card-lift"
              style={{ height: "100%", borderTop: `3px solid ${AREA_COLOR[a.status]}` }}
              title={<span><span style={{ marginRight: 8 }}>{a.icon}</span>{a.area}</span>}
              extra={<Tag color={AREA_COLOR[a.status]}>{a.status}</Tag>}
            >
              <Space direction="vertical" size={6} style={{ width: "100%", fontSize: 13 }}>
                <Cond color="#15803d" label="GO" text={a.go} />
                <Cond color="#b45309" label="HOLD" text={a.hold} />
                <Cond color="#b91c1c" label="BLOCK" text={a.block} />
                <div style={{ borderTop: "1px solid #eef2f8", paddingTop: 8, marginTop: 2, color: "#64748b", fontSize: 12 }}>
                  <Tooltip title="Decision Owner / Escalation">
                    <span>👤 {a.owner} → {a.escalation}</span>
                  </Tooltip>
                  <div style={{ marginTop: 2 }}>📎 {a.evidence}</div>
                </div>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}

function Cond({ color, label, text }: { color: string; label: string; text: string }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Tag color={color} style={{ margin: 0, minWidth: 52, textAlign: "center" }}>{label}</Tag>
      <span style={{ color: "#475569" }}>{text}</span>
    </div>
  );
}
