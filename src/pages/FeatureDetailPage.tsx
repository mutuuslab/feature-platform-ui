// UI-008 Feature Detail Master Page (시트 38). Feature ID 기준 모든 산출물 연결.
import { Button, Card, Col, Descriptions, Empty, Row, Space, Table } from "antd";
import { Link, useParams } from "react-router";
import { useList, useOne } from "../data/useStore";
import type { AuditLog, Evidence, Feature, Gate } from "../domain/types";
import { DataQualityBanner, LifecycleStatusStepper, PageHeader } from "../components/Common";
import { GateSummaryBar } from "../components/GateComponents";
import { GatePipeline } from "../components/viz/GateViz";
import { OwnerAssignmentPanel } from "../components/OwnerAssignmentPanel";
import { GateBadge, LifecycleBadge, StatusBadge } from "../components/StatusBadge";
import { AuditTimeline } from "../components/AuditTimeline";

export function FeatureDetailPage() {
  const { id } = useParams();
  const feature = useOne<Feature>("features", id);
  const gates = useList<Gate>("gates").filter((g) => g.featureId === id);
  const evidence = useList<Evidence>("evidence").filter((e) => e.featureId === id);
  const audit = useList<AuditLog>("auditLogs").filter((a) => a.objectId === id || a.objectId.startsWith(`${id}-`));

  if (!feature) return <Empty description="Feature를 찾을 수 없습니다" />;

  return (
    <div>
      <PageHeader title={`${feature.id} · ${feature.name}`} subtitle="UI-008 · Feature Detail Master" icon="🚗" />
      <DataQualityBanner />
      <Row gutter={16}>
        <Col span={16}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Card>
              <Descriptions column={2} size="small" title="Master" extra={<LifecycleBadge status={feature.status} />}>
                <Descriptions.Item label="Description" span={2}>{feature.description}</Descriptions.Item>
                <Descriptions.Item label="Deploy Type">{feature.deployType}</Descriptions.Item>
                <Descriptions.Item label="Customer Value">{feature.customerValue}</Descriptions.Item>
                <Descriptions.Item label="Target Region">{feature.targetRegion}</Descriptions.Item>
                <Descriptions.Item label="Target Trim">{feature.targetTrim}</Descriptions.Item>
              </Descriptions>
              <LifecycleStatusStepper current={feature.status} />
            </Card>

            <GateSummaryBar gates={gates} />
            <Card size="small"><GatePipeline gates={gates} /></Card>
            <Card size="small" title="Gates" extra={<Link to={`/gates/${feature.id}`}><Button size="small" type="primary">9 Gate Tracker 열기</Button></Link>}>
              <Table<Gate>
                rowKey="id"
                size="small"
                pagination={false}
                dataSource={gates}
                columns={[
                  { title: "Gate", dataIndex: "gateCode" },
                  { title: "Owner", dataIndex: "owner" },
                  { title: "Evidence", dataIndex: "evidenceCount" },
                  { title: "Status", dataIndex: "status", render: (s) => <GateBadge status={s} /> },
                ]}
              />
            </Card>

            <Card size="small" title="Linked Evidence (Traceability)">
              {evidence.length ? (
                <Table<Evidence>
                  rowKey="id"
                  size="small"
                  pagination={false}
                  dataSource={evidence}
                  columns={[
                    { title: "Evidence ID", dataIndex: "id" },
                    { title: "Gate", dataIndex: "gateCode" },
                    { title: "Type", dataIndex: "type" },
                    { title: "File", dataIndex: "fileName" },
                    { title: "Status", dataIndex: "status", render: (s) => <StatusBadge value={s} /> },
                  ]}
                />
              ) : (
                <Empty description="연결된 Evidence 없음" />
              )}
            </Card>
          </Space>
        </Col>
        <Col span={8}>
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <OwnerAssignmentPanel owners={feature.owners} />
            <Card size="small" title="Audit Trail">
              <AuditTimeline logs={audit} />
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
