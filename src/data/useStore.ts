// 인메모리 store에 대한 경량 리액티브 훅 (Refine 캐시 대신 단순 버전 카운터로 재렌더).
import { useCallback, useSyncExternalStore } from "react";
import { store, type ResourceName } from "./store";

let version = 0;
const listeners = new Set<() => void>();

function emit() {
  version += 1;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useStoreVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => version);
}

// 백엔드 연결 상태 (hydrate 성공 시 true)
let connected = false;
export function setConnected(v: boolean) {
  if (connected !== v) {
    connected = v;
    emit();
  }
}
export function useConnected(): boolean {
  return useSyncExternalStore(subscribe, () => connected, () => connected);
}

/** 변경 함수 래퍼 — 실행 후 구독자에게 알림 */
export function useMutate() {
  return useCallback(<T>(fn: () => T): T => {
    const r = fn();
    emit();
    return r;
  }, []);
}

export function useList<T = unknown>(resource: ResourceName): T[] {
  useStoreVersion();
  return store.list<T>(resource);
}

export function useOne<T = unknown>(resource: ResourceName, id?: string): T | undefined {
  useStoreVersion();
  return id ? store.get<T>(resource, id) : undefined;
}

export { store };
