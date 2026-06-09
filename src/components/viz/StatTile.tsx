// 그라디언트 스탯 타일 — 아이콘 + 큰 수치 + 델타 + 선택적 스파크라인
import type { ReactNode } from "react";
import { Sparkline } from "./Charts";

const GRADIENTS: Record<string, string> = {
  chrome: "linear-gradient(135deg,#0a1f44,#1b3e76)",
  cyan: "linear-gradient(135deg,#0891b2,#22d3ee)",
  violet: "linear-gradient(135deg,#4f46e5,#7c83f7)",
  emerald: "linear-gradient(135deg,#047857,#34d399)",
  amber: "linear-gradient(135deg,#b45309,#f59e0b)",
  crimson: "linear-gradient(135deg,#991b1b,#f43f5e)",
};

export function StatTile({
  icon,
  label,
  value,
  suffix,
  delta,
  variant = "chrome",
  spark,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  suffix?: string;
  delta?: string;
  variant?: keyof typeof GRADIENTS;
  spark?: number[];
  className?: string;
}) {
  return (
    <div className={`fp-tile ${className ?? ""}`} style={{ background: GRADIENTS[variant] }}>
      <div className="fp-tile-glow" />
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 16 }}>{icon}</span>
            {label}
          </div>
          <div className="fp-display" style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }}>
            {value}
            {suffix && <span style={{ fontSize: 16, opacity: 0.8, marginLeft: 4 }}>{suffix}</span>}
          </div>
          {delta && <div style={{ fontSize: 12, opacity: 0.85, marginTop: 8 }}>{delta}</div>}
        </div>
        {spark && (
          <div style={{ alignSelf: "flex-end", opacity: 0.9 }}>
            <Sparkline data={spark} color="#ffffff" width={92} height={34} />
          </div>
        )}
      </div>
    </div>
  );
}
