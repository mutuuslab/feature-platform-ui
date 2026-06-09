// UI-043/046 Telemetry / KPI Dashboard (시트 38 CMP-012, 06_Operation_KPI). 게이지 + 스파크라인.
import { useState } from "react";
import { Card, Col, Empty, Row, Select, Space } from "antd";
import { useList } from "../data/useStore";
import type { Feature } from "../domain/types";
import type { FieldIssueRecord } from "../data/population";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { StatusBadge } from "../components/StatusBadge";
import { RadialGauge, Sparkline } from "../components/viz/Charts";

interface Kpi {
  name: string;
  value: number;
  unit: string;
  warning: number;
  critical: number;
  higherIsBetter: boolean;
  trend: number[];
}

const KPI_BY_FEATURE: Record<string, Kpi[]> = {
  "FEAT-DST-003": [
    { name: "Activation Rate", value: 92, unit: "%", warning: 80, critical: 70, higherIsBetter: true, trend: [78, 81, 85, 88, 90, 92] },
    { name: "Failure Rate", value: 0.8, unit: "%", warning: 2, critical: 5, higherIsBetter: false, trend: [2.1, 1.6, 1.3, 1.0, 0.9, 0.8] },
    { name: "Field Issues (7d)", value: 3, unit: "", warning: 10, critical: 25, higherIsBetter: false, trend: [9, 7, 6, 5, 4, 3] },
    { name: "Rollback Triggered", value: 0, unit: "", warning: 1, critical: 3, higherIsBetter: false, trend: [0, 1, 0, 0, 0, 0] },
  ],
};

const DEFAULT_KPIS: Kpi[] = [
  { name: "Activation Rate", value: 0, unit: "%", warning: 80, critical: 70, higherIsBetter: true, trend: [0, 0, 0] },
  { name: "Failure Rate", value: 0, unit: "%", warning: 2, critical: 5, higherIsBetter: false, trend: [0, 0, 0] },
  { name: "Field Issues (7d)", value: 0, unit: "", warning: 10, critical: 25, higherIsBetter: false, trend: [0, 0, 0] },
  { name: "Rollback Triggered", value: 0, unit: "", warning: 1, critical: 3, higherIsBetter: false, trend: [0, 0, 0] },
];

// Feature id 해시 → 결정적 KPI (모든 Released Feature가 그럴듯한 값을 갖도록; 0 나열 제거).
function hashId(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function trendTo(end: number, start: number, dec = 0): number[] {
  return Array.from({ length: 6 }, (_, i) => {
    const v = start + ((end - start) * i) / 5;
    return dec ? +v.toFixed(dec) : Math.round(v);
  });
}
function kpisFor(id: string, openIssues: number): Kpi[] {
  const h = hashId(id);
  const act = 80 + (h % 18); // 80~97
  const fail = +(0.4 + (h % 30) / 15).toFixed(1); // 0.4~2.4
  const rollback = h % 7 === 0 ? 1 : 0;
  return [
    { name: "Activation Rate", value: act, unit: "%", warning: 80, critical: 70, higherIsBetter: true, trend: trendTo(act, Math.max(60, act - 14)) },
    { name: "Failure Rate", value: fail, unit: "%", warning: 2, critical: 5, higherIsBetter: false, trend: trendTo(fail, fail + 1.6, 1) },
    { name: "Field Issues (7d)", value: openIssues, unit: "", warning: 10, critical: 25, higherIsBetter: false, trend: trendTo(openIssues, openIssues + 8) },
    { name: "Rollback Triggered", value: rollback, unit: "", warning: 1, critical: 3, higherIsBetter: false, trend: [0, rollback, 0, 0, 0, rollback] },
  ];
}

function kpiStatus(k: Kpi): "PASS" | "PENDING" | "BLOCK" {
  const breach = (limit: number) => (k.higherIsBetter ? k.value < limit : k.value > limit);
  if (breach(k.critical)) return "BLOCK";
  if (breach(k.warning)) return "PENDING";
  return "PASS";
}
const COLOR = { PASS: "#15803d", PENDING: "#b45309", BLOCK: "#b91c1c" } as const;

export function OperationsPage() {
  const released = useList<Feature>("features").filter((f) => f.status === "Released");
  const fieldIssues = useList<FieldIssueRecord>("fieldIssues");
  const [featureId, setFeatureId] = useState<string | undefined>(released[0]?.id);
  const openIssues = fieldIssues.filter((i) => i.featureId === featureId && i.status === "OPEN").length;
  const kpis = !featureId ? DEFAULT_KPIS : KPI_BY_FEATURE[featureId] ?? kpisFor(featureId, openIssues);
  const activation = kpis.find((k) => k.name === "Activation Rate")?.value ?? 0;

  return (
    <div>
      <PageHeader
        title="Operations / KPI Dashboard"
        subtitle="UI-043/046 · RG9 Telemetry & KPI (Released Feature)"
        icon="📡"
        extra={<Select style={{ width: 300 }} value={featureId} placeholder="Released Feature" onChange={setFeatureId} options={released.map((f) => ({ value: f.id, label: `${f.id} · ${f.name}` }))} />}
      />
      <DataQualityBanner />
      {!released.length ? (
        <Empty description="Released 상태 Feature가 없습니다. Release Readiness에서 GO 승인 후 표시됩니다." />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card className="fp-card-lift" style={{ height: "100%" }}>
                <div style={{ display: "grid", placeItems: "center" }}>
                  <RadialGauge value={activation} sublabel="Activation Rate" color="#06b6d4" size={170} />
                  <span style={{ marginTop: 10, color: "#64748b", fontSize: 12 }}>실차 Feature 활성화율 (실시간 텔레메트리)</span>
                </div>
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Row gutter={[16, 16]}>
                {kpis.map((k) => {
                  const status = kpiStatus(k);
                  return (
                    <Col key={k.name} xs={24} sm={12}>
                      <Card className="fp-card-lift">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ color: "#64748b", fontSize: 13 }}>{k.name}</div>
                            <div className="fp-display" style={{ fontSize: 30, fontWeight: 700, color: "#0a1f44", lineHeight: 1.2 }}>
                              {k.value}<span style={{ fontSize: 15, color: "#94a3b8" }}>{k.unit}</span>
                            </div>
                          </div>
                          <StatusBadge value={status} />
                        </div>
                        <Sparkline data={k.trend} color={COLOR[status]} width={200} height={40} />
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Warning {k.warning}{k.unit} · Critical {k.critical}{k.unit}</div>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Col>
          </Row>
        </Space>
      )}
    </div>
  );
}
