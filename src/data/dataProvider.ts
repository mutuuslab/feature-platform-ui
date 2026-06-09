// Refine DataProvider — 인메모리 store 기반 Mock.
// 실서버 전환 시 이 파일만 @refinedev/simple-rest 등으로 교체하면 화면 코드는 그대로 (시트 37 PD-003).
import type { DataProvider } from "@refinedev/core";
import { store, type ResourceName } from "./store";

type Row = { id: string } & Record<string, unknown>;

function getField(obj: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function applyFilters(data: Row[], filters?: unknown[]): Row[] {
  if (!filters?.length) return data;
  return data.filter((row) =>
    (filters as Array<{ field?: string; operator?: string; value?: unknown }>).every((f) => {
      if (!f.field) return true;
      const v = getField(row, f.field);
      switch (f.operator) {
        case "eq":
          return v === f.value;
        case "ne":
          return v !== f.value;
        case "contains":
          return String(v ?? "").toLowerCase().includes(String(f.value ?? "").toLowerCase());
        case "in":
          return Array.isArray(f.value) && (f.value as unknown[]).includes(v);
        default:
          return true;
      }
    }),
  );
}

function applySorters(data: Row[], sorters?: unknown[]): Row[] {
  if (!sorters?.length) return data;
  const s = (sorters as Array<{ field: string; order: "asc" | "desc" }>)[0];
  return [...data].sort((a, b) => {
    const av = String(getField(a, s.field) ?? "");
    const bv = String(getField(b, s.field) ?? "");
    return s.order === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
  });
}

export const dataProvider: DataProvider = {
  getApiUrl: () => "mock://feature-platform",

  getList: async ({ resource, pagination, filters, sorters }) => {
    let data = store.list<Row>(resource as ResourceName);
    data = applyFilters(data, filters);
    data = applySorters(data, sorters);
    const total = data.length;
    const current = pagination?.current ?? 1;
    const pageSize = pagination?.pageSize ?? 50;
    const mode = pagination?.mode ?? "server";
    const paged = mode === "off" ? data : data.slice((current - 1) * pageSize, current * pageSize);
    return { data: paged as never, total };
  },

  getOne: async ({ resource, id }) => {
    const item = store.get<Row>(resource as ResourceName, String(id));
    if (!item) throw new Error(`${resource} ${id} not found`);
    return { data: item as never };
  },

  getMany: async ({ resource, ids }) => {
    const all = store.list<Row>(resource as ResourceName);
    const idset = new Set(ids.map(String));
    return { data: all.filter((r) => idset.has(r.id)) as never };
  },

  create: async ({ resource, variables }) => {
    const created = store.create(resource as ResourceName, variables as Row);
    return { data: created as never };
  },

  update: async ({ resource, id, variables }) => {
    const updated = store.update(resource as ResourceName, String(id), variables as Partial<Row>);
    return { data: updated as never };
  },

  deleteOne: async ({ resource, id }) => {
    const item = store.get<Row>(resource as ResourceName, String(id));
    store.remove(resource as ResourceName, String(id));
    return { data: (item ?? { id }) as never };
  },
};
