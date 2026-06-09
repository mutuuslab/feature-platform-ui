// CMP-006 Owner Assignment Panel — Product/System/SW/Release/Operation Owner 지정 (시트 38).
// Product Owner는 등록 승인 전 필수 (시트 41 step5).
import { Card, Select, Space, Tag, Typography } from "antd";
import type { OwnerRoleKey, Owners } from "../domain/types";

const { Text } = Typography;

const OWNER_FIELDS: { key: OwnerRoleKey; label: string; required?: boolean }[] = [
  { key: "productOwner", label: "Product Owner", required: true },
  { key: "systemOwner", label: "System Owner" },
  { key: "swOwner", label: "SW Owner" },
  { key: "releaseOwner", label: "Release Owner" },
  { key: "operationOwner", label: "Operation Owner" },
];

const CANDIDATES = ["P. Product", "S. System", "W. Software", "R. Release", "O. Operations", "A. Architect", "Q. Quality"];

export function OwnerAssignmentPanel({
  owners,
  editable,
  onChange,
}: {
  owners: Owners;
  editable?: boolean;
  onChange?: (key: OwnerRoleKey, value: string) => void;
}) {
  return (
    <Card size="small" title="Owner Assignment">
      <Space direction="vertical" style={{ width: "100%" }}>
        {OWNER_FIELDS.map((f) => (
          <Space key={f.key} style={{ justifyContent: "space-between", width: "100%" }}>
            <Text>
              {f.label}
              {f.required && <Text type="danger"> *</Text>}
            </Text>
            {editable ? (
              <Select
                style={{ width: 200 }}
                placeholder="지정"
                allowClear
                value={owners[f.key]}
                options={CANDIDATES.map((c) => ({ value: c, label: c }))}
                onChange={(v) => onChange?.(f.key, v)}
                status={f.required && !owners[f.key] ? "error" : undefined}
              />
            ) : owners[f.key] ? (
              <Tag color="#1F4E78">{owners[f.key]}</Tag>
            ) : (
              <Text type="secondary">미지정</Text>
            )}
          </Space>
        ))}
      </Space>
    </Card>
  );
}

export function hasRequiredOwners(owners: Owners): boolean {
  return Boolean(owners.productOwner);
}
