// REST DataProvider — Node/TS 백엔드(server/)에 연결. Refine simple-rest 호환 (fetch 기반).
// 인메모리 dataProvider와 동일 인터페이스 → "dataProvider만 교체"로 실서버 전환 (안 A 핵심).
import type { DataProvider } from "@refinedev/core";
import { API_URL } from "./apiConfig";

const base = API_URL ?? "";

async function http(path: string, init?: RequestInit) {
  const res = await fetch(`${base}${path}`, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res;
}

export const restDataProvider: DataProvider = {
  getApiUrl: () => base,

  getList: async ({ resource }) => {
    const res = await http(`/api/${resource}`);
    const data = await res.json();
    const total = Number(res.headers.get("X-Total-Count") ?? (Array.isArray(data) ? data.length : 0));
    return { data: data as never, total };
  },

  getOne: async ({ resource, id }) => {
    const res = await http(`/api/${resource}/${id}`);
    return { data: (await res.json()) as never };
  },

  getMany: async ({ resource, ids }) => {
    const res = await http(`/api/${resource}`);
    const all = (await res.json()) as { id: string }[];
    const set = new Set(ids.map(String));
    return { data: all.filter((r) => set.has(r.id)) as never };
  },

  create: async ({ resource, variables }) => {
    const res = await http(`/api/${resource}`, { method: "POST", body: JSON.stringify(variables) });
    return { data: (await res.json()) as never };
  },

  update: async ({ resource, id, variables }) => {
    const res = await http(`/api/${resource}/${id}`, { method: "PATCH", body: JSON.stringify(variables) });
    return { data: (await res.json()) as never };
  },

  deleteOne: async ({ resource, id }) => {
    const res = await http(`/api/${resource}/${id}`, { method: "DELETE" });
    return { data: (await res.json()) as never };
  },
};

// store hydrate 용 — 전체 리소스 스냅샷
export async function fetchBootstrap(): Promise<Record<string, unknown[]>> {
  const res = await http(`/api/bootstrap`);
  return res.json();
}
