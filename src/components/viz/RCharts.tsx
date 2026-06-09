// recharts 기반 고급 차트 래퍼 — 일관된 톤/반응형. (시트 06 KPI, 61 KPI Dashboard Spec)
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AXIS = { fontSize: 11, fill: "#64748b" };
const tooltipStyle = { borderRadius: 10, border: "1px solid #d8e2ee", fontSize: 12, fontFamily: "IBM Plex Mono, monospace" };

export function TrendArea({ data, xKey, dataKey, color = "#06b6d4", height = 220, unit = "" }: { data: Record<string, unknown>[]; xKey: string; dataKey: string; color?: string; height?: number; unit?: string }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={`ta-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} unit={unit} width={44} />
        <Tooltip contentStyle={tooltipStyle} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#ta-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function KpiMultiLine({ data, xKey, series, height = 240 }: { data: Record<string, unknown>[]; xKey: string; series: { key: string; color: string; name: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function StackedBars({ data, xKey, keys, height = 240, onBarClick }: { data: Record<string, unknown>[]; xKey: string; keys: { key: string; color: string; name: string }[]; height?: number; onBarClick?: (key: string, payload: Record<string, unknown>) => void }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <XAxis dataKey={xKey} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={44} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {keys.map((k) => (
          <Bar
            key={k.key}
            dataKey={k.key}
            name={k.name}
            stackId="a"
            fill={k.color}
            radius={k === keys[keys.length - 1] ? [4, 4, 0, 0] : undefined}
            cursor={onBarClick ? "pointer" : undefined}
            onClick={onBarClick ? (d: { payload?: Record<string, unknown> }) => onBarClick(k.key, d?.payload ?? {}) : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WaveBars({ data, height = 240 }: { data: { wave: string; vehicles: number; color: string }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 12, left: 6, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f8" vertical={false} />
        <XAxis dataKey="wave" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={58} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toLocaleString()} 대`, "Vehicles"]} />
        <Bar dataKey="vehicles" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CompositionPie({ data, height = 220, onSlice }: { data: { name: string; value: number; color: string }[]; height?: number; onSlice?: (name: string) => void }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={52}
          outerRadius={82}
          paddingAngle={2}
          stroke="none"
          onClick={onSlice ? (d: { name?: string }) => d?.name && onSlice(d.name) : undefined}
          style={onSlice ? { cursor: "pointer" } : undefined}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RadialProgress({ value, color = "#06b6d4", label, height = 200 }: { value: number; color?: string; label?: string; height?: number }) {
  const data = [{ name: "v", value: Math.max(0, Math.min(100, value)), fill: color }];
  return (
    <div style={{ position: "relative", height }}>
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart innerRadius="72%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "#eef2f8" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div className="fp-display" style={{ fontSize: 30, fontWeight: 700, color: "#0a1f44", lineHeight: 1 }}>{Math.round(value)}%</div>
          {label && <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>{label}</div>}
        </div>
      </div>
    </div>
  );
}
