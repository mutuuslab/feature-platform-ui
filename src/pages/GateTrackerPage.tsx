// UI-037 9 Gate Readiness Tracker (시트 14, 41 step8~14). 게이트 상태 변경 → Lifecycle 자동 파생 + Audit.
import { useMemo, useState } from "react";
import { Card, Col, Empty, Row, Segmented, Select, Space } from "antd";
import { useParams } from "react-router";
import { store, useList, useMutate } from "../data/useStore";
import type { Feature, Gate, GateStatus } from "../domain/types";
import { GATES } from "../domain/codeMaster";
import { computeGateSummary, derivedLifecycleStatus } from "../domain/gateLogic";
import { DataQualityBanner, LifecycleStatusStepper, PageHeader } from "../components/Common";
import { GateStatusCard, GateSummaryBar } from "../components/GateComponents";
import { GatePipeline } from "../components/viz/GateViz";
import { RadialGauge } from "../components/viz/Charts";
import { useRole } from "../auth/RoleContext";
import { canDecideGate } from "../auth/rbac";

const SETTABLE: GateStatus[] = ["NOT_STARTED", "PENDING", "PASS", "BLOCK"];

export function GateTrackerPage() {
  const params = useParams();
  const features = useList<Feature>("features");
  const allGates = useList<Gate>("gates");
  const mutate = useMutate();
  const { role, userName } = useRole();

  const [selected, setSelected] = useState<string | undefined>(params.id ?? features[0]?.id);
  const featureId = params.id ?? selected;
  const feature = features.find((f) => f.id === featureId);
  const gates = useMemo(() => allGates.filter((g) => g.featureId === featureId), [allGates, featureId]);

  const setGate = (gateCode: string, status: GateStatus) => {
    if (!feature) return;
    mutate(() => {
      const g = gates.find((x) => x.gateCode === gateCode);
      if (!g) return;
      store.update<Gate>("gates", g.id, {
        status,
        evidenceCount: status === "PASS" ? Math.max(g.evidenceCount, 1) : g.evidenceCount,
        approver: status === "PASS" ? userName : undefined,
        approvalDate: status === "PASS" ? new Date().toISOString() : undefined,
        blockingReason: status === "BLOCK" ? "Manual block by reviewer" : undefined,
      });
      store.audit({ actor: userName, action: `GATE_${status}`, objectType: "Gate", objectId: g.id, before: g.status, after: status });
      // Lifecycle 자동 파생 (시트 41: 게이트 충족 시 상태 전이)
      const fresh = store.list<Gate>("gates").filter((x) => x.featureId === feature.id);
      const newStatus = derivedLifecycleStatus(fresh);
      if (newStatus !== feature.status) {
        store.update<Feature>("features", feature.id, { status: newStatus, updatedAt: new Date().toISOString() });
        store.audit({ actor: "system", action: "LIFECYCLE_TRANSITION", objectType: "Feature", objectId: feature.id, before: feature.status, after: newStatus, reason: "Gate bundle satisfied" });
      }
    });
  };

  const summary = feature ? computeGateSummary(gates) : null;
  const readiness = summary ? Math.round((summary.passCount / summary.total) * 100) : 0;

  return (
    <div>
      <PageHeader
        title="9 Gate Readiness Tracker"
        subtitle="UI-037 · RG1~RG9 / Production Activation 판단"
        icon="🚦"
        extra={<Select style={{ width: 300 }} value={featureId} onChange={setSelected} options={features.map((f) => ({ value: f.id, label: `${f.id} · ${f.name}` }))} />}
      />
      <DataQualityBanner />

      {!feature ? (
        <Empty description="Feature를 선택하세요" />
      ) : (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Card className="fp-rise fp-card-lift">
            <Row gutter={24} align="middle">
              <Col flex="none" style={{ textAlign: "center" }}>
                <RadialGauge value={readiness} sublabel={`${summary!.passCount}/9 PASS`} color={summary!.decision === "GO" ? "#15803d" : summary!.decision === "BLOCK" ? "#b91c1c" : "#b45309"} />
              </Col>
              <Col flex="auto">
                <GatePipeline gates={gates} />
                <div style={{ marginTop: 12 }}>
                  <LifecycleStatusStepper current={feature.status} />
                </div>
              </Col>
            </Row>
          </Card>
          <GateSummaryBar gates={gates} />
          <Row gutter={[16, 16]}>
            {GATES.map((meta) => {
              const g = gates.find((x) => x.gateCode === meta.code)!;
              const editable = canDecideGate(role, meta.code);
              return (
                <Col key={meta.code} xs={24} sm={12} lg={8}>
                  <GateStatusCard
                    gate={g}
                    action={
                      <Segmented
                        size="small"
                        block
                        disabled={!editable}
                        value={g.status}
                        onChange={(v) => setGate(meta.code, v as GateStatus)}
                        options={SETTABLE.map((s) => ({ label: s === "NOT_STARTED" ? "—" : s, value: s }))}
                        style={{ marginTop: 8 }}
                      />
                    }
                  />
                </Col>
              );
            })}
          </Row>
          <Card size="small">
            <span style={{ fontSize: 12, color: "#4B5563" }}>
              ⓘ 각 게이트는 담당 Owner 역할만 변경 가능합니다 (시트 23 RBAC-019). 상단에서 역할을 바꿔 보세요. 예: RG5는 SW Owner, RG8은 Release Owner.
            </span>
          </Card>
        </Space>
      )}
    </div>
  );
}
