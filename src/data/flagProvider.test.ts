import { beforeEach, describe, expect, it } from "vitest";
import { store } from "./useStore";
import { EMPTY_RULE, ruleToUnleash } from "./population";
import { flagDrift, flagKeyOf, getFlagState, syncFlag } from "./flagProvider";

// Phase 3 Unleash 안 A — 룰 매핑 + 동기화/드리프트 (Mock 경로)
describe("Unleash FlagProvider (Mock)", () => {
  beforeEach(() => store.reset());

  it("ruleToUnleash 가 EligibilityRule을 flexibleRollout 전략 + constraints로 매핑한다", () => {
    const rule = { ...EMPTY_RULE, regions: ["KR", "EU"], trims: ["Sport"], requireSw3: true };
    const out = ruleToUnleash(rule, { flagKey: "feature_x", rollout: 30 });
    expect(out.strategy.name).toBe("flexibleRollout");
    expect(out.strategy.rollout).toBe(30);
    expect(out.strategy.stickiness).toBe("vin");
    const region = out.strategy.constraints.find((c) => c.contextName === "region");
    expect(region?.operator).toBe("IN");
    expect(region?.values).toEqual(["KR", "EU"]);
    expect(out.strategy.constraints.find((c) => c.contextName === "swVersion")?.operator).toBe("SEMVER_GTE");
  });

  it("flagKeyOf 는 안전한 키를 만든다", () => {
    expect(flagKeyOf("FEAT-RPA-001")).toBe("feature_feat_rpa_001");
  });

  it("syncFlag 후 drift 가 false, 룰이 바뀌면 drift true", () => {
    const fid = "FEAT-RPA-001";
    expect(flagDrift(fid, "any")).toBeNull(); // 미동기화

    syncFlag(fid, "region ∈ {KR}", "prod", 10, "tester");
    const s = getFlagState(fid);
    expect(s.envs.prod.enabled).toBe(true);
    expect(s.envs.prod.rollout).toBe(10);
    expect(flagDrift(fid, "region ∈ {KR}")).toBe(false);
    expect(flagDrift(fid, "region ∈ {KR, EU}")).toBe(true); // 룰 변경 → 드리프트
  });
});
