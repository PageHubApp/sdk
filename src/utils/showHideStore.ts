/**
 * Compat shim — show-hide is now one consumer of the central state registry.
 *
 * All exports below delegate to `stateRegistry`. This file exists so the four
 * existing call sites (`Container`, `LayerHeader`, `PeekTargetButton`,
 * `useShowOnLoadAutoReveal`) keep compiling without churn while the rest of
 * the system migrates to the registry directly. Plan: delete this file in a
 * follow-up once consumers reference `stateRegistry` by name.
 */

import {
  applyVisibilityOverride,
  getGlobalTick,
  getVisibility,
  setVisibility,
  subscribe,
  toggleVisibility,
  useGlobalStateTick,
} from "./stateRegistry";

type State = "shown" | "hidden";

export function setShowHideState(target: string, state: State): void {
  setVisibility(target, state);
}

export function getShowHideState(target: string): State | undefined {
  return getVisibility(target);
}

export function toggleShowHideState(target: string): void {
  toggleVisibility(target);
}

export function getShowHideVersion(): number {
  return getGlobalTick();
}

export function subscribeShowHide(fn: () => void): () => void {
  return subscribe(fn);
}

export function useShowHideVersion(): number {
  return useGlobalStateTick();
}

export function applyShowHideOverride(
  className: string,
  target: string | undefined
): string {
  return applyVisibilityOverride(className, target);
}
