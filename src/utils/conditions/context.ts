import { getConnectorData, getAuthState, type AuthState } from "../design/variables";
import type { ConditionContext } from "./types";

/**
 * Build a ConditionContext for client-side (viewer/editor) use. Render-time
 * callers pass `auth` from `useAuthState()` so SSR and hydration agree; event
 * handlers / effects can omit it and read the live store.
 */
export function buildClientContext(
  rootProps: any,
  item: Record<string, any> | null = null,
  anchors: Readonly<Record<string, string>> | undefined = undefined,
  auth: AuthState | null = getAuthState()
): ConditionContext {
  return {
    urlParams: typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null,
    formFields: null, // populated by form field observer when needed
    connectorData: getConnectorData(),
    company: rootProps?.company || null,
    viewportWidth: typeof window !== "undefined" ? window.innerWidth : null,
    auth,
    item,
    mobileBreakpoint: rootProps?.theme?.breakpoints?.md,
    anchors,
  };
}

/** Build a ConditionContext for static rendering (no window, no live data). */
export function buildStaticContext(
  rootProps: Record<string, any> | null,
  item: Record<string, any> | null = null,
  connectorData: ConditionContext["connectorData"] = null,
  anchors: Readonly<Record<string, string>> | undefined = undefined
): ConditionContext {
  return {
    urlParams: null,
    formFields: null,
    connectorData,
    company: rootProps?.company || null,
    viewportWidth: null,
    auth: null,
    item,
    mobileBreakpoint: rootProps?.theme?.breakpoints?.md,
    anchors,
  };
}
