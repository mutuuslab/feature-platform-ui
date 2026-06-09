import { describe, expect, it } from "vitest";
import { computeGateSummary, derivedLifecycleStatus, transitionGateState } from "./gateLogic";
import { GATES } from "./codeMaster";
import type { Gate, GateCode, GateStatus } from "./types";

function makeGates(statuses: Partial<Record<GateCode, GateStatus>>): Gate[] {
  return GATES.map((g) => ({
    id: `F-${g.code}`,
    featureId: "F",
    gateCode: g.code,
    status: statuses[g.code] ?? "NOT_STARTED",
    owner: g.leadOwnerRole,
    evidenceCount: 0,
  }));
}

const allPass = (): Partial<Record<GateCode, GateStatus>> =>
  Object.fromEntries(GATES.map((g) => [g.code, "PASS"]));

describe("computeGateSummary", () => {
  it("9개 모두 PASS면 GO", () => {
    const s = computeGateSummary(makeGates(allPass()));
    expect(s.decision).toBe("GO");
    expect(s.passCount).toBe(9);
  });

  it("일부 PENDING이면 HOLD", () => {
    const s = computeGateSummary(makeGates({ ...allPass(), RG5: "PENDING" }));
    expect(s.decision).toBe("HOLD");
  });

  it("하나라도 BLOCK이면 BLOCK (PASS 개수와 무관)", () => {
    const s = computeGateSummary(makeGates({ ...allPass(), RG7: "BLOCK" }));
    expect(s.decision).toBe("BLOCK");
    expect(s.blockCount).toBe(1);
  });

  // 시트 41 step 14 회귀 테스트: OTA(RG8) PASS여도 Verification(RG5) PENDING이면 GO가 아니라 HOLD
  it("RG8 PASS + RG5 PENDING → HOLD (OTA가 Verification을 덮어쓰지 않음)", () => {
    const s = computeGateSummary(
      makeGates({ ...allPass(), RG5: "PENDING", RG8: "PASS" }),
    );
    expect(s.decision).toBe("HOLD");
    expect(s.decision).not.toBe("GO");
  });

  it("CONDITIONAL은 통과로 집계", () => {
    const s = computeGateSummary(makeGates({ ...allPass(), RG1: "CONDITIONAL" }));
    expect(s.decision).toBe("GO");
  });
});

describe("transitionGateState", () => {
  it("Proposed→Approved는 RG1·RG2·RG3 필요", () => {
    const t = transitionGateState("Proposed", makeGates({ RG1: "PASS", RG2: "PASS", RG3: "PASS" }));
    expect(t.to).toBe("Approved");
    expect(t.satisfied).toBe(true);
    expect(t.requiredGates).toEqual(["RG1", "RG2", "RG3"]);
  });

  it("RG3 미충족 시 blocking에 포함", () => {
    const t = transitionGateState("Proposed", makeGates({ RG1: "PASS", RG2: "PASS" }));
    expect(t.satisfied).toBe(false);
    expect(t.blocking).toContain("RG3");
  });
});

describe("derivedLifecycleStatus", () => {
  it("RG1~3만 PASS면 Approved", () => {
    expect(derivedLifecycleStatus(makeGates({ RG1: "PASS", RG2: "PASS", RG3: "PASS" }))).toBe("Approved");
  });
  it("RG1~7 PASS면 Verified 전(Developing→Verified는 RG4·5·6 필요)", () => {
    // RG1~3, RG7 PASS → Developing. RG4·5·6 PASS면 Verified
    expect(
      derivedLifecycleStatus(
        makeGates({ RG1: "PASS", RG2: "PASS", RG3: "PASS", RG7: "PASS", RG4: "PASS", RG5: "PASS", RG6: "PASS" }),
      ),
    ).toBe("Verified");
  });
  it("9개 모두 PASS면 Released", () => {
    expect(derivedLifecycleStatus(makeGates(allPass()))).toBe("Released");
  });
});
