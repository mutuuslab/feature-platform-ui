import { describe, expect, it } from "vitest";
import {
  makeFeatureId, isValidFeatureId, suggestFeatureId, nextSeqForDomain,
  makeControlPointId, checkTaxonomyRules, featureTypeFor,
} from "./taxonomy";

describe("Taxonomy — ID 규칙", () => {
  it("makeFeatureId: FEAT-{DOMAIN}-{NNN} (0패딩)", () => {
    expect(makeFeatureId("RPA", 7)).toBe("FEAT-RPA-007");
    expect(makeFeatureId("BDC", 123)).toBe("FEAT-BDC-123");
  });

  it("isValidFeatureId: 형식 검증", () => {
    expect(isValidFeatureId("FEAT-RPA-001")).toBe(true);
    expect(isValidFeatureId("FEAT-rpa-001")).toBe(false); // 소문자
    expect(isValidFeatureId("RPA-001")).toBe(false);
    expect(isValidFeatureId("FEAT-RPA-1")).toBe(false); // 3자리 아님
  });

  it("nextSeqForDomain / suggestFeatureId: 기존 최대+1", () => {
    const ids = ["FEAT-RPA-001", "FEAT-RPA-004", "FEAT-BDC-002"];
    expect(nextSeqForDomain("RPA", ids)).toBe(5);
    expect(suggestFeatureId("ADAS / 자율주행", ids)).toBe("FEAT-RPA-005");
  });

  it("makeControlPointId: CP-{FEATURE}-{TYPE}", () => {
    expect(makeControlPointId("FEAT-BDC-010", "enable")).toBe("CP-BDC-010-ENABLE");
  });

  it("featureTypeFor: 레벨별 타입", () => {
    expect(featureTypeFor("L2")).toContain("Vehicle / System Feature");
    expect(featureTypeFor("L4")).toContain("Policy");
  });
});

describe("Taxonomy — Consistency Rules", () => {
  it("L2: Parent 없으면 T-001 위반(WARN)", () => {
    const r = checkTaxonomyRules({ taxonomyLevel: "L2", parentFeatureId: undefined });
    expect(r.status).toBe("WARN");
    expect(r.rules.find((x) => x.id === "T-001")?.pass).toBe(false);
  });
  it("L2: Parent 있으면 PASS", () => {
    const r = checkTaxonomyRules({ taxonomyLevel: "L2", parentFeatureId: "Remote Parking" });
    expect(r.status).toBe("PASS");
  });
  it("L0: DeploymentUnit 직접 연결 금지(T-004) 충족 → PASS", () => {
    const r = checkTaxonomyRules({ taxonomyLevel: "L0", parentFeatureId: undefined });
    expect(r.status).toBe("PASS");
    expect(r.rules.find((x) => x.id === "T-004")?.pass).toBe(true);
  });
});
