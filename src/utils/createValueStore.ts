import { useSyncExternalStore } from "react";

/** One value with change notification, for state shared across a component tree without re-rendering its root. */
export interface ValueStore<T> {
  get(): T;
  set(next: T): void;
  subscribe(listener: () => void): () => void;
}

export function createValueStore<T>(
  initial: T,
  equals: (a: T, b: T) => boolean = Object.is
): ValueStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      if (equals(value, next)) return;
      value = next;
      for (const l of listeners) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Subscribe to a store, re-rendering only when the selected value changes.
 * `select` should return a primitive or a stable reference.
 */
export function useValueStore<T, S = T>(
  store: Pick<ValueStore<T>, "get" | "subscribe">,
  select: (value: T) => S = v => v as unknown as S,
  serverValue?: T
): S {
  return useSyncExternalStore(
    store.subscribe,
    () => select(store.get()),
    () => select(serverValue ?? store.get())
  );
}
