// UI-053 Audit Log / Compliance Export (시트 48 NFR-007). Read-only, 필터/Export.
import { useMemo, useState } from "react";
import { Button, Card, Input, Select, Space, Table, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { useList } from "../data/useStore";
import type { AuditLog } from "../domain/types";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { useRole } from "../auth/RoleContext";
import { can } from "../auth/rbac";

export function AuditLogPage() {
  const logs = useList<AuditLog>("auditLogs");
  const { role } = useRole();
  const [q, setQ] = useState("");
  const [objType, setObjType] = useState<string | undefined>();

  const objectTypes = Array.from(new Set(logs.map((l) => l.objectType)));
  const rows = useMemo(
    () =>
      logs
        .filter((l) => (objType ? l.objectType === objType : true))
        .filter((l) => (q ? `${l.actor} ${l.action} ${l.objectId}`.toLowerCase().includes(q.toLowerCase()) : true)),
    [logs, q, objType],
  );

  const exportPkg = () => {
    if (!can(role, "audit.export")) {
      message.error("Export 권한 없음 — PMO/Quality/Admin 역할 필요 (RBAC-026).");
      return;
    }
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit-export.json";
    a.click();
    URL.revokeObjectURL(url);
    message.success(`Audit 패키지 Export 완료 (${rows.length}건)`);
  };

  return (
    <div>
      <PageHeader title="Audit Log View" subtitle="UI-053 · 모든 결정/변경/상태전이 추적 (Read-only)" icon="🧾" />
      <DataQualityBanner />
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input.Search placeholder="Actor / Action / Object 검색" allowClear style={{ width: 300 }} onChange={(e) => setQ(e.target.value)} />
          <Select placeholder="Object Type" allowClear style={{ width: 180 }} value={objType} onChange={setObjType} options={objectTypes.map((t) => ({ value: t, label: t }))} />
          <Button icon={<DownloadOutlined />} onClick={exportPkg} disabled={!can(role, "audit.export")}>Compliance Export</Button>
        </Space>
        <Table<AuditLog>
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: "Timestamp", dataIndex: "timestamp", render: (v) => new Date(v).toLocaleString(), sorter: (a, b) => a.timestamp.localeCompare(b.timestamp), defaultSortOrder: "descend" },
            { title: "Actor", dataIndex: "actor" },
            { title: "Action", dataIndex: "action" },
            { title: "Object", render: (_, l) => `${l.objectType} · ${l.objectId}` },
            { title: "Before → After", render: (_, l) => (l.before != null || l.after != null ? `${l.before ?? "—"} → ${l.after ?? "—"}` : "—") },
            { title: "Reason", dataIndex: "reason", render: (v) => v ?? "—" },
          ]}
        />
      </Card>
    </div>
  );
}
