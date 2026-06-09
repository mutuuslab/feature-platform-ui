import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(() => localStorage.clear());

// 앱이 로그인 게이트 → 메인 셸/대시보드까지 런타임 오류 없이 마운트되는지 확인.
describe("App smoke", () => {
  it("로그인 화면이 먼저 뜬다 (게이트)", async () => {
    render(<App />);
    expect(await screen.findByPlaceholderText("ID")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  });

  it("admin/admin 로그인 후 Control Tower 대시보드가 렌더된다", async () => {
    render(<App />);
    fireEvent.change(await screen.findByPlaceholderText("ID"), { target: { value: "admin" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "admin" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(screen.getByText("Feature Platform")).toBeInTheDocument());
    expect((await screen.findAllByText("Control Tower")).length).toBeGreaterThan(0);
    // DashboardPage 는 React.lazy(+recharts) 라 jsdom에서 해석/렌더가 느릴 수 있어 여유 타임아웃 부여.
    expect(await screen.findByText("Remote Parking Assist", {}, { timeout: 5000 })).toBeInTheDocument();
  });
});
