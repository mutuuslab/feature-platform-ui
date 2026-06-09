// 9 Gate 파이프라인 레일 + Lifecycle 펑넬 — 빛나는 노드 시각화
import { Tooltip } from "antd";
import type { Gate, GateStatus, LifecycleStatus } from "../../domain/types";
import { GATES, LIFECYCLE_SEQUENCE, gateStatusColor } from "../../domain/codeMaster";

function statusGlow(s: GateStatus): string {
  const c = gateStatusColor(s);
  return s === "NOT_STARTED" ? "none" : `0 0 12px ${c}aa`;
}

/** 9개 게이트를 연결된 레일 위 노드로 표시 (RG1→RG9) */
export function GatePipeline({ gates, onPick, compact }: { gates: Gate[]; onPick?: (code: string) => void; compact?: boolean }) {
  const byCode = new Map(gates.map((g) => [g.gateCode, g]));
  const node = compact ? 22 : 34;
  return (
    <div style={{ position: "relative", padding: compact ? "4px 2px" : "20px 8px 8px" }}>
      <div style={{ position: "absolute", left: compact ? 12 : 24, right: compact ? 12 : 24, top: compact ? "50%" : 38, height: 3, background: "linear-gradient(90deg,#cbd5e1,#e2e8f0)", borderRadius: 3 }} />
      <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
        {GATES.map((meta) => {
          const g = byCode.get(meta.code);
          const status = (g?.status ?? "NOT_STARTED") as GateStatus;
          const color = gateStatusColor(status);
          const done = status === "PASS" || status === "CONDITIONAL";
          return (
            <Tooltip key={meta.code} title={`${meta.code} · ${meta.name} — ${status.replace("_", " ")}`}>
              <div
                onClick={() => onPick?.(meta.code)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: onPick ? "pointer" : "default", flex: 1 }}
              >
                <div
                  className={status === "PENDING" ? "fp-pulse" : ""}
                  style={{
                    width: node,
                    height: node,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    fontSize: compact ? 9 : 11,
                    fontWeight: 700,
                    fontFamily: '"IBM Plex Mono",monospace',
                    color: status === "NOT_STARTED" ? "#94a3b8" : "#fff",
                    background: status === "NOT_STARTED" ? "#f1f5f9" : color,
                    border: status === "NOT_STARTED" ? "2px solid #e2e8f0" : `2px solid ${color}`,
                    boxShadow: statusGlow(status),
                    transition: "all 0.3s ease",
                  }}
                >
                  {done ? "✓" : meta.code.replace("RG", "")}
                </div>
                {!compact && <span style={{ fontSize: 10, color: "#64748b", textAlign: "center", maxWidth: 64, lineHeight: 1.2 }}>{meta.name.replace(" Gate", "").replace(" / ", "/")}</span>}
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

/** Lifecycle 7단계 펑넬 — 현재 단계 강조 */
export function LifecyclePipeline({ current, compact }: { current: LifecycleStatus; compact?: boolean }) {
  const idx = LIFECYCLE_SEQUENCE.indexOf(current);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: compact ? "nowrap" : "wrap" }}>
      {LIFECYCLE_SEQUENCE.map((s, i) => {
        const isPast = i < idx;
        const isCurrent = i === idx;
        const bg = isCurrent
          ? "linear-gradient(135deg,#0891b2,#22d3ee)"
          : isPast
            ? "#1f4e78"
            : "#eef2f8";
        const color = isCurrent || isPast ? "#fff" : "#94a3b8";
        return (
          <div
            key={s}
            style={{
              position: "relative",
              flex: compact ? "none" : 1,
              minWidth: compact ? 0 : 92,
              padding: compact ? "5px 12px" : "8px 12px",
              clipPath: i === LIFECYCLE_SEQUENCE.length - 1 ? "none" : "polygon(0 0, calc(100% - 10px) 0, 100% 50%, calc(100% - 10px) 100%, 0 100%)",
              background: bg,
              color,
              fontSize: 12,
              fontWeight: isCurrent ? 700 : 500,
              textAlign: "center",
              borderRadius: 7,
              boxShadow: isCurrent ? "0 0 16px rgba(34,211,238,0.55)" : "none",
              transition: "all 0.3s ease",
              whiteSpace: "nowrap",
            }}
          >
            {s}
          </div>
        );
      })}
    </div>
  );
}
