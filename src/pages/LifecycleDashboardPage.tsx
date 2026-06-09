// UI-009 Lifecycle Status Dashboard (시트 16/34). 상태 전이 + 다음 단계 필요 게이트 표시.
import { Card, Col, Empty, Row, Space, Table, Tag, Typography } from "antd";
import { Link } from "react-router";
import { useList } from "../data/useStore";
import type { Feature, Gate } from "../domain/types";
import { LIFECYCLE_SEQUENCE } from "../domain/codeMaster";
import { transitionGateState } from "../domain/gateLogic";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { LifecycleBadge } from "../components/StatusBadge";

const { Text } = Typography;

export function LifecycleDashboardPage() {
  const features = useList<Feature>("features");
  const gates = useList<Gate>("gates");

  const byStatus = LIFECYCLE_SEQUENCE.map((s) => ({ status: s, features: features.filter((f) => f.status === s) }));

  return (
    <div>
      <PageHeader title="Lifecycle Status Dashboard" subtitle="UI-009 · Proposed → Retired 상태 전이" icon="🔄" />
      <DataQualityBanner />
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {byStatus.map((col) => (
          <Col key={col.status} flex="1 1 0">
            <Card size="small" title={<LifecycleBadge status={col.status} />} styles={{ body: { minHeight: 120 } }}>
              {col.features.length ? (
                <Space direction="vertical" size={4}>
                  {col.features.map((f) => (
                    <Link key={f.id} to={`/features/${f.id}`}>
                      <Tag style={{ cursor: "pointer" }}>{f.id}</Tag>
                    </Link>
                  ))}
                </Space>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>—</Text>
              )}
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="다음 단계 전이 조건">
        {features.length ? (
          <Table<Feature>
            rowKey="id"
            pagination={false}
            dataSource={features}
            columns={[
              { title: "Feature", dataIndex: "id", render: (v) => <Link to={`/features/${v}`}>{v}</Link> },
              { title: "현재 상태", dataIndex: "status", render: (s) => <LifecycleBadge status={s} /> },
              {
                title: "다음 상태",
                render: (_, f) => {
                  const t = transitionGateState(f.status, gates.filter((g) => g.featureId === f.id));
                  return t.to ? <LifecycleBadge status={t.to} /> : <Text type="secondary">최종</Text>;
                },
              },
              {
                title: "필요 게이트 / Blocking",
                render: (_, f) => {
                  const t = transitionGateState(f.status, gates.filter((g) => g.featureId === f.id));
                  if (!t.to) return "—";
                  return (
                    <Space size={4} wrap>
                      {t.requiredGates.map((rg) => (
                        <Tag key={rg} color={t.blocking.includes(rg) ? "#9A3412" : "#2E7D32"}>
                          {rg}
                          {t.blocking.includes(rg) ? " ⚠" : " ✓"}
                        </Tag>
                      ))}
                    </Space>
                  );
                },
              },
              {
                title: "전이 가능",
                render: (_, f) => {
                  const t = transitionGateState(f.status, gates.filter((g) => g.featureId === f.id));
                  return t.to ? (t.satisfied ? <Tag color="#2E7D32">가능</Tag> : <Tag color="#7A5C00">HOLD</Tag>) : "—";
                },
              },
            ]}
          />
        ) : (
          <Empty description="등록된 Feature가 없습니다." />
        )}
      </Card>
    </div>
  );
}
