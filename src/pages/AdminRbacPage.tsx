// UI-050 User/Role/Permission Admin — RBAC 매트릭스 시각화 (시트 23).
import { Card, Table, Tag, Tooltip } from "antd";
import { ROLES, can, type Capability, type RoleId } from "../auth/rbac";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { useRole } from "../auth/RoleContext";

const CAPS: { key: Capability; label: string }[] = [
  { key: "request.create", label: "Request 작성" },
  { key: "intake.decide", label: "Intake 결정" },
  { key: "owner.assign", label: "Owner 지정" },
  { key: "registry.edit", label: "Registry 수정" },
  { key: "gate.update", label: "Gate 변경" },
  { key: "evidence.upload", label: "Evidence 업로드" },
  { key: "evidence.review", label: "Evidence 검토" },
  { key: "supplier.access", label: "Supplier 접근" },
  { key: "release.approve", label: "Release 승인" },
  { key: "audit.export", label: "Audit Export" },
];

export function AdminRbacPage() {
  const { role: currentRole } = useRole();

  const dataSource = ROLES.map((r) => ({ key: r.id, role: r }));

  return (
    <div>
      <PageHeader title="RBAC / Admin" subtitle="UI-050 · Role 기반 권한 매트릭스 (시트 23). 현재 역할은 하이라이트됩니다." icon="🛡" />
      <DataQualityBanner />
      <Card className="fp-card-lift">
        <Table
          rowKey="key"
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: "max-content" }}
          rowClassName={(r) => ((r as { key: RoleId }).key === currentRole ? "ant-table-row-selected" : "")}
          columns={[
            {
              title: "Role",
              dataIndex: "role",
              fixed: "left",
              width: 200,
              render: (r) => (
                <span style={{ fontWeight: 600 }}>
                  {(r as (typeof ROLES)[number]).id === currentRole && <span className="fp-dot" style={{ background: "#22d3ee" }} />}
                  {(r as (typeof ROLES)[number]).label}
                </span>
              ),
            },
            ...CAPS.map((c) => ({
              title: <Tooltip title={c.key}><span style={{ fontSize: 12 }}>{c.label}</span></Tooltip>,
              key: c.key,
              align: "center" as const,
              render: (_: unknown, row: { key: RoleId }) =>
                can(row.key, c.key) ? (
                  <Tag color="#15803d" style={{ marginInline: 0 }}>✓</Tag>
                ) : (
                  <Tag color="default" style={{ marginInline: 0, opacity: 0.4 }}>—</Tag>
                ),
            })),
          ]}
        />
        <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
          ⓘ 데모에서는 클라이언트 가드입니다. 실제 운영은 서버사이드 인가가 필수입니다 (시트 48 NFR-005). Gate별 세부 권한은 9 Gate Tracker에서 역할 전환으로 확인하세요 (RBAC-019).
        </div>
      </Card>
    </div>
  );
}
