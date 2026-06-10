// 역할 기반 네비게이션 — 도메인 그룹 + RoleId별 가시성 (시트 23 RBAC, Owner 책임 기반).
import type { ReactNode } from "react";
import {
  AimOutlined,
  ApartmentOutlined,
  ApiOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BankOutlined,
  CarOutlined,
  FlagOutlined,
  RadarChartOutlined,
  RocketOutlined,
  CheckSquareOutlined,
  CloudUploadOutlined,
  ControlOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DeploymentUnitOutlined,
  DollarOutlined,
  ExperimentOutlined,
  FileAddOutlined,
  FundProjectionScreenOutlined,
  InboxOutlined,
  LineChartOutlined,
  NodeIndexOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type { RoleId } from "./rbac";

export interface NavItem {
  key: string; // route path
  label: string;
  icon: ReactNode;
  roles: RoleId[] | "all";
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

const ALL: RoleId[] | "all" = "all";

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "overview",
    label: "Overview",
    items: [
      { key: "/", label: "Control Tower", icon: <DashboardOutlined />, roles: ALL },
      { key: "/fleet", label: "Fleet Control", icon: <CarOutlined />, roles: ["PMO", "Admin", "ReleaseOwner", "OperationOwner"] },
      { key: "/rollout-board", label: "Multi-Feature Rollout", icon: <RadarChartOutlined />, roles: ["PMO", "Admin", "ReleaseOwner", "OperationOwner"] },
    ],
  },
  {
    key: "intake",
    label: "Intake & Registry",
    items: [
      { key: "/requests/new", label: "Feature Request", icon: <FileAddOutlined />, roles: ["Requester", "PMO", "Admin"] },
      { key: "/intake", label: "Intake Review", icon: <InboxOutlined />, roles: ["PMO", "ProductOwner", "Admin"] },
      { key: "/features", label: "Feature Registry", icon: <AppstoreOutlined />, roles: ALL },
      { key: "/lifecycle", label: "Lifecycle", icon: <NodeIndexOutlined />, roles: ["PMO", "ProductOwner", "SystemOwner", "ReleaseOwner", "OperationOwner", "Admin"] },
    ],
  },
  {
    key: "definition",
    label: "Definition",
    items: [
      { key: "/product", label: "Product & Scope", icon: <DollarOutlined />, roles: ["ProductOwner", "PMO", "Admin"] },
      { key: "/requirements", label: "Requirements & System", icon: <ApartmentOutlined />, roles: ["SystemOwner", "PMO", "Admin"] },
      { key: "/targeting", label: "Feature Targeting & Eligibility", icon: <AimOutlined />, roles: ["SystemOwner", "ProductOwner", "ReleaseOwner", "OperationOwner", "PMO", "Admin"] },
      { key: "/flags", label: "Feature Flags (Unleash)", icon: <RadarChartOutlined />, roles: ["SystemOwner", "ReleaseOwner", "OperationOwner", "PMO", "Admin"] },
      { key: "/safety", label: "Safety & Security", icon: <SafetyCertificateOutlined />, roles: ["SystemOwner", "Quality", "PMO", "Admin"] },
      { key: "/sw-api", label: "SW & API", icon: <DeploymentUnitOutlined />, roles: ["SWOwner", "SystemOwner", "PMO", "Admin"] },
      { key: "/control", label: "Control & Runtime", icon: <ControlOutlined />, roles: ["SystemOwner", "ReleaseOwner", "PMO", "Admin"] },
      { key: "/architecture", label: "Engineering & Architecture", icon: <ApiOutlined />, roles: ["SWOwner", "SystemOwner", "PMO", "Admin"] },
    ],
  },
  {
    key: "quality",
    label: "Quality & Gates",
    items: [
      { key: "/gates", label: "9 Gate Tracker", icon: <CheckSquareOutlined />, roles: ["PMO", "ProductOwner", "SystemOwner", "SWOwner", "ReleaseOwner", "OperationOwner", "Quality", "Admin"] },
      { key: "/evidence", label: "Gate Evidence", icon: <SafetyCertificateOutlined />, roles: ["SWOwner", "SystemOwner", "Quality", "PMO", "Admin"] },
      { key: "/verification", label: "Verification", icon: <ExperimentOutlined />, roles: ["SWOwner", "Quality", "PMO", "Admin"] },
      { key: "/traceability", label: "Traceability", icon: <ApartmentOutlined />, roles: ["PMO", "SystemOwner", "SWOwner", "Quality", "ProductOwner", "Admin"] },
      { key: "/supplier", label: "Supplier Portal", icon: <CloudUploadOutlined />, roles: ["Supplier", "SWOwner", "PMO", "Admin"] },
    ],
  },
  {
    key: "release",
    label: "Release & Operations",
    items: [
      { key: "/release", label: "Release Readiness", icon: <DeploymentUnitOutlined />, roles: ["ReleaseOwner", "PMO", "Admin"] },
      { key: "/ota", label: "Release & OTA", icon: <CloudUploadOutlined />, roles: ["ReleaseOwner", "PMO", "Admin"] },
      { key: "/operations", label: "Operations / KPI", icon: <TeamOutlined />, roles: ["OperationOwner", "ProductOwner", "PMO", "Admin"] },
      { key: "/kpi", label: "KPI Command", icon: <LineChartOutlined />, roles: ["OperationOwner", "ProductOwner", "PMO", "ReleaseOwner", "Admin"] },
      { key: "/ops-control", label: "Operations Control", icon: <ControlOutlined />, roles: ["OperationOwner", "ReleaseOwner", "PMO", "Admin"] },
      { key: "/field", label: "Field Operations", icon: <ToolOutlined />, roles: ["OperationOwner", "Quality", "Supplier", "PMO", "Admin"] },
      { key: "/retirement", label: "Deprecation & Retirement", icon: <FundProjectionScreenOutlined />, roles: ["OperationOwner", "ProductOwner", "PMO", "Admin"] },
    ],
  },
  {
    key: "launch",
    label: "Launch & Adoption",
    items: [
      { key: "/launch", label: "Pilot · Migration · Hypercare", icon: <RocketOutlined />, roles: ["PMO", "Admin", "ReleaseOwner", "OperationOwner"] },
      { key: "/operating", label: "Operating Model & Adoption", icon: <BankOutlined />, roles: ["PMO", "Admin", "OperationOwner", "ProductOwner"] },
      { key: "/golive", label: "Go-live Decision", icon: <FlagOutlined />, roles: ["PMO", "Admin", "ReleaseOwner"] },
    ],
  },
  {
    key: "governance",
    label: "Governance",
    items: [
      { key: "/governance", label: "Governance & Data", icon: <DatabaseOutlined />, roles: ["PMO", "Admin"] },
      { key: "/admin", label: "RBAC / Admin", icon: <SettingOutlined />, roles: ["PMO", "Admin"] },
      { key: "/audit", label: "Audit Log", icon: <AuditOutlined />, roles: ALL },
    ],
  },
];

export function navForRole(role: RoleId): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => i.roles === "all" || i.roles.includes(role)),
  })).filter((g) => g.items.length > 0);
}

// 역할별 기본 랜딩 경로
export function landingForRole(role: RoleId): string {
  if (role === "Supplier") return "/supplier";
  if (role === "OperationOwner") return "/operations";
  return "/";
}
