import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

// 앱이 런타임 오류 없이 마운트되고 메인 셸/대시보드가 렌더되는지 확인 (Refine+Router+antd 배선 검증).
describe("App smoke", () => {
  it("AppShell과 Control Tower 대시보드가 렌더된다", async () => {
    render(<App />);
    // 사이드바 브랜드
    await waitFor(() => {
      expect(screen.getByText("Feature Platform")).toBeInTheDocument();
    });
    // 대시보드 타이틀(nav+header 2곳) + 시드 Feature 표시
    expect((await screen.findAllByText("Control Tower")).length).toBeGreaterThan(0);
    expect(await screen.findByText("Remote Parking Assist")).toBeInTheDocument();
  });
});
