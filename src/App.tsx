import { lazy, useEffect, type ComponentType } from "react";
import { Refine } from "@refinedev/core";
import { useNotificationProvider } from "@refinedev/antd";
import routerProvider from "@refinedev/react-router";
import "@refinedev/antd/dist/reset.css";
import { App as AntdApp, ConfigProvider, theme as antdAlgo } from "antd";
import { HashRouter, Route, Routes } from "react-router";

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

// 라우트 페이지는 코드 스플리팅 (React.lazy) — 초기 번들에서 제외, 진입 시 청크 로드.
// 배포 직후 브라우저가 캐시한 옛 index.html이 사라진 청크를 부르면 dynamic import가 404로 실패한다.
// 이때 1회 강제 새로고침으로 최신 index.html을 받아 자가 복구(빈 화면 방지).
const named = (p: Promise<Record<string, unknown>>, key: string) =>
  p
    .then((m) => {
      sessionStorage.removeItem("fp-chunk-reload");
      return { default: m[key] as ComponentType };
    })
    .catch((err) => {
      if (!sessionStorage.getItem("fp-chunk-reload")) {
        sessionStorage.setItem("fp-chunk-reload", "1");
        window.location.reload();
        return new Promise<{ default: ComponentType }>(() => {}); // 새로고침까지 대기
      }
      throw err;
    });

const DashboardPage = lazy(() => named(import("./pages/DashboardPage"), "DashboardPage"));
const FeatureRequestPage = lazy(() => named(import("./pages/FeatureRequestPage"), "FeatureRequestPage"));
const IntakeReviewPage = lazy(() => named(import("./pages/IntakeReviewPage"), "IntakeReviewPage"));
const RegistryListPage = lazy(() => named(import("./pages/RegistryListPage"), "RegistryListPage"));
const FeatureDetailPage = lazy(() => named(import("./pages/FeatureDetailPage"), "FeatureDetailPage"));
const LifecycleDashboardPage = lazy(() => named(import("./pages/LifecycleDashboardPage"), "LifecycleDashboardPage"));
const GateTrackerPage = lazy(() => named(import("./pages/GateTrackerPage"), "GateTrackerPage"));
const GateEvidencePage = lazy(() => named(import("./pages/GateEvidencePage"), "GateEvidencePage"));
const SupplierPortalPage = lazy(() => named(import("./pages/SupplierPortalPage"), "SupplierPortalPage"));
const ReleaseReadinessPage = lazy(() => named(import("./pages/ReleaseReadinessPage"), "ReleaseReadinessPage"));
const OperationsPage = lazy(() => named(import("./pages/OperationsPage"), "OperationsPage"));
const AuditLogPage = lazy(() => named(import("./pages/AuditLogPage"), "AuditLogPage"));
const TraceabilityPage = lazy(() => named(import("./pages/TraceabilityPage"), "TraceabilityPage"));
const AdminRbacPage = lazy(() => named(import("./pages/AdminRbacPage"), "AdminRbacPage"));
const FleetControlPage = lazy(() => named(import("./pages/FleetControlPage"), "FleetControlPage"));
const KpiCommandPage = lazy(() => named(import("./pages/KpiCommandPage"), "KpiCommandPage"));
const GoLiveDecisionPage = lazy(() => named(import("./pages/GoLiveDecisionPage"), "GoLiveDecisionPage"));
const TargetingPage = lazy(() => named(import("./pages/TargetingPage"), "TargetingPage"));
const FlagConsolePage = lazy(() => named(import("./pages/FlagConsolePage"), "FlagConsolePage"));
const MultiRolloutPage = lazy(() => named(import("./pages/MultiRolloutPage"), "MultiRolloutPage"));
const ProductScopePage = lazy(() => named(import("./pages/workbenches"), "ProductScopePage"));
const RequirementsPage = lazy(() => named(import("./pages/workbenches"), "RequirementsPage"));
const SafetySecurityPage = lazy(() => named(import("./pages/workbenches"), "SafetySecurityPage"));
const SwApiPage = lazy(() => named(import("./pages/workbenches"), "SwApiPage"));
const ControlRuntimePage = lazy(() => named(import("./pages/workbenches"), "ControlRuntimePage"));
const VerificationPage = lazy(() => named(import("./pages/workbenches"), "VerificationPage"));
const OtaPage = lazy(() => named(import("./pages/workbenches"), "OtaPage"));
const FieldOpsPage = lazy(() => named(import("./pages/workbenches"), "FieldOpsPage"));
const RetirementPage = lazy(() => named(import("./pages/workbenches"), "RetirementPage"));
const GovernanceDataPage = lazy(() => named(import("./pages/workbenches"), "GovernanceDataPage"));
const ArchitecturePage = lazy(() => named(import("./pages/workbenches"), "ArchitecturePage"));
const LaunchAdoptionPage = lazy(() => named(import("./pages/workbenches"), "LaunchAdoptionPage"));
const OperatingModelPage = lazy(() => named(import("./pages/workbenches"), "OperatingModelPage"));
const OpsControlPage = lazy(() => named(import("./pages/workbenches"), "OpsControlPage"));

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
    <HashRouter>
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
                  <Route path="flags" element={<FlagConsolePage />} />
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
    </HashRouter>
  );
}
