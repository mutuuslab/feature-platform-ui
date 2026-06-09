// UI-029 Supplier Portal / Evidence Submission (시트 38 CMP-009, 33).
// 협력사 격리(NFR-006): Supplier 역할은 자신에게 배정된 Work Package만 조회.
import { Alert, Button, Card, Space, Table, Tag, message } from "antd";
import { store, useList, useMutate } from "../data/useStore";
import type { SupplierWorkPackage } from "../domain/types";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { StatusBadge } from "../components/StatusBadge";
import { useRole } from "../auth/RoleContext";
import { can } from "../auth/rbac";

const DEMO_SUPPLIER = "Acme Supplier";

export function SupplierPortalPage() {
  const all = useList<SupplierWorkPackage>("supplierWorkPackages");
  const mutate = useMutate();
  const { role, userName } = useRole();

  const isSupplier = role === "Supplier";
  const canReview = can(role, "evidence.review"); // OEM (SW Owner/System/Quality) 검토
  // 협력사 격리: Supplier는 자기 WP만, OEM/PMO/Admin은 전체
  const rows = isSupplier ? all.filter((w) => w.supplier === DEMO_SUPPLIER) : all;

  const submitEvidence = (w: SupplierWorkPackage) => {
    mutate(() => {
      store.update<SupplierWorkPackage>("supplierWorkPackages", w.id, { evidenceStatus: "SUBMITTED", reviewStatus: "PENDING" });
      store.audit({ actor: userName, action: "SUPPLIER_EVIDENCE_SUBMIT", objectType: "SupplierWorkPackage", objectId: w.id, after: "SUBMITTED" });
    });
    message.success("Evidence 제출됨 — OEM Review 대기");
  };

  const oemReview = (w: SupplierWorkPackage, reviewStatus: SupplierWorkPackage["reviewStatus"]) => {
    mutate(() => {
      store.update<SupplierWorkPackage>("supplierWorkPackages", w.id, {
        reviewStatus,
        evidenceStatus: reviewStatus === "ACCEPTED" ? "ACCEPTED" : "REWORK",
      });
      store.audit({ actor: userName, action: `OEM_REVIEW_${reviewStatus}`, objectType: "SupplierWorkPackage", objectId: w.id, before: w.reviewStatus, after: reviewStatus });
    });
  };

  return (
    <div>
      <PageHeader title="Supplier Evidence Portal" subtitle="UI-029 · RG6 협력사 Work Package / Evidence" icon="🤝" />
      <DataQualityBanner />
      {isSupplier ? (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} message={`협력사 격리 적용 — '${DEMO_SUPPLIER}' 에 배정된 Work Package만 표시됩니다 (NFR-006).`} />
      ) : (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="OEM 관점 — 전체 협력사 Work Package 조회. 'Supplier' 역할로 전환 시 격리가 적용됩니다." />
      )}
      <Card>
        <Table<SupplierWorkPackage>
          rowKey="id"
          dataSource={rows}
          pagination={false}
          columns={[
            { title: "WP ID", dataIndex: "id" },
            { title: "Feature", dataIndex: "featureId" },
            { title: "Supplier", dataIndex: "supplier", render: (v) => <Tag color="#1F4E78">{v}</Tag> },
            { title: "Work Package", dataIndex: "workPackage" },
            { title: "API Contract", dataIndex: "apiContract" },
            { title: "Evidence", dataIndex: "evidenceStatus", render: (s) => <StatusBadge value={s} /> },
            { title: "OEM Review", dataIndex: "reviewStatus", render: (s) => <StatusBadge value={s} /> },
            { title: "Due", dataIndex: "dueDate" },
            {
              title: "Action",
              render: (_, w) => (
                <Space>
                  {isSupplier && <Button size="small" onClick={() => submitEvidence(w)}>Evidence 제출</Button>}
                  {canReview && (
                    <>
                      <Button size="small" type="primary" onClick={() => oemReview(w, "ACCEPTED")}>Accept</Button>
                      <Button size="small" danger onClick={() => oemReview(w, "REWORK")}>Rework</Button>
                    </>
                  )}
                  {!isSupplier && !canReview && "—"}
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
