// UI-007 Feature Catalog — 등록된 Feature의 lifecycle 관리 + L0~L5 Taxonomy (기능명세 02-2).
import { useEffect, useMemo, useState } from "react";
import { App, Button, Card, Descriptions, Drawer, Form, Input, Select, Space, Table, Tag } from "antd";
import { ApartmentOutlined } from "@ant-design/icons";
import { Link, useSearchParams } from "react-router";
import { store, useList, useMutate } from "../data/useStore";
import type { Feature, Gate } from "../domain/types";
import { LIFECYCLE_SEQUENCE } from "../domain/codeMaster";
import { computeGateSummary } from "../domain/gateLogic";
import {
  DOMAINS, LEVEL_META, TAXONOMY_LEVELS, featureTypeFor, resolveTaxonomy, checkTaxonomyRules,
  type TaxonomyLevel,
} from "../domain/taxonomy";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { DecisionBadge, LifecycleBadge } from "../components/StatusBadge";
import { GatePipeline } from "../components/viz/GateViz";

const LEVEL_COLOR: Record<TaxonomyLevel, string> = { L0: "#475569", L1: "#0891b2", L2: "#1f4e78", L3: "#7c3aed", L4: "#b45309", L5: "#64748b" };

// 선택 Feature의 L0~L5 수직 Topology (기능명세 02-2 중앙 컬럼 재현)
function TopologyDiagram({ feature }: { feature: Feature }) {
  const t = resolveTaxonomy(feature);
  const code = /^FEAT-([A-Z]{2,5})-/.exec(feature.id)?.[1] ?? "FEAT";
  const rows: { lvl: TaxonomyLevel; title: string; sub: string }[] = [
    { lvl: "L0", title: t.domain, sub: "Domain / Capability" },
    { lvl: "L1", title: t.cluster, sub: "Customer / Business Feature" },
    { lvl: "L2", title: t.displayName, sub: `Vehicle / System Feature · ${feature.id}` },
    { lvl: "L3", title: `${code} SW Function`, sub: "Software Feature · SWC/ECU/Supplier" },
    { lvl: "L4", title: `CP-${code}-ENABLE`, sub: "Policy / Flag / Parameter" },
    { lvl: "L5", title: `${code}State`, sub: "Code / Signal / Logic" },
  ];
  return (
    <Space direction="vertical" size={6} style={{ width: "100%" }}>
      {rows.map((r) => {
        const anchor = r.lvl === "L2";
        return (
          <div key={r.lvl} style={{ display: "flex", alignItems: "stretch", gap: 8 }}>
            <div style={{ width: 30, display: "grid", placeItems: "center", borderRadius: 6, background: LEVEL_COLOR[r.lvl], color: "#fff", fontSize: 12, fontWeight: 700 }}>{r.lvl}</div>
            <div style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${anchor ? "#1f4e78" : "#e6ebf2"}`, background: anchor ? "#eef3f9" : "#fff" }}>
              <div style={{ fontWeight: anchor ? 700 : 600, color: anchor ? "#1f4e78" : "#334155" }}>{r.title} {anchor && <Tag color="#1f4e78" style={{ marginLeft: 6 }}>기준</Tag>}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{r.sub}</div>
            </div>
          </div>
        );
      })}
    </Space>
  );
}

export function RegistryListPage() {
  const features = useList<Feature>("features");
  const gates = useList<Gate>("gates");
  const mutate = useMutate();
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [level, setLevel] = useState<string | undefined>();
  const [domain, setDomain] = useState<string | undefined>();

  const [edit, setEdit] = useState<Feature | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    const s = searchParams.get("status");
    if (s) setStatus(s);
  }, [searchParams]);

  const rows = useMemo(
    () =>
      features
        .map((f) => ({ f, t: resolveTaxonomy(f) }))
        .filter(({ f }) => (status ? f.status === status : true))
        .filter(({ t }) => (level ? t.level === level : true))
        .filter(({ t }) => (domain ? t.domain === domain : true))
        .filter(({ f }) => (q ? `${f.id} ${f.name} ${f.displayName ?? ""} ${f.targetRegion}`.toLowerCase().includes(q.toLowerCase()) : true))
        .map(({ f, t }) => ({ ...f, _t: t, summary: computeGateSummary(gates.filter((g) => g.featureId === f.id)) })),
    [features, gates, q, status, level, domain],
  );

  const openEdit = (f: Feature) => {
    const t = resolveTaxonomy(f);
    setEdit(f);
    form.setFieldsValue({
      taxonomyLevel: t.level,
      featureType: t.featureType,
      parentFeatureId: f.parentFeatureId ?? t.cluster,
      displayName: t.displayName,
      internalAlias: f.internalAlias,
      ownerOrg: f.ownerOrg ?? t.ownerOrg,
    });
  };

  const saveEdit = () => {
    if (!edit) return;
    const v = form.getFieldsValue(true);
    mutate(() => {
      store.update<Feature>("features", edit.id, {
        taxonomyLevel: v.taxonomyLevel,
        featureType: v.featureType,
        parentFeatureId: v.parentFeatureId,
        displayName: v.displayName,
        internalAlias: v.internalAlias,
        ownerOrg: v.ownerOrg,
        traceabilityRoot: edit.traceabilityRoot ?? edit.id,
        updatedAt: new Date().toISOString(),
      });
      store.audit({ actor: "PMO", action: "TAXONOMY_UPDATE", objectType: "Feature", objectId: edit.id, after: v.taxonomyLevel });
    });
    message.success(`${edit.id} Taxonomy 저장됨`);
    setEdit(null);
  };

  // 편집 중 미리보기(규칙/Registration Output)
  const editLevel = (Form.useWatch?.("taxonomyLevel", form) as TaxonomyLevel | undefined) ?? "L2";
  const editParent = Form.useWatch?.("parentFeatureId", form) as string | undefined;
  const ruleCheck = checkTaxonomyRules({ taxonomyLevel: editLevel, parentFeatureId: editParent });
  const editDomain = edit ? resolveTaxonomy(edit).domain : undefined;
  const clusterOptions = (DOMAINS.find((d) => d.name === editDomain)?.clusters ?? []).map((c) => ({ value: c, label: c }));

  return (
    <div>
      <PageHeader title="Feature Catalog" subtitle="UI-007 · 등록 Feature lifecycle 관리 + L0~L5 Taxonomy" icon="🗂" />
      <DataQualityBanner />
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search placeholder="ID / Name / 표시명 / Region" allowClear style={{ width: 300 }} onChange={(e) => setQ(e.target.value)} />
          <Select placeholder="Lifecycle" allowClear style={{ width: 150 }} value={status} onChange={setStatus} options={LIFECYCLE_SEQUENCE.map((s) => ({ value: s, label: s }))} />
          <Select placeholder="Taxonomy Level" allowClear style={{ width: 150 }} value={level} onChange={setLevel} options={TAXONOMY_LEVELS.map((l) => ({ value: l, label: `${l} · ${LEVEL_META[l].registryObject}` }))} />
          <Select placeholder="Domain (L0)" allowClear style={{ width: 190 }} value={domain} onChange={setDomain} options={DOMAINS.map((d) => ({ value: d.name, label: d.name }))} />
        </Space>
        <Table<(typeof rows)[number]>
          rowKey="id"
          dataSource={rows}
          scroll={{ x: "max-content" }}
          columns={[
            { title: "Feature ID", dataIndex: "id", render: (v) => <Link to={`/features/${v}`} className="fp-mono">{v}</Link>, sorter: (a, b) => a.id.localeCompare(b.id) },
            { title: "표시명 (DisplayName)", render: (_, r) => r._t.displayName },
            { title: "Level", render: (_, r) => <Tag color={LEVEL_COLOR[r._t.level]}>{r._t.level}</Tag>, filters: TAXONOMY_LEVELS.map((l) => ({ text: l, value: l })), onFilter: (val, r) => r._t.level === val },
            { title: "Type", render: (_, r) => <span style={{ fontSize: 12, color: "#475569" }}>{r._t.featureType}</span> },
            { title: "Parent (L1)", render: (_, r) => r._t.cluster },
            { title: "Lifecycle", dataIndex: "status", render: (s) => <LifecycleBadge status={s} /> },
            { title: "Owner Org", render: (_, r) => r._t.ownerOrg },
            { title: "9 Gate", width: 260, render: (_, r) => <GatePipeline compact gates={gates.filter((g) => g.featureId === r.id)} /> },
            { title: "Production", render: (_, r) => <DecisionBadge decision={r.summary.decision} /> },
            { title: "Region", dataIndex: "targetRegion" },
            { title: "", render: (_, r) => <Button size="small" icon={<ApartmentOutlined />} onClick={() => openEdit(r)}>Taxonomy</Button> },
          ]}
        />
      </Card>

      <Drawer
        title={edit ? <span><Tag className="fp-mono" color="#1f4e78">{edit.id}</Tag>Taxonomy 편집</span> : ""}
        width={620}
        open={!!edit}
        onClose={() => setEdit(null)}
        extra={<Button type="primary" onClick={saveEdit}>저장</Button>}
      >
        {edit && (
          <Space direction="vertical" size={14} style={{ width: "100%" }}>
            <Form form={form} layout="vertical">
              <Card size="small" title="① 분류 (L0~L5)">
                <Space.Compact block>
                  <Form.Item name="taxonomyLevel" label="Level" style={{ width: 140 }}>
                    <Select onChange={(l: TaxonomyLevel) => form.setFieldValue("featureType", featureTypeFor(l))} options={TAXONOMY_LEVELS.map((l) => ({ value: l, label: l }))} />
                  </Form.Item>
                  <Form.Item name="featureType" label="Feature Type" style={{ flex: 1, marginLeft: 12 }}>
                    <Input />
                  </Form.Item>
                </Space.Compact>
                <Form.Item name="parentFeatureId" label="Parent (L1 클러스터 / 상위 ID)" tooltip="L2는 L1 클러스터에 귀속(T-001)">
                  <Select showSearch allowClear placeholder="상위 선택/입력" options={clusterOptions} />
                </Form.Item>
                <Tag color="#475569">L0 도메인: {editDomain}</Tag>
                <Tag color="#64748b">{LEVEL_META[editLevel].purpose}</Tag>
              </Card>

              <Card size="small" title="② 명명 (Naming / ID Rule)">
                <Form.Item name="displayName" label="Display Name (고객/차량 관점)"><Input /></Form.Item>
                <Form.Item name="internalAlias" label="Internal Alias (조직 명명)"><Input placeholder="예: bdc.remote_door_lock" /></Form.Item>
                <Form.Item name="ownerOrg" label="Owner Org"><Input placeholder="예: ADAS Po Org" /></Form.Item>
                <div style={{ fontSize: 12, color: "#64748b" }}>ID 규칙 — L2 <code>FEAT-{"{DOMAIN}"}-{"{NNN}"}</code> · L4 <code>CP-{"{FEATURE}"}-{"{TYPE}"}</code></div>
              </Card>
            </Form>

            <Card size="small" title="③ Level Rule Status (Consistency)">
              <Tag color={ruleCheck.status === "PASS" ? "#15803d" : "#b45309"} style={{ marginBottom: 8 }}>{ruleCheck.status}</Tag>
              <Space direction="vertical" size={2} style={{ width: "100%" }}>
                {ruleCheck.rules.filter((r) => r.applies).map((r) => (
                  <div key={r.id} style={{ fontSize: 12 }}><Tag color={r.pass ? "#15803d" : "#b91c1c"}>{r.pass ? "✓" : "✗"} {r.id}</Tag>{r.label}</div>
                ))}
                {ruleCheck.rules.filter((r) => r.applies).length === 0 && <span style={{ fontSize: 12, color: "#94a3b8" }}>해당 레벨 적용 규칙 없음</span>}
              </Space>
            </Card>

            <Card size="small" title="④ Topology (L0 → L5)">
              <TopologyDiagram feature={edit} />
            </Card>

            <Card size="small" title="⑤ Registration Output">
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="FeatureLevel">{editLevel}</Descriptions.Item>
                <Descriptions.Item label="ParentFeatureID">{editParent ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="FeatureType">{form.getFieldValue("featureType")}</Descriptions.Item>
                <Descriptions.Item label="Lifecycle">{edit.status}</Descriptions.Item>
                <Descriptions.Item label="LevelRuleStatus">{ruleCheck.status}</Descriptions.Item>
                <Descriptions.Item label="TraceabilityRoot">{edit.traceabilityRoot ?? edit.id}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Space>
        )}
      </Drawer>
    </div>
  );
}
