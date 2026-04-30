import React, { useEffect, useSyncExternalStore } from "react";
import {
  getRuntimeVarsVersion,
  isRuntimeQueueDrained,
  markRuntimeQueueDrained,
  setRuntimeVar,
  subscribeRuntimeVars,
} from "./variables";

/**
 * Subscribe a component to runtime variable changes.
 * Returns the monotonic version number; consumers don't need to read it,
 * just calling the hook is enough to rerender on every setRuntimeVar call.
 */
export function useRuntimeVarsVersion(): number {
  return useSyncExternalStore(subscribeRuntimeVars, getRuntimeVarsVersion, getRuntimeVarsVersion);
}

/**
 * Mounts once at the top of every page (via Background).
 * Replaces the bootstrap-shim's queueing setVar with the live setRuntimeVar
 * and drains any values that were posted during HTML parse before hydration.
 *
 * Drain happens once per JS lifetime (guarded by module-level flag) — survives
 * Provider remounts on client-side Next.js navigations.
 */
export function RuntimeVarsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const PH = (window as any).PageHub;
    if (!PH) return;

    PH.setVar = (k: string, v: any) => setRuntimeVar(k, v);

    if (!isRuntimeQueueDrained()) {
      const queue: Array<[string, any]> = Array.isArray(PH._queue) ? PH._queue : [];
      for (const entry of queue) {
        if (Array.isArray(entry) && entry.length >= 2) {
          setRuntimeVar(entry[0], entry[1]);
        }
      }
      PH._queue = [];
      markRuntimeQueueDrained();
    }
  }, []);

  return <>{children}</>;
}
