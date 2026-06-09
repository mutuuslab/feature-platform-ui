// UI-038~040 Release Readiness / Production Activation (시트 41 step12·14).
// GO는 9/9 PASS일 때만. Rollback Plan 없으면 승인 차단 (SVC-010).
import { useMemo, useState } from "react";
import { Alert, Button, Card, Col, Descriptions, Empty, Row, Space, Table, message } from "antd";
import { store, useList, useMutate } from "../data/useStore";
import type { Feature, Gate, ReleasePlan } from "../domain/types";
import { computeGateSummary } from "../domain/gateLogic";
import { DataQualityBanner, PageHeader, confirmDecision } from "../components/Common";
import { GateSummaryBar } from "../components/GateComponents";
import { GatePipeline } from "../components/viz/GateViz";
import { RadialGauge } from "../components/viz/Charts";
import { DecisionBadge, LifecycleBadge } from "../components/StatusBadge";
import { useRole } from "../auth/RoleContext";
import { can } from "../auth/rbac";

export function ReleaseReadinessPage() {
  const features = useList<Feature>("features");
  const gates = useList<Gate>("gates");
  const plans = useList<ReleasePlan>("releasePlans");
  const mutate = useMutate();
  const { role, userName } = useRole();

  const [featureId, setFeatureId] = useState<string | undefined>(features[0]?.id);
  const feature = features.find((f) => f.id === featureId);
  const fgates = useMemo(() => gates.filter((g) => g.featureId === featureId), [gates, featureId]);
  const plan = plans.find((p) => p.featureId === featureId);
  const summary = computeGateSummary(fgates);
  const canApprove = can(role, "release.approve");

  const approve = () => {
    if (!feature) return;
    if (!plan?.rollbackReady) {
      message.error("Rollback Plan이 준비되지 않아 Release 승인이 차단됩니다 (NFR-009).");
      return;
    }
    if (summary.decision !== "GO") {
      message.warning(`현재 Production 판단은 ${summary.decision} 입니다. 9개 게이트 모두 PASS여야 GO 승인 가능합니다.`);
      return;
    }
    confirmDecision({
      title: "Production Activation 승인",
      content: `${feature.id} 을(를) Released 상태로 전환하고 배포를 승인합니다.`,
      onOk: () =>
        mutate(() => {
          store.update<Feature>("features", feature.id, { status: "Released", updatedAt: new Date().toISOString() });
          if (plan) store.update<ReleasePlan>("releasePlans", plan.id, { decision: "GO" });
          store.audit({ actor: userName, action: "PRODUCTION_ACTIVATION_GO", objectType: "Feature", objectId: feature.id, before: feature.status, after: "Released", reason: "All 9 gates PASS" });
          message.success("Production 활성화 승인 — Released");
        }),
    });
  };

  return (
    <div>
      <PageHeader title="Release Readiness Dashboard" subtitle="UI-038~040 · RG8/RG9 · Production Activation Decision" icon="🚀" />
      <DataQualityBanner />
      <Row gutter={16}>
        <Col span={10}>
          <Card title="Feature 별 Production 판단">
            <Table<Feature>
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={features}
              rowClassName={(f) => (f.id === featureId ? "ant-table-row-selected" : "")}
              onRow={(f) => ({ onClick: () => setFeatureId(f.id), style: { cursor: "pointer" } })}
              columns={[
                { title: "Feature", dataIndex: "id" },
                { title: "Lifecycle", dataIndex: "status", render: (s) => <LifecycleBadge status={s} /> },
                { title: "Decision", render: (_, f) => <DecisionBadge decision={computeGateSummary(gates.filter((g) => g.featureId === f.id)).decision} /> },
              ]}
            />
          </Card>
        </Col>
        <Col span={14}>
          {!feature ? (
            <Empty description="좌측에서 Feature를 선택하면 릴리즈 준비도가 표시됩니다." />
          ) : (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Card className="fp-card-lift">
                <Row gutter={20} align="middle">
                  <Col flex="none">
                    <RadialGauge value={Math.round((summary.passCount / summary.total) * 100)} sublabel={`${summary.passCount}/9 PASS`} color={summary.decision === "GO" ? "#15803d" : summary.decision === "BLOCK" ? "#b91c1c" : "#b45309"} size={130} />
                  </Col>
                  <Col flex="auto">
                    <GatePipeline gates={fgates} />
                  </Col>
                </Row>
              </Card>
              <GateSummaryBar gates={fgates} />
              <Card title={`Release Plan · ${feature.id}`}>
                {plan ? (
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Deploy Type">{plan.deployType}</Descriptions.Item>
                    <Descriptions.Item label="Target VIN Group">{plan.targetVinGroup}</Descriptions.Item>
                    <Descriptions.Item label="Rollout Waves">{plan.rolloutWaves}</Descriptions.Item>
                    <Descriptions.Item label="Rollback Plan">{plan.rollbackPlan}</Descriptions.Item>
                    <Descriptions.Item label="Rollback Ready">{plan.rollbackReady ? "✅ Ready" : "❌ Not Ready"}</Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Alert type="warning" showIcon message="Release Plan 미작성 — Rollback Plan이 없어 승인할 수 없습니다." />
                )}
                {summary.decision !== "GO" && (
                  <Alert
                    style={{ marginTop: 12 }}
                    type={summary.decision === "BLOCK" ? "error" : "warning"}
                    showIcon
                    message={`Production 판단: ${summary.decision}`}
                    description={summary.decision === "HOLD" ? "PENDING 게이트가 남아 있습니다. (예: RG8 PASS여도 RG5 PENDING이면 HOLD)" : "BLOCK된 게이트가 있습니다."}
                  />
                )}
                <Button type="primary" style={{ marginTop: 12 }} disabled={!canApprove} onClick={approve}>
                  Production Activation 승인 (GO)
                </Button>
                {!canApprove && <span style={{ marginLeft: 12, color: "#9A3412", fontSize: 12 }}>Release Owner 역할 필요 (RBAC-020)</span>}
              </Card>
            </Space>
          )}
        </Col>
      </Row>
    </div>
  );
}
