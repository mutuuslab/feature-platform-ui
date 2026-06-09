import { describe, expect, it } from "vitest";
import { DEFAULT_WAVES, EMPTY_RULE, TOTAL_FLEET, buildVehicles, checkVehicle, evaluateFleet, firstEligibleWave, progressivePreset, ruleToPolicyExpression, type EligibilityRule, type WaveRule } from "./population";

describe("evaluateFleet — 조건별 통제", () => {
  it("조건 없음 → 전체 플릿이 eligible", () => {
    const r = evaluateFleet(EMPTY_RULE);
    expect(r.eligible).toBe(TOTAL_FLEET);
    expect(r.pct).toBeCloseTo(100, 0);
  });

  it("지역 필터(KR)는 eligible를 줄인다", () => {
    const kr = evaluateFleet({ ...EMPTY_RULE, regions: ["KR"] });
    expect(kr.eligible).toBeLessThan(TOTAL_FLEET);
    expect(kr.eligible).toBeGreaterThan(0);
    // KR 외 지역은 0
    expect(kr.matrix.filter((m) => m.region !== "KR").every((m) => m.eligible === 0)).toBe(true);
  });

  it("HW4 + SW3 + 옵션 조건은 누적으로 모집단을 좁힌다", () => {
    const base = evaluateFleet({ ...EMPTY_RULE, regions: ["KR"], trims: ["Premium"] });
    const tighter: EligibilityRule = { ...EMPTY_RULE, regions: ["KR"], trims: ["Premium"], hwVersions: ["HW4"], requireSw3: true, optionCodes: ["ADAS-L2"] };
    const r2 = evaluateFleet(tighter);
    expect(r2.eligible).toBeLessThan(base.eligible);
  });
});

describe("checkVehicle — VIN 단위 적용 여부", () => {
  const vehicles = buildVehicles();

  it("시드 차량 DB는 수백 대 (region/trim 분포)", () => {
    expect(vehicles.length).toBeGreaterThan(380);
    // 모든 지역·트림이 표본에 존재
    expect(new Set(vehicles.map((v) => v.region)).size).toBe(5);
    expect(new Set(vehicles.map((v) => v.trim)).size).toBe(4);
  });

  it("조건 없으면 모든 차량 eligible", () => {
    expect(vehicles.every((v) => checkVehicle(v, EMPTY_RULE).eligible)).toBe(true);
  });

  it("HW4 요구 시 HW4 차량만 통과", () => {
    const rule: EligibilityRule = { ...EMPTY_RULE, hwVersions: ["HW4"] };
    vehicles.forEach((v) => {
      expect(checkVehicle(v, rule).eligible).toBe(v.hw === "HW4");
    });
  });

  it("옵션(ADAS-L2) 요구 시 해당 옵션 장착 차량만 통과", () => {
    const rule: EligibilityRule = { ...EMPTY_RULE, optionCodes: ["ADAS-L2"] };
    vehicles.forEach((v) => {
      expect(checkVehicle(v, rule).eligible).toBe(v.options.includes("ADAS-L2"));
    });
  });
});

describe("Wave 점진 확대 + Policy 생성", () => {
  it("progressivePreset은 Pilot→100%로 eligible가 단조 증가", () => {
    const presets = progressivePreset();
    const eligibles = presets.map((r) => evaluateFleet(r).eligible);
    for (let i = 1; i < eligibles.length; i += 1) {
      expect(eligibles[i]).toBeGreaterThanOrEqual(eligibles[i - 1]);
    }
  });

  it("ruleToPolicyExpression은 조건을 && 식으로 생성", () => {
    const expr = ruleToPolicyExpression({ ...EMPTY_RULE, regions: ["KR"], hwVersions: ["HW4"], requireSw3: true });
    expect(expr).toContain("region ∈ {KR}");
    expect(expr).toContain("hw ∈ {HW4}");
    expect(expr).toContain("sw >= 3.0");
    expect(expr).toContain("&&");
  });

  it("조건 없으면 전체 차량 정책", () => {
    expect(ruleToPolicyExpression(EMPTY_RULE)).toContain("true");
  });
});

describe("증분 배포 — firstEligibleWave (중복 제거)", () => {
  const vehicles = buildVehicles();
  const presets = progressivePreset();
  const waveRules: WaveRule[] = DEFAULT_WAVES.map((wave, i) => ({ wave, rule: presets[Math.min(i, presets.length - 1)], eligible: 0 }));

  it("각 차량은 가장 이른 eligible Wave에 1번만 배정된다", () => {
    const assigned = vehicles.map((v) => firstEligibleWave(v, waveRules));
    // 최종 Wave(전체 HW3+)에 거의 모두 포함되므로 대부분 배정됨
    const counted = assigned.filter(Boolean).length;
    expect(counted).toBeGreaterThan(0);
    // firstEligibleWave는 단일 값(중복 배정 없음)
    assigned.forEach((w) => {
      if (w) expect(DEFAULT_WAVES).toContain(w);
    });
  });

  it("앞 Wave에 eligible한 차량은 그 Wave로 배정(뒤 Wave로 미루지 않음)", () => {
    const v = vehicles.find((x) => checkVehicle(x, waveRules[0].rule).eligible);
    if (v) expect(firstEligibleWave(v, waveRules)).toBe(waveRules[0].wave);
  });
});
