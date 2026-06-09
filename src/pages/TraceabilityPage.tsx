// UI-012 Feature Traceability Matrix (시트 38 CMP-010). Feature→Req→API→Code→Test→Evidence→Release 추적.
import { useState } from "react";
import { Card, Col, Empty, Row, Select, Table, Tag } from "antd";
import { useList } from "../data/useStore";
import type { Evidence, Feature, Gate } from "../domain/types";
import { DataQualityBanner, PageHeader } from "../components/Common";

interface TraceStage {
  key: string;
  label: string;
  icon: string;
  count: number;
  gate: string;
  complete: boolean;
}

interface TraceLink {
  reqId: string;
  apiId: string;
  build: string;
  testCase: string;
  evidence: string;
  status: "COMPLETE" | "GAP";
}

const MOCK_LINKS: TraceLink[] = [
  { reqId: "SYS-REQ-014", apiId: "API-RPA-01", build: "build#1042", testCase: "TC-RPA-001", evidence: "EV-002", status: "COMPLETE" },
  { reqId: "SYS-REQ-015", apiId: "API-RPA-02", build: "build#1042", testCase: "TC-RPA-014", evidence: "EV-001", status: "GAP" },
  { reqId: "SYS-REQ-016", apiId: "API-RPA-03", build: "build#1051", testCase: "TC-RPA-021", evidence: "—", status: "GAP" },
];

export function TraceabilityPage() {
  const features = useList<Feature>("features");
  const gates = useList<Gate>("gates");
  const evidence = useList<Evidence>("evidence");
  const [featureId, setFeatureId] = useState<string | undefined>(features[0]?.id);
  const feature = features.find((f) => f.id === featureId);
  const fgates = gates.filter((g) => g.featureId === featureId);
  const isPass = (code: string) => fgates.find((g) => g.gateCode === code)?.status === "PASS";

  const stages: TraceStage[] = [
    { key: "feature", label: "Feature", icon: "🚗", count: 1, gate: "RG1", complete: isPass("RG1") },
    { key: "req", label: "Requirement", icon: "📋", count: 3, gate: "RG2", complete: isPass("RG2") },
    { key: "api", label: "API Contract", icon: "🔌", count: 3, gate: "RG6", complete: isPass("RG6") },
    { key: "code", label: "Code / Build", icon: "💾", count: 2, gate: "RG5", complete: isPass("RG5") },
    { key: "test", label: "Test Case", icon: "🧪", count: 3, gate: "RG5", complete: isPass("RG5") },
    { key: "evidence", label: "Evidence", icon: "📎", count: evidence.filter((e) => e.featureId === featureId).length, gate: "RG5", complete: isPass("RG5") },
    { key: "release", label: "Release", icon: "🚀", count: feature?.status === "Released" ? 1 : 0, gate: "RG8", complete: isPass("RG8") },
  ];

  return (
    <div>
      <PageHeader
        title="Traceability Matrix"
        subtitle="UI-012 · Feature ↔ Requirement ↔ API ↔ Code ↔ Test ↔ Evidence ↔ Release"
        icon="🧬"
        extra={<Select style={{ width: 300 }} value={featureId} onChange={setFeatureId} options={features.map((f) => ({ value: f.id, label: `${f.id} · ${f.name}` }))} />}
      />
      <DataQualityBanner />
      {!feature ? (
        <Empty />
      ) : (
        <>
          <Card className="fp-card-lift" style={{ marginBottom: 16 }} title="Trace Flow">
            <Row gutter={[8, 8]} align="middle" wrap={false} style={{ overflowX: "auto" }}>
              {stages.map((s, i) => (
                <Col key={s.key} flex="none">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        width: 116,
                        padding: "14px 10px",
                        borderRadius: 12,
                        textAlign: "center",
                        color: "#fff",
                        background: s.complete ? "linear-gradient(135deg,#047857,#34d399)" : "linear-gradient(135deg,#64748b,#94a3b8)",
                        boxShadow: s.complete ? "0 0 16px rgba(52,211,153,0.4)" : "none",
                      }}
                    >
                      <div style={{ fontSize: 22 }}>{s.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                      <div className="fp-mono" style={{ fontSize: 18, fontWeight: 700 }}>{s.count}</div>
                      <Tag color={s.complete ? "#15803d" : "#475569"} style={{ marginTop: 4, marginInline: 0 }}>{s.gate} {s.complete ? "✓" : "…"}</Tag>
                    </div>
                    {i < stages.length - 1 && <span style={{ color: "#94a3b8", fontSize: 20 }}>→</span>}
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
          <Card title="Trace Links" className="fp-card-lift">
            <Table<TraceLink>
              rowKey="reqId"
              dataSource={MOCK_LINKS}
              pagination={false}
              columns={[
                { title: "Requirement", dataIndex: "reqId", render: (v) => <span className="fp-mono">{v}</span> },
                { title: "API", dataIndex: "apiId", render: (v) => <span className="fp-mono">{v}</span> },
                { title: "Build", dataIndex: "build", render: (v) => <span className="fp-mono">{v}</span> },
                { title: "Test Case", dataIndex: "testCase", render: (v) => <span className="fp-mono">{v}</span> },
                { title: "Evidence", dataIndex: "evidence", render: (v) => (v === "—" ? <Tag color="#b91c1c">MISSING</Tag> : <span className="fp-mono">{v}</span>) },
                { title: "Status", dataIndex: "status", render: (s) => <Tag color={s === "COMPLETE" ? "#15803d" : "#b45309"}>{s === "COMPLETE" ? "✓ COMPLETE" : "⚠ GAP"}</Tag> },
              ]}
            />
          </Card>
        </>
      )}
    </div>
  );
}
