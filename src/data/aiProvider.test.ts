import { describe, expect, it } from "vitest";
import { aiDraft, aiReview, aiDedup, aiSummarize } from "./aiProvider";

// USE_BACKEND 가 false(기본 테스트 환경)이므로 Mock 경로를 검증한다.
describe("AI 어시스트 Mock provider", () => {
  it("draft: 아이디어를 반영해 7개 항목을 모두 채운다", async () => {
    const d = await aiDraft({ name: "원격 주차", idea: "주차 시 원격으로 차를 빼주는 기능" });
    expect(d.customerNeeds).toContain("주차 시 원격으로 차를 빼주는 기능");
    for (const k of ["customerNeeds", "reviewBackground", "devAgreement", "expectedValue", "techConcept", "useCase", "competitorTrend"] as const) {
      expect(d[k].length).toBeGreaterThan(0);
    }
  });

  it("review: 필수 항목 누락 시 낮은 점수 + 필수 보강 제안", async () => {
    const r = await aiReview({ request: { name: "", customerNeeds: "", applyScope: {} } });
    expect(r.score).toBeLessThan(55);
    expect(r.level).toBe("하");
    expect(r.suggestions.some((s) => s.severity === "필수")).toBe(true);
  });

  it("review: 필수 채워지면 점수 상승", async () => {
    const full = await aiReview({
      request: {
        name: "원격 주차", customerNeeds: "IQS 지수 기반 요구 12% 증가, 시장 조사 결과 동급 미적용",
        applyScope: { 국내: ["현대"] }, techConcept: "센서→판단→제어", expectedValue: "수익 10% 증대",
        useCase: "주차장에서 사용", relatedDepts: ["Product"], reviewBackground: "법규 동향 강화",
      },
    });
    const empty = await aiReview({ request: { name: "", customerNeeds: "", applyScope: {} } });
    expect(full.score).toBeGreaterThan(empty.score);
  });

  it("dedup: 동일 제안명은 중복 후보로 탐지된다", async () => {
    const res = await aiDedup({
      name: "Remote Parking Assist",
      existing: [
        { id: "FEAT-RPA-001", name: "Remote Parking Assist", kind: "등록 Feature" },
        { id: "FRQ-9", name: "전혀 다른 인포테인먼트 테마", kind: "기존 제안" },
      ],
    });
    expect(res.candidates[0]?.id).toBe("FEAT-RPA-001");
    expect(res.verdict).not.toBe("NO_DUPLICATE");
  });

  it("summarize: 한 줄 요약과 불릿을 반환한다", async () => {
    const s = await aiSummarize({ request: { name: "원격 주차", applyScope: { 국내: ["현대"] }, deployType: "Binary OTA" } });
    expect(s.summary).toContain("원격 주차");
    expect(s.bullets.length).toBeGreaterThanOrEqual(4);
  });
});
