// Design tokens — 시트 39 기반을 "Mission Control" 비주얼로 확장. antd v5 theme로 매핑.
import type { ThemeConfig } from "antd";

export const tokens = {
  color: {
    ink: "#0a1f44",
    primaryNavy: "#1f4e78",
    primaryDark: "#122e5a",
    cyan: "#06b6d4",
    cyanBright: "#22d3ee",
    indigo: "#6366f1",
    surfaceBase: "#ffffff",
    surfaceSubtle: "#f3f6fb",
    border: "#d8e2ee",
  },
  status: {
    pass: "#15803d",
    pending: "#b45309",
    block: "#b91c1c",
    rework: "#475569",
  },
  gradient: {
    chrome: "linear-gradient(165deg,#0a1f44 0%,#0b2350 45%,#122e5a 100%)",
    cyan: "linear-gradient(135deg,#0891b2 0%,#22d3ee 100%)",
    violet: "linear-gradient(135deg,#4f46e5 0%,#7c83f7 100%)",
    emerald: "linear-gradient(135deg,#047857 0%,#34d399 100%)",
    amber: "linear-gradient(135deg,#b45309 0%,#f59e0b 100%)",
    crimson: "linear-gradient(135deg,#991b1b 0%,#f43f5e 100%)",
  },
  font: {
    display: '"Space Grotesk","IBM Plex Sans",sans-serif',
    body: '"IBM Plex Sans",system-ui,sans-serif',
    mono: '"IBM Plex Mono",ui-monospace,monospace',
  },
  radius: { card: 14, control: 10 },
  layout: { contentMaxWidth: 1480 },
} as const;

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: tokens.color.primaryNavy,
    colorInfo: tokens.color.cyan,
    colorSuccess: tokens.status.pass,
    colorWarning: tokens.status.pending,
    colorError: tokens.status.block,
    colorBorder: tokens.color.border,
    colorBgLayout: "transparent",
    fontFamily: tokens.font.body,
    fontSize: 14,
    borderRadius: tokens.radius.control,
    borderRadiusLG: tokens.radius.card,
    boxShadow: "0 1px 2px rgba(10,31,68,0.06), 0 8px 24px -12px rgba(10,31,68,0.18)",
  },
  components: {
    Layout: { headerBg: "transparent", siderBg: "transparent", bodyBg: "transparent" },
    Menu: { darkItemBg: "transparent", darkItemSelectedBg: "transparent", darkItemColor: "rgba(255,255,255,0.78)", darkItemSelectedColor: "#ffffff", darkItemHoverColor: "#ffffff" },
    Card: { borderRadiusLG: tokens.radius.card },
    Table: { headerBg: tokens.color.surfaceSubtle, borderColor: tokens.color.border, rowHoverBg: "#eef5fc" },
    Statistic: { contentFontSize: 26 },
    Segmented: { itemSelectedBg: tokens.color.primaryNavy, itemSelectedColor: "#fff" },
  },
};
