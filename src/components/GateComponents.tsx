// CMP-003 GateStatusCard / CMP-004 GateSummaryBar — 시트 38, 14
import { Card, Col, Row, Space, Statistic, Typography } from "antd";
import type { Gate } from "../domain/types";
import { GATES } from "../domain/codeMaster";
import { computeGateSummary } from "../domain/gateLogic";
import { DecisionBadge, GateBadge } from "./StatusBadge";

const { Text } = Typography;

export function GateSummaryBar({ gates }: { gates: Gate[] }) {
  const s = computeGateSummary(gates);
  return (
    <Card size="small" styles={{ body: { padding: 16 } }}>
      <Row gutter={16} align="middle">
        <Col flex="none">
          <Space direction="vertical" size={0}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Production Activation
            </Text>
            <DecisionBadge decision={s.decision} />
          </Space>
        </Col>
        <Col flex="auto">
          <Row gutter={24}>
            <Col>
              <Statistic title="PASS" value={s.passCount} suffix={`/ ${s.total}`} valueStyle={{ color: "#2E7D32" }} />
            </Col>
            <Col>
              <Statistic title="PENDING" value={s.pendingCount} valueStyle={{ color: "#7A5C00" }} />
            </Col>
            <Col>
              <Statistic title="BLOCK" value={s.blockCount} valueStyle={{ color: "#9A3412" }} />
            </Col>
          </Row>
        </Col>
      </Row>
    </Card>
  );
}

export function GateStatusCard({
  gate,
  action,
}: {
  gate: Gate;
  action?: React.ReactNode;
}) {
  const meta = GATES.find((g) => g.code === gate.gateCode);
  return (
    <Card size="small" style={{ height: "100%" }}>
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
        <Space style={{ justifyContent: "space-between", width: "100%" }}>
          <Text strong>
            {gate.gateCode} · {meta?.name}
          </Text>
          <GateBadge status={gate.status} />
        </Space>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {meta?.check}
        </Text>
        <Text style={{ fontSize: 12 }}>
          Owner: {gate.owner} · Evidence: {gate.evidenceCount}
        </Text>
        {gate.blockingReason && (
          <Text type="danger" style={{ fontSize: 12 }}>
            ⚠ {gate.blockingReason}
          </Text>
        )}
        {action}
      </Space>
    </Card>
  );
}
