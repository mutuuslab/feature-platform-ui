// CMP-002 Status Badge — 시트 36/39. 색 + 텍스트 라벨 병기(색만으로 구분 금지).
import { Tag } from "antd";
import type { GateStatus, LifecycleStatus, ProductionDecision } from "../domain/types";
import { decisionColor, gateStatusColor, lifecycleColor } from "../domain/codeMaster";

export function GateBadge({ status }: { status: GateStatus }) {
  return (
    <Tag color={gateStatusColor(status)} style={{ fontWeight: 600 }}>
      {status.replace("_", " ")}
    </Tag>
  );
}

export function DecisionBadge({ decision }: { decision: ProductionDecision }) {
  return (
    <Tag color={decisionColor(decision)} style={{ fontWeight: 700, fontSize: 13 }}>
      {decision}
    </Tag>
  );
}

export function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  return <Tag color={lifecycleColor(status)}>{status}</Tag>;
}

const GENERIC_COLORS: Record<string, string> = {
  PASS: "#2E7D32",
  ACCEPTED: "#2E7D32",
  GO: "#2E7D32",
  REGISTERED: "#2E7D32",
  SUBMITTED: "#1F4E78",
  PENDING: "#7A5C00",
  UNDER_REVIEW: "#7A5C00",
  CONDITIONAL: "#7A5C00",
  HOLD: "#7A5C00",
  DRAFT: "#4B5563",
  REWORK: "#4B5563",
  REWORK_REQUESTED: "#4B5563",
  MERGED: "#6D28D9",
  BACKLOG: "#7A5C00",
  ESCALATED: "#9A3412",
  BLOCK: "#9A3412",
  REJECTED: "#9A3412",
};

export function StatusBadge({ value }: { value: string }) {
  return <Tag color={GENERIC_COLORS[value] ?? "#4B5563"}>{value.replace(/_/g, " ")}</Tag>;
}
