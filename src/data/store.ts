// 인메모리 Mock 저장소 (localStorage 영속). 모든 변경은 AuditLog를 남긴다 (시트 48 NFR-004/007).
import type { AuditLog } from "../domain/types";
import { buildSeed, type SeedData } from "./seed";

export type ResourceName = keyof SeedData;

const STORAGE_KEY = "ff-platform-mockdb-v4"; // v4: fieldIssues 추가

function load(): SeedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SeedData;
  } catch {
    /* ignore */
  }
  return buildSeed();
}

class MockStore {
  private db: SeedData = load();

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      /* ignore (e.g. SSR/test env) */
    }
  }

  reset() {
    this.db = buildSeed();
    this.persist();
  }

  // 백엔드 bootstrap 스냅샷을 로컬 db에 overlay (제공된 리소스만 교체). 나머지(vehicles 등)는 로컬 유지.
  overlay(partial: Record<string, unknown[]>) {
    const target = this.db as unknown as Record<string, unknown[]>;
    for (const key of Object.keys(partial)) {
      if (key in target && Array.isArray(partial[key])) {
        target[key] = partial[key];
      }
    }
    this.persist();
  }

  list<T = unknown>(resource: ResourceName): T[] {
    return (this.db[resource] as unknown as T[]) ?? [];
  }

  get<T = unknown>(resource: ResourceName, id: string): T | undefined {
    return (this.db[resource] as unknown as Array<{ id: string }>).find((r) => r.id === id) as T | undefined;
  }

  create<T extends { id?: string }>(resource: ResourceName, item: T): T & { id: string } {
    // 빈 문자열 id("")도 미지정으로 간주하고 새 id를 발급 (?? 는 ""를 통과시키는 버그가 있었음).
    const withId = { ...item, id: item.id || genId(resource) } as T & { id: string };
    (this.db[resource] as unknown as unknown[]).unshift(withId);
    this.persist();
    return withId;
  }

  update<T extends { id: string }>(resource: ResourceName, id: string, patch: Partial<T>): T {
    const arr = this.db[resource] as unknown as T[];
    const idx = arr.findIndex((r) => r.id === id);
    if (idx < 0) throw new Error(`${resource} ${id} not found`);
    arr[idx] = { ...arr[idx], ...patch };
    this.persist();
    return arr[idx];
  }

  remove(resource: ResourceName, id: string) {
    const arr = this.db[resource] as unknown as Array<{ id: string }>;
    const idx = arr.findIndex((r) => r.id === id);
    if (idx >= 0) arr.splice(idx, 1);
    this.persist();
  }

  audit(entry: Omit<AuditLog, "id" | "timestamp">) {
    const log: AuditLog = {
      ...entry,
      id: genId("auditLogs"),
      timestamp: new Date().toISOString(),
    };
    this.db.auditLogs.unshift(log);
    this.persist();
    return log;
  }
}

let counter = 1000;
function genId(resource: ResourceName): string {
  counter += 1;
  const prefix: Record<ResourceName, string> = {
    features: "FEAT",
    featureRequests: "FRQ",
    gates: "GATE",
    evidence: "EV",
    supplierWorkPackages: "WP",
    releasePlans: "RP",
    auditLogs: "AU",
    vehicles: "VIN",
    eligibilityRules: "ELIG",
    eligibilityHistory: "EVH",
    activations: "ACT",
    fieldIssues: "FI",
    requirements: "REQ",
    tests: "TST",
    defects: "DEF",
    releaseCandidates: "RC",
  };
  return `${prefix[resource]}-${counter}`;
}

export const store = new MockStore();
