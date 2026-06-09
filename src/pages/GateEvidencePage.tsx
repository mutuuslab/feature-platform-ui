// UI-036 Gate Evidence Review Board (시트 38 CMP-008). Evidence 업로드/검토(Accept/Rework).
import { useMemo, useState } from "react";
import { Alert, Button, Card, Form, Input, Select, Space, Table, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { store, useList, useMutate } from "../data/useStore";
import type { Evidence, Feature, GateCode } from "../domain/types";
import { GATES } from "../domain/codeMaster";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { StatusBadge } from "../components/StatusBadge";
import { useRole } from "../auth/RoleContext";
import { can } from "../auth/rbac";

export function GateEvidencePage() {
  const features = useList<Feature>("features");
  const allEvidence = useList<Evidence>("evidence");
  const mutate = useMutate();
  const { role, userName } = useRole();
  const [featureId, setFeatureId] = useState<string | undefined>(features[0]?.id);
  const [form] = Form.useForm();

  const canUpload = can(role, "evidence.upload");
  const canReview = can(role, "evidence.review");
  const evidence = useMemo(() => allEvidence.filter((e) => e.featureId === featureId), [allEvidence, featureId]);

  const add = (v: { gateCode: GateCode; type: string; fileName: string }) => {
    if (!featureId) return;
    mutate(() => {
      const ev = store.create<Evidence>("evidence", {
        featureId,
        gateCode: v.gateCode,
        type: v.type,
        fileName: v.fileName,
        version: "v1",
        status: "SUBMITTED",
        submittedBy: userName,
        submittedAt: new Date().toISOString(),
      } as Evidence);
      store.audit({ actor: userName, action: "EVIDENCE_UPLOAD", objectType: "Evidence", objectId: ev.id, after: "SUBMITTED" });
    });
    form.resetFields();
    message.success("Evidence 제출됨 (SUBMITTED)");
  };

  const review = (e: Evidence, status: Evidence["status"]) => {
    mutate(() => {
      store.update<Evidence>("evidence", e.id, { status });
      store.audit({ actor: userName, action: `EVIDENCE_${status}`, objectType: "Evidence", objectId: e.id, before: e.status, after: status });
    });
  };

  return (
    <div>
      <PageHeader title="Gate Evidence Management" subtitle="UI-036 · Evidence 업로드 / 검토 (RG5/RG6/RG7)" icon="📎" />
      <DataQualityBanner />
      <Space style={{ marginBottom: 16 }}>
        <span>Feature:</span>
        <Select style={{ width: 320 }} value={featureId} onChange={setFeatureId} options={features.map((f) => ({ value: f.id, label: `${f.id} · ${f.name}` }))} />
      </Space>

      {canUpload && (
        <Card size="small" title="Evidence Upload (CMP-008)" style={{ marginBottom: 16 }}>
          <Form form={form} layout="inline" onFinish={add}>
            <Form.Item name="gateCode" rules={[{ required: true, message: "Gate 선택" }]}>
              <Select placeholder="Gate" style={{ width: 120 }} options={GATES.map((g) => ({ value: g.code, label: g.code }))} />
            </Form.Item>
            <Form.Item name="type" rules={[{ required: true, message: "유형 필수" }]}>
              <Input placeholder="Evidence Type (예: HIL Report)" style={{ width: 220 }} />
            </Form.Item>
            <Form.Item name="fileName" rules={[{ required: true, message: "파일명 필수" }]}>
              <Input placeholder="파일명 (mock)" style={{ width: 200 }} />
            </Form.Item>
            <Button type="primary" htmlType="submit" icon={<UploadOutlined />}>제출</Button>
          </Form>
        </Card>
      )}
      {!canUpload && !canReview && <Alert type="info" showIcon style={{ marginBottom: 16 }} message="조회 전용 — 업로드는 SW Owner/Supplier, 검토는 SW Owner/System/Quality 역할이 가능합니다." />}

      <Card>
        <Table<Evidence>
          rowKey="id"
          dataSource={evidence}
          pagination={false}
          columns={[
            { title: "Evidence ID", dataIndex: "id" },
            { title: "Gate", dataIndex: "gateCode" },
            { title: "Type", dataIndex: "type" },
            { title: "File", dataIndex: "fileName" },
            { title: "Version", dataIndex: "version" },
            { title: "Submitted By", dataIndex: "submittedBy" },
            { title: "Status", dataIndex: "status", render: (s) => <StatusBadge value={s} /> },
            {
              title: "Review",
              render: (_, e) =>
                canReview ? (
                  <Space>
                    <Button size="small" type="primary" disabled={e.status === "ACCEPTED"} onClick={() => review(e, "ACCEPTED")}>Accept</Button>
                    <Button size="small" danger disabled={e.status === "REWORK"} onClick={() => review(e, "REWORK")}>Rework</Button>
                  </Space>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
