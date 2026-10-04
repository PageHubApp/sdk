import { useEffect, useRef } from "react";

import { setState } from "../../utils/state/stateRegistry";
import {
  createInViewTracker,
  normalizeInViewState,
  pickInViewWinner,
  type InViewTracker,
} from "../../utils/state/inViewTracker";

let tracker: InViewTracker | null = null;

function getTracker(): InViewTracker {
  if (!tracker) {
    tracker = createInViewTracker(pickInViewWinner, (key, value) =>
      setState(key, { kind: "value", value, source: "runtime" }, "in-view")
    );
  }
  return tracker;
}

/**
 * React side of `inViewState` (spec: docs/sdk/in-view-state.md). Joins this
 * Container's element to its group in the shared tracker. Off when `active`
 * is false — the editor canvas passes `!ctx.enabled`, same gate as scroll
 * effects, so authoring never drives the registry.
 *
 * Returns a `wrapProp` mutator the caller runs on its assembled `prop`, like
 * `useContainerScrollEffect`: it chains the element ref.
 */
export function useContainerInViewState(
  raw: unknown,
  active: boolean
): { wrapProp: (prop: any) => void } {
  const elRef = useRef<Element | null>(null);
  const cfg = active ? normalizeInViewState(raw) : null;
  const key = cfg?.key ?? "";
  const value = cfg?.value ?? "";

  useEffect(() => {
    const el = elRef.current;
    if (!key || !el || typeof window === "undefined") return;
    return getTracker().add(el, key, value);
  }, [key, value]);

  const wrapProp = (prop: any) => {
    if (!key) return;
    const origRef = prop.ref;
    prop.ref = (r: any) => {
      elRef.current = r;
      if (origRef) origRef(r);
    };
  };

  return { wrapProp };
}
