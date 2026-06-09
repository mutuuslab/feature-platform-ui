import { useEffect } from "react";
import { Refine } from "@refinedev/core";
import { useNotificationProvider } from "@refinedev/antd";
import routerProvider from "@refinedev/react-router";
import "@refinedev/antd/dist/reset.css";
import { App as AntdApp, ConfigProvider, theme as antdAlgo } from "antd";
import { BrowserRouter, Route, Routes } from "react-router";

import { antdTheme } from "./theme/tokens";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import { dataProvider } from "./data/dataProvider";
import { restDataProvider, fetchBootstrap } from "./data/restDataProvider";
import { USE_BACKEND } from "./data/apiConfig";
import { store, useMutate, setConnected } from "./data/useStore";
import { RoleProvider } from "./auth/RoleContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { AppShell } from "./components/AppShell";

import { DashboardPage } from "./pages/DashboardPage";
import { FeatureRequestPage } from "./pages/FeatureRequestPage";
import { IntakeReviewPage } from "./pages/IntakeReviewPage";
import { RegistryListPage } from "./pages/RegistryListPage";
import { FeatureDetailPage } from "./pages/FeatureDetailPage";
import { LifecycleDashboardPage } from "./pages/LifecycleDashboardPage";
import { GateTrackerPage } from "./pages/GateTrackerPage";
import { GateEvidencePage } from "./pages/GateEvidencePage";
import { SupplierPortalPage } from "./pages/SupplierPortalPage";
import { ReleaseReadinessPage } from "./pages/ReleaseReadinessPage";
import { OperationsPage } from "./pages/OperationsPage";
import { AuditLogPage } from "./pages/AuditLogPage";
import { TraceabilityPage } from "./pages/TraceabilityPage";
import { AdminRbacPage } from "./pages/AdminRbacPage";
import { FleetControlPage } from "./pages/FleetControlPage";
import { KpiCommandPage } from "./pages/KpiCommandPage";
import { GoLiveDecisionPage } from "./pages/GoLiveDecisionPage";
import { TargetingPage } from "./pages/TargetingPage";
import { MultiRolloutPage } from "./pages/MultiRolloutPage";
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
} from "./pages/workbenches";

export default function App() {
  return (
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  );
}

function Root() {
  const { dark } = useTheme();
  const mutate = useMutate();

  // 백엔드 연결 시 bootstrap 스냅샷으로 store hydrate (read). 실패 시 로컬 Mock 유지.
  useEffect(() => {
    if (!USE_BACKEND) return;
    fetchBootstrap()
      .then((data) => { mutate(() => store.overlay(data as Record<string, unknown[]>)); setConnected(true); })
      .catch(() => setConnected(false));
  }, [mutate]);

  return (
    <ConfigProvider theme={{ ...antdTheme, algorithm: dark ? antdAlgo.darkAlgorithm : antdAlgo.defaultAlgorithm }}>
      <AntdApp>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

function Gate() {
  const { authed } = useAuth();
  if (!authed) return <LoginPage />;
  return (
    <BrowserRouter>
      <Refine
        dataProvider={USE_BACKEND ? restDataProvider : dataProvider}
        routerProvider={routerProvider}
            notificationProvider={useNotificationProvider}
            resources={[
              { name: "features", list: "/features", show: "/features/:id" },
              { name: "featureRequests", list: "/intake" },
              { name: "gates", list: "/gates" },
              { name: "evidence", list: "/evidence" },
              { name: "supplierWorkPackages", list: "/supplier" },
              { name: "releasePlans", list: "/release" },
              { name: "auditLogs", list: "/audit" },
            ]}
            options={{ disableTelemetry: true, warnWhenUnsavedChanges: false }}
          >
            <RoleProvider>
              <Routes>
                <Route element={<AppShell />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="fleet" element={<FleetControlPage />} />
                  <Route path="rollout-board" element={<MultiRolloutPage />} />
                  <Route path="requests/new" element={<FeatureRequestPage />} />
                  <Route path="intake" element={<IntakeReviewPage />} />
                  <Route path="features" element={<RegistryListPage />} />
                  <Route path="features/:id" element={<FeatureDetailPage />} />
                  <Route path="lifecycle" element={<LifecycleDashboardPage />} />
                  <Route path="product" element={<ProductScopePage />} />
                  <Route path="requirements" element={<RequirementsPage />} />
                  <Route path="targeting" element={<TargetingPage />} />
                  <Route path="safety" element={<SafetySecurityPage />} />
                  <Route path="sw-api" element={<SwApiPage />} />
                  <Route path="control" element={<ControlRuntimePage />} />
                  <Route path="architecture" element={<ArchitecturePage />} />
                  <Route path="gates" element={<GateTrackerPage />} />
                  <Route path="gates/:id" element={<GateTrackerPage />} />
                  <Route path="evidence" element={<GateEvidencePage />} />
                  <Route path="verification" element={<VerificationPage />} />
                  <Route path="traceability" element={<TraceabilityPage />} />
                  <Route path="supplier" element={<SupplierPortalPage />} />
                  <Route path="release" element={<ReleaseReadinessPage />} />
                  <Route path="ota" element={<OtaPage />} />
                  <Route path="operations" element={<OperationsPage />} />
                  <Route path="kpi" element={<KpiCommandPage />} />
                  <Route path="ops-control" element={<OpsControlPage />} />
                  <Route path="field" element={<FieldOpsPage />} />
                  <Route path="retirement" element={<RetirementPage />} />
                  <Route path="launch" element={<LaunchAdoptionPage />} />
                  <Route path="operating" element={<OperatingModelPage />} />
                  <Route path="golive" element={<GoLiveDecisionPage />} />
                  <Route path="governance" element={<GovernanceDataPage />} />
                  <Route path="audit" element={<AuditLogPage />} />
                  <Route path="admin" element={<AdminRbacPage />} />
                </Route>
              </Routes>
            </RoleProvider>
          </Refine>
    </BrowserRouter>
  );
}
