// KPI Command Center — 시트 06_Operation_KPI (KPI Master + Decision Rules + Review Cadence).
import { useState } from "react";
import { Card, Col, Descriptions, Drawer, Row, Statistic, Table, Tag } from "antd";
import { DECISION_RULES, KPIS, REVIEW_CADENCE, kpiStatusColor, type KpiRow } from "../data/kpi";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { StatTile } from "../components/viz/StatTile";
import { Sparkline } from "../components/viz/Charts";
import { KpiMultiLine, TrendArea } from "../components/viz/RCharts";

export function KpiCommandPage() {
  const [active, setActive] = useState<KpiRow | null>(null);
  const counts = KPIS.reduce(
    (a, k) => ((a[k.status] = (a[k.status] ?? 0) + 1), a),
    {} as Record<string, number>,
  );

  // 운영 핵심 KPI 추세 (최근 6주)
  const weeks = ["W-5", "W-4", "W-3", "W-2", "W-1", "Now"];
  const opsTrend = weeks.map((w, i) => ({
    week: w,
    "Activation Success": KPIS.find((k) => k.id === "KPI-OPS-001")!.trend[i],
    "Gate PASS Ratio": KPIS.find((k) => k.id === "KPI-LC-002")!.trend[i],
    "Evidence Completeness": KPIS.find((k) => k.id === "KPI-TRC-003")!.trend[i],
  }));

  return (
    <div>
      <PageHeader title="KPI Command Center" subtitle="시트 06 · 34 KPI 운영 마스터 · HOLD/BLOCK/Rollback 결정 규칙" icon="📊" />
      <DataQualityBanner />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}><StatTile icon="📈" label="모니터링 KPI" value={KPIS.length} variant="chrome" delta="총 34종 중 대표 16종" /></Col>
        <Col xs={12} lg={6}><StatTile icon="✅" label="OK" value={counts.OK ?? 0} variant="emerald" /></Col>
        <Col xs={12} lg={6}><StatTile icon="⚠️" label="WARNING" value={counts.WARNING ?? 0} variant="amber" /></Col>
        <Col xs={12} lg={6}><StatTile icon="🛑" label="CRITICAL" value={counts.CRITICAL ?? 0} variant="crimson" /></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={14}>
          <Card title="운영 핵심 KPI 추세 (6주)" className="fp-card-lift">
            <KpiMultiLine
              data={opsTrend}
              xKey="week"
              series={[
                { key: "Activation Success", color: "#06b6d4", name: "Activation Success %" },
                { key: "Gate PASS Ratio", color: "#15803d", name: "Gate PASS %" },
                { key: "Evidence Completeness", color: "#b45309", name: "Evidence %" },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="KPI Decision Rules (HOLD/BLOCK/Rollback Trigger)" className="fp-card-lift" style={{ height: "100%" }}>
            {DECISION_RULES.map((r) => (
              <div key={r.id} style={{ padding: "8px 0", borderBottom: "1px solid #eef2f8" }}>
                <Tag className="fp-mono" color="#1f4e78">{r.id}</Tag>
                <span style={{ fontSize: 13 }}>{r.condition}</span>
                <div style={{ fontSize: 12, color: "#9a3412", marginTop: 2 }}>→ {r.decision} <span style={{ color: "#64748b" }}>({r.escalation})</span></div>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Card title="KPI Master Table (시트 06)" className="fp-card-lift" style={{ marginBottom: 16 }}>
        <Table<KpiRow>
          rowKey="id"
          dataSource={KPIS}
          pagination={false}
          scroll={{ x: "max-content" }}
          onRow={(r) => ({ onClick: () => setActive(r), style: { cursor: "pointer" } })}
          columns={[
            { title: "KPI ID", dataIndex: "id", render: (v) => <span className="fp-mono">{v}</span> },
            { title: "Domain", dataIndex: "domain" },
            { title: "KPI", dataIndex: "name" },
            { title: "Gate", dataIndex: "gate", render: (v) => <span className="fp-mono">{v}</span> },
            { title: "Target", dataIndex: "target", render: (v, r) => <span className="fp-mono">{v}{r.unit === "%" ? "%" : ""}</span> },
            { title: "Warn", dataIndex: "warning", render: (v) => <span className="fp-mono" style={{ color: "#b45309" }}>{v}</span> },
            { title: "Critical", dataIndex: "critical", render: (v) => <span className="fp-mono" style={{ color: "#b91c1c" }}>{v}</span> },
            { title: "Actual", dataIndex: "actual", render: (v) => <span className="fp-mono" style={{ fontWeight: 700 }}>{v}</span> },
            { title: "Trend", render: (_, r) => <Sparkline data={r.trend} color={kpiStatusColor(r.status)} width={80} height={28} /> },
            { title: "Status", dataIndex: "status", render: (s: KpiRow["status"]) => <Tag color={kpiStatusColor(s)}>{s}</Tag> },
            { title: "Decision Trigger", dataIndex: "trigger" },
          ]}
        />
      </Card>

      <Card title="Review Cadence (운영 거버넌스 리듬)" className="fp-card-lift">
        <Table
          rowKey="cadence"
          dataSource={REVIEW_CADENCE}
          pagination={false}
          columns={[
            { title: "Cadence", dataIndex: "cadence", render: (v) => <strong>{v}</strong> },
            { title: "Scope", dataIndex: "scope" },
            { title: "Decision", dataIndex: "decision", render: (v) => <Tag color="#1f4e78">{v}</Tag> },
            { title: "Review Board", dataIndex: "board" },
          ]}
        />
      </Card>

      <Drawer
        title={active ? <span><Tag className="fp-mono" color="#1f4e78">{active.id}</Tag>{active.name}</span> : ""}
        width={620}
        open={!!active}
        onClose={() => setActive(null)}
      >
        {active && (
          <>
            <Row gutter={12} style={{ marginBottom: 12 }}>
              <Col span={8}><Card size="small"><Statistic title="Actual" value={active.actual} suffix={active.unit === "%" ? "%" : ""} valueStyle={{ color: kpiStatusColor(active.status) }} /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="Warning" value={active.warning} valueStyle={{ color: "#b45309" }} /></Card></Col>
              <Col span={8}><Card size="small"><Statistic title="Critical" value={active.critical} valueStyle={{ color: "#b91c1c" }} /></Card></Col>
            </Row>
            <Card size="small" title="추세 (최근 6주)" style={{ marginBottom: 12 }}>
              <TrendArea data={active.trend.map((v, i) => ({ t: `W-${active.trend.length - 1 - i}`, value: v }))} xKey="t" dataKey="value" color={kpiStatusColor(active.status)} height={180} />
            </Card>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Domain">{active.domain}</Descriptions.Item>
              <Descriptions.Item label="Related Gate"><span className="fp-mono">{active.gate}</span></Descriptions.Item>
              <Descriptions.Item label="Owner">{active.owner}</Descriptions.Item>
              <Descriptions.Item label="Target">{active.target}{active.unit === "%" ? "%" : ` ${active.unit}`}</Descriptions.Item>
              <Descriptions.Item label="Status"><Tag color={kpiStatusColor(active.status)}>{active.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Decision / Hold Trigger"><span style={{ color: "#9a3412" }}>{active.trigger}</span></Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Drawer>
    </div>
  );
}
