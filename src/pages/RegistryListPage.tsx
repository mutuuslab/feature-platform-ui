// UI-007 Feature Registry List / Search (시트 35). 검색/필터/Gate 요약.
import { useEffect, useMemo, useState } from "react";
import { Card, Input, Select, Space, Table } from "antd";
import { Link, useSearchParams } from "react-router";
import { useList } from "../data/useStore";
import type { Feature, Gate } from "../domain/types";
import { LIFECYCLE_SEQUENCE } from "../domain/codeMaster";
import { computeGateSummary } from "../domain/gateLogic";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { DecisionBadge, LifecycleBadge } from "../components/StatusBadge";
import { GatePipeline } from "../components/viz/GateViz";

export function RegistryListPage() {
  const features = useList<Feature>("features");
  const gates = useList<Gate>("gates");
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | undefined>();

  // Control Tower의 Lifecycle 분포 차트에서 슬라이스 클릭 시 ?status= 로 진입 → 자동 필터 (차트 드릴다운)
  useEffect(() => {
    const s = searchParams.get("status");
    if (s) setStatus(s);
  }, [searchParams]);

  const rows = useMemo(
    () =>
      features
        .filter((f) => (status ? f.status === status : true))
        .filter((f) => (q ? `${f.id} ${f.name} ${f.targetRegion}`.toLowerCase().includes(q.toLowerCase()) : true))
        .map((f) => ({ ...f, summary: computeGateSummary(gates.filter((g) => g.featureId === f.id)) })),
    [features, gates, q, status],
  );

  return (
    <div>
      <PageHeader title="Feature Registry" subtitle="UI-007 · 전체 Feature 목록 / 검색 (메인 Landing)" icon="🗂" />
      <DataQualityBanner />
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search placeholder="Feature ID / Name / Region 검색" allowClear style={{ width: 320 }} onChange={(e) => setQ(e.target.value)} />
          <Select placeholder="Lifecycle 상태" allowClear style={{ width: 180 }} value={status} onChange={setStatus} options={LIFECYCLE_SEQUENCE.map((s) => ({ value: s, label: s }))} />
        </Space>
        <Table<(typeof rows)[number]>
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: "Feature ID", dataIndex: "id", render: (v) => <Link to={`/features/${v}`}>{v}</Link>, sorter: (a, b) => a.id.localeCompare(b.id) },
            { title: "Name", dataIndex: "name" },
            { title: "Lifecycle", dataIndex: "status", render: (s) => <LifecycleBadge status={s} /> },
            { title: "Product Owner", render: (_, r) => r.owners.productOwner ?? "—" },
            { title: "9 Gate", width: 280, render: (_, r) => <GatePipeline compact gates={gates.filter((g) => g.featureId === r.id)} /> },
            { title: "Production", render: (_, r) => <DecisionBadge decision={r.summary.decision} /> },
            { title: "Deploy", dataIndex: "deployType" },
            { title: "Region", dataIndex: "targetRegion" },
          ]}
        />
      </Card>
    </div>
  );
}
