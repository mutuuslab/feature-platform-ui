import { describe, expect, it } from "vitest";
import { aiDraft, aiReview, aiDedup, aiSummarize, aiRecommend } from "./aiProvider";

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

  it("recommend: 맥락 기반으로 유효한 운영안/유관부서를 추천한다", async () => {
    const SEGMENTS = ["경차/소형", "준중형", "중형", "대형/플래그십", "SUV/RV", "EV 전용", "상용/PBV"];
    const BRANDS = ["현대", "기아", "제네시스"];
    const rec = await aiRecommend({ name: "원격 주차 보조", idea: "ADAS 주차, 안전 관련" });
    // 적용 범위는 유효 권역/브랜드만
    for (const [region, brands] of Object.entries(rec.applyScope)) {
      expect(["국내", "북미", "유럽", "중국", "일반"]).toContain(region);
      brands.forEach((b) => expect(BRANDS).toContain(b));
    }
    rec.applySegments.forEach((s) => expect(SEGMENTS).toContain(s));
    expect(rec.relatedDepts.length).toBeGreaterThan(0);
    // ADAS·안전 맥락이면 Safety/Security 가 추천되어야 한다
    expect(rec.relatedDepts).toContain("Safety/Security");
    expect(typeof rec.volumeEstimate).toBe("number");
  });
});
