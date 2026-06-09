import { render, screen } from "@testing-library/react";
import { App as AntdApp, ConfigProvider } from "antd";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { navForRole, landingForRole } from "./nav";
import { can, canDecideGate, type RoleId } from "./rbac";
import { RoleProvider } from "./RoleContext";
import { ThemeProvider } from "../theme/ThemeContext";
import { AppShell } from "../components/AppShell";

// ── 1) 접근 제어 로직 (navForRole / landing / RBAC) ──
describe("역할 기반 화면 접근 — navForRole", () => {
  const routesOf = (role: RoleId) => navForRole(role).flatMap((g) => g.items.map((i) => i.key));

  it("모든 역할은 Control Tower(/)와 Audit(/audit)에 접근 가능", () => {
    (["Requester", "PMO", "Supplier", "SWOwner", "OperationOwner"] as RoleId[]).forEach((r) => {
      expect(routesOf(r)).toContain("/");
      expect(routesOf(r)).toContain("/audit");
    });
  });

  it("Supplier는 최소 노출 — Supplier Portal은 보이고, Intake/Admin/Fleet은 숨김", () => {
    const r = routesOf("Supplier");
    expect(r).toContain("/supplier");
    expect(r).not.toContain("/intake");
    expect(r).not.toContain("/admin");
    expect(r).not.toContain("/fleet");
    expect(r.length).toBeLessThan(6); // 소수 화면만
  });

  it("Admin은 모든 화면 접근 (가장 넓음)", () => {
    const admin = routesOf("Admin");
    const requester = routesOf("Requester");
    expect(admin.length).toBeGreaterThan(requester.length);
    ["/intake", "/admin", "/fleet", "/golive", "/governance", "/targeting"].forEach((k) => expect(admin).toContain(k));
  });

  it("Requester는 Request 작성 가능, Gate/Release 통제는 불가", () => {
    const r = routesOf("Requester");
    expect(r).toContain("/requests/new");
    expect(r).not.toContain("/gates");
    expect(r).not.toContain("/release");
  });

  it("역할별 랜딩 경로", () => {
    expect(landingForRole("Supplier")).toBe("/supplier");
    expect(landingForRole("OperationOwner")).toBe("/operations");
    expect(landingForRole("PMO")).toBe("/");
  });
});

describe("RBAC capability / gate 권한", () => {
  it("Requester만 request.create, Intake 결정은 불가", () => {
    expect(can("Requester", "request.create")).toBe(true);
    expect(can("Requester", "intake.decide")).toBe(false);
    expect(can("PMO", "intake.decide")).toBe(true);
  });
  it("RG5는 SW Owner, RG8은 Release Owner만 (시트 23 RBAC-019)", () => {
    expect(canDecideGate("SWOwner", "RG5")).toBe(true);
    expect(canDecideGate("ReleaseOwner", "RG5")).toBe(false);
    expect(canDecideGate("ReleaseOwner", "RG8")).toBe(true);
    expect(canDecideGate("Admin", "RG8")).toBe(true); // Admin/PMO는 전체
  });
});

// ── 2) UI 렌더 검증 — 역할에 따라 사이드바 메뉴가 실제로 달라진다 ──
function renderShell(role: RoleId) {
  return render(
    <ThemeProvider>
      <ConfigProvider>
        <AntdApp>
          <MemoryRouter initialEntries={["/"]}>
            <RoleProvider initialRole={role}>
              <Routes>
                <Route path="/" element={<AppShell />} />
              </Routes>
            </RoleProvider>
          </MemoryRouter>
        </AntdApp>
      </ConfigProvider>
    </ThemeProvider>,
  );
}

describe("역할 기반 네비게이션 렌더", () => {
  it("Supplier 셸에는 Supplier Portal이 보이고 RBAC/Admin은 없다", async () => {
    renderShell("Supplier");
    expect(await screen.findByText("Supplier Portal")).toBeInTheDocument();
    expect(screen.queryByText("RBAC / Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("Intake Review")).not.toBeInTheDocument();
  });

  it("Admin 셸에는 RBAC/Admin과 Fleet Control이 보인다", async () => {
    renderShell("Admin");
    expect(await screen.findByText("RBAC / Admin")).toBeInTheDocument();
    expect(screen.getByText("Fleet Control")).toBeInTheDocument();
  });
});
