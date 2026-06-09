// 커스텀 SVG 데이터 시각화 — RadialGauge / Donut / Sparkline / BarRow
import { useEffect, useState } from "react";

/** 원형 게이지 — 게이트 준비율, KPI 등 (0~100) */
export function RadialGauge({
  value,
  size = 132,
  stroke = 12,
  label,
  sublabel,
  color = "#06b6d4",
  track = "#e2e8f0",
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  track?: string;
}) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setV(Math.max(0, Math.min(100, value))), 60);
    return () => clearTimeout(t);
  }, [value]);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (v / 100) * c;
  const gid = `gg-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.7} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.2,0.7,0.2,1)", filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div className="fp-display" style={{ fontSize: size * 0.26, fontWeight: 700, color: "var(--fp-ink)", lineHeight: 1 }}>
            {label ?? `${Math.round(v)}%`}
          </div>
          {sublabel && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{sublabel}</div>}
        </div>
      </div>
    </div>
  );
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** 도넛 차트 — 포트폴리오 분포 */
export function Donut({ data, size = 160, stroke = 26 }: { data: DonutSlice[]; size?: number; stroke?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f8" strokeWidth={stroke} />
        {data.map((d) => {
          const len = (d.value / total) * c;
          const seg = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-acc}
              style={{ transition: "stroke-dasharray 0.8s ease" }}
            />
          );
          acc += len;
          return seg;
        })}
      </svg>
      <div>
        {data.map((d) => (
          <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, display: "inline-block" }} />
            <span style={{ color: "#475569", flex: 1 }}>{d.label}</span>
            <span className="fp-mono" style={{ fontWeight: 600, color: "var(--fp-ink)" }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 스파크라인 — 추세 미니차트 */
export function Sparkline({ data, width = 120, height = 36, color = "#06b6d4" }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((d, i) => [(i / (data.length - 1)) * width, height - ((d - min) / span) * (height - 6) - 3]);
  const line = pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  const gid = `sp-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3} fill={color} />
    </svg>
  );
}

/** 가로 막대 한 줄 */
export function BarRow({ label, value, max, color = "#1f4e78", suffix = "" }: { label: string; value: number; max: number; color?: string; suffix?: string }) {
  const pct = Math.min(100, (value / (max || 1)) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: "#475569" }}>{label}</span>
        <span className="fp-mono" style={{ fontWeight: 600, color: "var(--fp-ink)" }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 8, borderRadius: 8, background: "#eef2f8", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", borderRadius: 8, background: color, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
}
