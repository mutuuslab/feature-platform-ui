// UI-001 Feature Request Submission Form (시트 41 step1~2, 21 검증). Requester만 작성/제출 (RBAC).
import { useState } from "react";
import { Alert, Button, Card, Form, Input, Result, Select, Space } from "antd";
import { Link } from "react-router";
import { store, useMutate } from "../data/useStore";
import type { FeatureRequest } from "../domain/types";
import { DataQualityBanner, PageHeader } from "../components/Common";
import { useRole } from "../auth/RoleContext";
import { can } from "../auth/rbac";

export function FeatureRequestPage() {
  const [form] = Form.useForm();
  const mutate = useMutate();
  const { role, userName } = useRole();
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const allowed = can(role, "request.create");

  const onFinish = (values: Omit<FeatureRequest, "id" | "status" | "requester" | "createdAt">) => {
    const created = mutate(() => {
      const req = store.create<FeatureRequest>("featureRequests", {
        ...values,
        requester: userName,
        status: "SUBMITTED",
        completeness: "PASS",
        createdAt: new Date().toISOString(),
      } as FeatureRequest);
      store.audit({ actor: userName, action: "SUBMIT_REQUEST", objectType: "FeatureRequest", objectId: req.id, after: "SUBMITTED" });
      return req;
    });
    setSubmittedId(created.id);
  };

  const saveDraft = () => {
    const values = form.getFieldsValue();
    if (!values.name) return;
    mutate(() => {
      store.create<FeatureRequest>("featureRequests", {
        ...values,
        requester: userName,
        status: "DRAFT",
        createdAt: new Date().toISOString(),
      } as FeatureRequest);
    });
    form.resetFields();
  };

  if (submittedId) {
    return (
      <Result
        status="success"
        title={`Feature Request 제출 완료 (${submittedId})`}
        subTitle="상태가 DRAFT → SUBMITTED 로 전이되었습니다. PMO가 Intake Review Board에서 검토합니다."
        extra={[
          <Link key="intake" to="/intake"><Button type="primary">Intake Review Board로</Button></Link>,
          <Button key="again" onClick={() => { setSubmittedId(null); form.resetFields(); }}>새 요청 작성</Button>,
        ]}
      />
    );
  }

  return (
    <div>
      <PageHeader title="Feature Request" subtitle="UI-001 · 신규/변경 Feature 요청 접수" icon="📝" />
      <DataQualityBanner />
      {!allowed && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="현재 역할에는 작성 권한이 없습니다 (시트 23 RBAC-001)."
          description="상단에서 'Feature Requester' 또는 'Admin' 역할로 전환하면 작성할 수 있습니다."
        />
      )}
      <Card style={{ maxWidth: 720 }}>
        <Form form={form} layout="vertical" onFinish={onFinish} disabled={!allowed} initialValues={{ deployType: "Binary OTA" }}>
          <Form.Item name="name" label="Feature Name" rules={[{ required: true, message: "Feature 이름은 필수입니다." }]}>
            <Input placeholder="예: Remote Parking Assist" />
          </Form.Item>
          <Form.Item name="businessNeed" label="Business Need" rules={[{ required: true, message: "비즈니스 필요성은 필수입니다." }]}>
            <Input.TextArea rows={3} placeholder="고객가치 / 도입 배경" />
          </Form.Item>
          <Space size={16} style={{ display: "flex" }}>
            <Form.Item name="targetRegion" label="Target Region" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="예: KR, EU" />
            </Form.Item>
            <Form.Item name="targetTrim" label="Target Trim" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="예: Premium" />
            </Form.Item>
            <Form.Item name="deployType" label="Deploy Type" style={{ flex: 1 }}>
              <Select options={["Binary OTA", "Policy-only", "Hybrid"].map((v) => ({ value: v, label: v }))} />
            </Form.Item>
          </Space>
          <Form.Item name="expectedValue" label="Expected Value">
            <Input placeholder="기대 효과 / KPI" />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">Submit Request</Button>
            <Button onClick={saveDraft}>Save Draft</Button>
            <Button onClick={() => form.resetFields()} type="text">Reset</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
