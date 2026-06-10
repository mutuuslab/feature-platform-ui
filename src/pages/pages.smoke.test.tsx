import { render, screen, waitFor } from "@testing-library/react";
import { App as AntdApp, ConfigProvider } from "antd";
import { BrowserRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { ReactNode } from "react";

import { RoleProvider } from "../auth/RoleContext";
import { antdTheme } from "../theme/tokens";

import { DashboardPage } from "./DashboardPage";
import { FeatureRequestPage } from "./FeatureRequestPage";
import { IntakeReviewPage } from "./IntakeReviewPage";
import { RegistryListPage } from "./RegistryListPage";
import { LifecycleDashboardPage } from "./LifecycleDashboardPage";
import { GateTrackerPage } from "./GateTrackerPage";
import { GateEvidencePage } from "./GateEvidencePage";
import { TraceabilityPage } from "./TraceabilityPage";
import { SupplierPortalPage } from "./SupplierPortalPage";
import { ReleaseReadinessPage } from "./ReleaseReadinessPage";
import { OperationsPage } from "./OperationsPage";
import { AuditLogPage } from "./AuditLogPage";
import { AdminRbacPage } from "./AdminRbacPage";
import { FleetControlPage } from "./FleetControlPage";
import { KpiCommandPage } from "./KpiCommandPage";
import { GoLiveDecisionPage } from "./GoLiveDecisionPage";
import { TargetingPage } from "./TargetingPage";
import { MultiRolloutPage } from "./MultiRolloutPage";
import { FlagConsolePage } from "./FlagConsolePage";
import {
  ProductScopePage,
  RequirementsPage,
  SafetySecurityPage,
  SwApiPage,
  ControlRuntimePage,
  VerificationPage,
  OtaPage,
  FieldOpsPage,
  RetirementPage,
  GovernanceDataPage,
  ArchitecturePage,
  LaunchAdoptionPage,
  OperatingModelPage,
  OpsControlPage,
} from "./workbenches";

function Harness({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <ConfigProvider theme={antdTheme}>
        <AntdApp>
          <RoleProvider>{children}</RoleProvider>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}

const PAGES: [string, () => React.JSX.Element, string][] = [
  ["Dashboard", DashboardPage, "Control Tower"],
  ["FeatureRequest", FeatureRequestPage, "Feature 신규 등록"],
  ["Intake", IntakeReviewPage, "Intake Review Board"],
  ["Registry", RegistryListPage, "Feature Registry"],
  ["Lifecycle", LifecycleDashboardPage, "Lifecycle Status Dashboard"],
  ["GateTracker", GateTrackerPage, "9 Gate Readiness Tracker"],
  ["GateEvidence", GateEvidencePage, "Gate Evidence Management"],
  ["Traceability", TraceabilityPage, "Traceability Matrix"],
  ["Supplier", SupplierPortalPage, "Supplier Evidence Portal"],
  ["Release", ReleaseReadinessPage, "Release Readiness Dashboard"],
  ["Operations", OperationsPage, "Operations / KPI Dashboard"],
  ["Audit", AuditLogPage, "Audit Log View"],
  ["AdminRbac", AdminRbacPage, "RBAC / Admin"],
  ["FleetControl", FleetControlPage, "Fleet Control Tower"],
  ["KpiCommand", KpiCommandPage, "KPI Command Center"],
  ["ProductScope", ProductScopePage, "Product & Scope"],
  ["Requirements", RequirementsPage, "Requirements & System"],
  ["SafetySecurity", SafetySecurityPage, "Safety & Security"],
  ["SwApi", SwApiPage, "SW & API"],
  ["ControlRuntime", ControlRuntimePage, "Control & Runtime"],
  ["Verification", VerificationPage, "Verification"],
  ["Ota", OtaPage, "Release & OTA"],
  ["FieldOps", FieldOpsPage, "Field Operations"],
  ["Retirement", RetirementPage, "Deprecation & Retirement"],
  ["GovernanceData", GovernanceDataPage, "Governance & Data"],
  ["Architecture", ArchitecturePage, "Engineering & Architecture"],
  ["LaunchAdoption", LaunchAdoptionPage, "Launch & Adoption"],
  ["GoLive", GoLiveDecisionPage, "Go-live Decision"],
  ["OperatingModel", OperatingModelPage, "Operating Model & Adoption"],
  ["OpsControl", OpsControlPage, "Operations Control Pack"],
  ["Targeting", TargetingPage, "Feature Targeting & Eligibility"],
  ["MultiRollout", MultiRolloutPage, "Multi-Feature Rollout Board"],
  ["FlagConsole", FlagConsolePage, "Feature Flag 콘솔"],
];

describe("모든 페이지 렌더 스모크", () => {
  it.each(PAGES)("%s 페이지가 런타임 오류 없이 렌더된다", async (_name, Page, header) => {
    const { unmount } = render(
      <Harness>
        <Page />
      </Harness>,
    );
    await waitFor(() => {
      expect(screen.getAllByText(header).length).toBeGreaterThan(0);
    });
    unmount();
  });
});
