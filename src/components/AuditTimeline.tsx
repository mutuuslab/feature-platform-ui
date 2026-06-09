// CMP-011 Audit Timeline — actor/action/object/before→after (시트 38, 48 NFR-007). Read-only.
import { Empty, Timeline, Typography } from "antd";
import type { AuditLog } from "../domain/types";

const { Text } = Typography;

export function AuditTimeline({ logs }: { logs: AuditLog[] }) {
  if (!logs.length) return <Empty description="감사 이력 없음" />;
  return (
    <Timeline
      items={logs.map((l) => ({
        color: l.action.includes("REJECT") || l.action.includes("BLOCK") ? "red" : "#1F4E78",
        children: (
          <div>
            <Text strong>{l.action}</Text> · <Text>{l.objectType} {l.objectId}</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {new Date(l.timestamp).toLocaleString()} · {l.actor}
              {l.before != null && (
                <>
                  {" "}
                  · {l.before} → {l.after}
                </>
              )}
            </Text>
            {l.reason && (
              <>
                <br />
                <Text italic style={{ fontSize: 12 }}>
                  “{l.reason}”
                </Text>
              </>
            )}
          </div>
        ),
      }))}
    />
  );
}
