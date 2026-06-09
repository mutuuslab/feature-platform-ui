// 회귀 테스트: 임시저장(Draft) 중복 생성 방지.
// 버그 — saveDraft 가 매번 store.create 를 호출해 같은 제안서가 여러 건 쌓였음.
// 수정 — draftId 추적 후 두 번째부터는 update. 임시저장을 두 번 눌러도 DRAFT 는 1건이어야 한다.
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App as AntdApp, ConfigProvider } from "antd";
import { BrowserRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";

import { RoleProvider } from "../auth/RoleContext";
import { antdTheme } from "../theme/tokens";
import { store } from "../data/useStore";
import type { FeatureRequest } from "../domain/types";
import { FeatureRequestPage } from "./FeatureRequestPage";

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

const NAME = "중복방지 회귀 테스트 제안";
const draftsWithName = () =>
  store.list<FeatureRequest>("featureRequests").filter((r) => r.status === "DRAFT" && r.name === NAME);

describe("Feature 등록 — 임시저장 중복 방지", () => {
  beforeEach(() => store.reset());

  it("임시저장을 두 번 눌러도 DRAFT 레코드는 1건만 생성된다", async () => {
    render(<Harness><FeatureRequestPage /></Harness>);

    fireEvent.change(screen.getByPlaceholderText("제안명을 입력하세요."), { target: { value: NAME } });

    const saveBtn = screen.getByRole("button", { name: "임시저장" });
    fireEvent.click(saveBtn);
    await waitFor(() => expect(draftsWithName().length).toBe(1));

    // 두 번째 저장은 update 경로 — draftId 를 ref 로 추적하므로 빠른 재클릭에도 중복 생성되지 않는다
    fireEvent.click(saveBtn);
    await waitFor(() => expect(draftsWithName().length).toBe(1));
    expect(draftsWithName().length).toBe(1);
  });
});
