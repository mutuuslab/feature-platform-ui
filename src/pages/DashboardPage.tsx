// Control Tower — 포트폴리오 사령탑 (UI-055). recharts 고급 차트 + 플릿 스케일 + 역할별 focus.
import { Alert, Card, Col, Row, Table, Tag } from "antd";
import { Link, useNavigate } from "react-router";
import { useList } from "../data/useStore";
import type { AuditLog, Feature, Gate } from "../domain/types";
import { LIFECYCLE_SEQUENCE, lifecycleColor } from "../domain/codeMaster";
import { computeGateSummary } from "../domain/gateLogic";
import { FLEET_TOTALS, fmtVeh } from "../data/fleet";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { DecisionBadge, LifecycleBadge } from "../components/StatusBadge";
import { StatTile } from "../components/viz/StatTile";
import { RadialGauge } from "../components/viz/Charts";
import { GatePipeline } from "../components/viz/GateViz";
import { CompositionPie, StackedBars, TrendArea } from "../components/viz/RCharts";
import { AuditTimeline } from "../components/AuditTimeline";
import { useRole } from "../auth/RoleContext";

const ROLE_FOCUS: Record<string, { msg: string; cta: string; to: string }> = {
  Requester: { msg: "신규 Feature 요청을 접수하고 진행 상태를 추적하세요.", cta: "Feature Request 작성", to: "/requests/new" },
  PMO: { msg: "전체 포트폴리오·게이트·등록을 통제합니다.", cta: "Intake Review Board", to: "/intake" },
  ProductOwner: { msg: "상품 전략·가격·범위와 RG1을 관리합니다.", cta: "Product & Scope", to: "/product" },
  SystemOwner: { msg: "요구사항·Variant·Safety·Control(RG2/3/4/7)을 담당합니다.", cta: "Requirements & System", to: "/requirements" },
  SWOwner: { msg: "SW/API·검증·협력사(RG5/RG6)를 담당합니다.", cta: "Verification", to: "/verification" },
  Supplier: { msg: "배정된 Work Package의 Evidence를 제출하세요.", cta: "Supplier Portal", to: "/supplier" },
  ReleaseOwner: { msg: "Release Readiness·OTA·플릿 배포(RG8)를 통제합니다.", cta: "Fleet Control", to: "/fleet" },
  OperationOwner: { msg: "Telemetry·KPI·Field Issue(RG9)와 플릿 운영을 모니터링합니다.", cta: "KPI Command", to: "/kpi" },
  Quality: { msg: "Evidence·검증·Safety·Traceability 품질을 검토합니다.", cta: "Gate Evidence", to: "/evidence" },
  Admin: { msg: "전체 시스템·RBAC·코드 마스터를 관리합니다.", cta: "RBAC / Admin", to: "/admin" },
};

export function DashboardPage() {
  const features = useList<Feature>("features");
  const gates = useList<Gate>("gates");
  const audit = useList<AuditLog>("auditLogs");
  const { role, roleLabel } = useRole();
  const navigate = useNavigate();

  const rows = features.map((f) => ({ ...f, summary: computeGateSummary(gates.filter((g) => g.featureId === f.id)) }));
  const released = features.filter((f) => f.status === "Released").length;
  const inDev = features.filter((f) => ["Approved", "Developing", "Verified"].includes(f.status)).length;
  const goCount = rows.filter((r) => r.summary.decision === "GO").length;
  const blocked = rows.filter((r) => r.summary.decision === "BLOCK").length;
  const overallReadiness = rows.length ? Math.round(rows.reduce((s, r) => s + r.summary.passCount / r.summary.total, 0) / rows.length * 100) : 0;

  const pie = LIFECYCLE_SEQUENCE.map((s) => ({ name: s, value: features.filter((f) => f.status === s).length, color: lifecycleColor(s) })).filter((d) => d.value > 0);

  // 포트폴리오 게이트 상태 분포 (스택 바)
  const gateBars = ["RG1", "RG2", "RG3", "RG4", "RG5", "RG6", "RG7", "RG8", "RG9"].map((code) => {
    const cg = gates.filter((g) => g.gateCode === code);
    return {
      gate: code,
      PASS: cg.filter((g) => g.status === "PASS" || g.status === "CONDITIONAL").length,
      PENDING: cg.filter((g) => g.status === "PENDING" || g.status === "NOT_STARTED" || g.status === "REWORK").length,
      BLOCK: cg.filter((g) => g.status === "BLOCK").length,
    };
  });

  // 플릿 활성화 추세 (mock 12주)
  const fleetTrend = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"].map((w, i) => ({
    week: w,
    activated: Math.round(400000 + i * 195000 + (i > 8 ? 120000 : 0)),
  }));

  const focus = ROLE_FOCUS[role];

  return (
    <div>
      <PageHeader title="Control Tower" subtitle={`Feature 포트폴리오 + 플릿 사령탑 · ${roleLabel} 관점`} icon="🛰" extra={<Link to="/fleet"><Tag color="#22d3ee" style={{ padding: "6px 14px", fontSize: 13, borderRadius: 999, cursor: "pointer" }}>🚗 Fleet Control →</Tag></Link>} />
      <DataQualityBanner />

      {focus && (
        <Alert
          type="success"
          showIcon
          className="fp-rise"
          style={{ marginBottom: 16, borderRadius: 12 }}
          message={`${roleLabel} 워크스페이스`}
          description={focus.msg}
          action={<Link to={focus.to}><Tag color="#15803d" style={{ cursor: "pointer", padding: "4px 12px" }}>{focus.cta} →</Tag></Link>}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}><div className="fp-rise fp-rise-1"><StatTile icon="🚗" label="Fleet under Mgmt" value={fmtVeh(FLEET_TOTALS.underManagement)} variant="chrome" delta="통제 대상 차량" spark={[3, 3.4, 3.7, 4, 4.2]} /></div></Col>
        <Col xs={12} lg={6}><div className="fp-rise fp-rise-2"><StatTile icon="⚡" label="Active Feature 차량" value={fmtVeh(FLEET_TOTALS.activeFeatures)} variant="cyan" delta="기능 활성 차량" spark={[1.4, 1.8, 2.1, 2.4, 2.7]} /></div></Col>
        <Col xs={12} lg={6}><div className="fp-rise fp-rise-3"><StatTile icon="🛰" label="Released Features" value={released} variant="emerald" delta={`개발 진행 ${inDev}건`} spark={[0, 0, 1, 1, released]} /></div></Col>
        <Col xs={12} lg={6}><div className="fp-rise fp-rise-4"><StatTile icon="✅" label="Production GO" value={goCount} variant="violet" delta={blocked ? `⚠ BLOCK ${blocked}건` : "차단 없음"} spark={[0, 1, 1, 1, goCount]} /></div></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={6}>
          <Card title="Fleet Gate Readiness" className="fp-card-lift" style={{ height: "100%" }}>
            <div style={{ display: "grid", placeItems: "center" }}>
              <RadialGauge value={overallReadiness} sublabel="평균 게이트 통과율" color="#06b6d4" size={150} />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="포트폴리오 게이트 상태 분포 (RG1~RG9)" className="fp-card-lift" style={{ height: "100%" }}>
            <StackedBars
              data={gateBars}
              xKey="gate"
              keys={[
                { key: "PASS", color: "#15803d", name: "PASS" },
                { key: "PENDING", color: "#b45309", name: "PENDING" },
                { key: "BLOCK", color: "#b91c1c", name: "BLOCK" },
              ]}
              height={230}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Lifecycle 분포" className="fp-card-lift" style={{ height: "100%" }} extra={<span style={{ fontSize: 11, color: "#94a3b8" }}>클릭 → Registry 필터</span>}>
            <CompositionPie data={pie} height={230} onSlice={(name) => navigate(`/features?status=${encodeURIComponent(name)}`)} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="플릿 활성화 추세 (12주, 누적 차량수)" className="fp-card-lift">
            <TrendArea data={fleetTrend} xKey="week" dataKey="activated" color="#06b6d4" height={220} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Recent Activity" className="fp-card-lift" style={{ height: "100%", maxHeight: 300, overflow: "auto" }}>
            <AuditTimeline logs={audit.slice(0, 6)} />
          </Card>
        </Col>
      </Row>

      <Card title="Feature 진행 현황" className="fp-card-lift">
        <Table<(typeof rows)[number]>
          rowKey="id"
          dataSource={rows}
          pagination={false}
          columns={[
            { title: "Feature ID", dataIndex: "id", render: (v) => <Link to={`/features/${v}`} className="fp-mono" style={{ fontWeight: 600 }}>{v}</Link> },
            { title: "Name", dataIndex: "name", render: (v) => <span style={{ fontWeight: 500 }}>{v}</span> },
            { title: "Lifecycle", dataIndex: "status", render: (s) => <LifecycleBadge status={s} /> },
            { title: "9 Gate", width: 300, render: (_, r) => <GatePipeline compact gates={gates.filter((g) => g.featureId === r.id)} /> },
            { title: "Production", render: (_, r) => <DecisionBadge decision={r.summary.decision} /> },
          ]}
        />
      </Card>
    </div>
  );
}
