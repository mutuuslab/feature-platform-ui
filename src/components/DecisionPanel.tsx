// CMP-007 Decision Panel — Approve/Rework/Reject/Merge/Backlog/Escalate (시트 36/38).
// 비승인 결정 시 사유 필수 (시트 23 RBAC-005). 모든 결정은 audit 이벤트 생성.
import { useState } from "react";
import { Button, Input, Space, message } from "antd";

export type DecisionType = "APPROVE" | "REWORK" | "REJECT" | "MERGE" | "BACKLOG" | "ESCALATE";

const REASON_REQUIRED: DecisionType[] = ["REWORK", "REJECT", "ESCALATE"];

const BTN: Record<DecisionType, { label: string; danger?: boolean; primary?: boolean }> = {
  APPROVE: { label: "Approve", primary: true },
  REWORK: { label: "Rework" },
  REJECT: { label: "Reject", danger: true },
  MERGE: { label: "Merge" },
  BACKLOG: { label: "Backlog" },
  ESCALATE: { label: "Escalate", danger: true },
};

export function DecisionPanel({
  decisions,
  disabled,
  disabledReason,
  onDecide,
}: {
  decisions: DecisionType[];
  disabled?: boolean;
  disabledReason?: string;
  onDecide: (decision: DecisionType, reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");

  const handle = async (d: DecisionType) => {
    if (REASON_REQUIRED.includes(d) && !reason.trim()) {
      message.warning(`${BTN[d].label} 결정에는 사유 입력이 필요합니다.`);
      return;
    }
    await onDecide(d, reason.trim());
    setReason("");
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <Input.TextArea
        placeholder="결정 사유 / 코멘트 (Rework·Reject·Escalate 시 필수)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        disabled={disabled}
      />
      <Space wrap>
        {decisions.map((d) => (
          <Button
            key={d}
            type={BTN[d].primary ? "primary" : "default"}
            danger={BTN[d].danger}
            disabled={disabled}
            onClick={() => handle(d)}
          >
            {BTN[d].label}
          </Button>
        ))}
      </Space>
      {disabled && disabledReason && (
        <span style={{ color: "#9A3412", fontSize: 12 }}>⚠ {disabledReason}</span>
      )}
    </Space>
  );
}
