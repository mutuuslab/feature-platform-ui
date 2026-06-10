import { beforeEach, describe, expect, it } from "vitest";
import { store } from "./useStore";
import type { DefectRecord, ReleaseCandidateRecord, RequirementRecord, TestRunRecord } from "../domain/types";

// Phase 2 워크벤치 심화: 신규 store 리소스 시드/상호작용 회귀 가드
describe("워크벤치 store 리소스", () => {
  beforeEach(() => store.reset());

  it("requirements/tests/defects/releaseCandidates 가 시드된다", () => {
    expect(store.list<RequirementRecord>("requirements").length).toBeGreaterThan(0);
    expect(store.list<TestRunRecord>("tests").length).toBeGreaterThan(0);
    expect(store.list<DefectRecord>("defects").length).toBeGreaterThan(0);
    expect(store.list<ReleaseCandidateRecord>("releaseCandidates").length).toBeGreaterThan(0);
  });

  it("Defect 상태 갱신이 store에 반영된다", () => {
    const d = store.list<DefectRecord>("defects")[0];
    store.update<DefectRecord>("defects", d.id, { status: "VERIFIED" });
    expect(store.get<DefectRecord>("defects", d.id)?.status).toBe("VERIFIED");
  });

  it("Release Candidate 배포 전이가 store에 반영된다", () => {
    const rc = store.list<ReleaseCandidateRecord>("releaseCandidates").find((r) => r.status === "FROZEN");
    expect(rc).toBeTruthy();
    store.update<ReleaseCandidateRecord>("releaseCandidates", rc!.id, { status: "DEPLOYED" });
    expect(store.get<ReleaseCandidateRecord>("releaseCandidates", rc!.id)?.status).toBe("DEPLOYED");
  });
});
