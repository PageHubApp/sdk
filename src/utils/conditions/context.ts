import { getConnectorData, getAuthState } from "../design/variables";
import type { ConditionContext } from "./types";

/** Build a ConditionContext for client-side (viewer/editor) use. */
export function buildClientContext(
  rootProps: any,
  item: Record<string, any> | null = null
): ConditionContext {
  return {
    urlParams: typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null,
    formFields: null, // populated by form field observer when needed
    connectorData: getConnectorData(),
    company: rootProps?.company || null,
    viewportWidth: typeof window !== "undefined" ? window.innerWidth : null,
    auth: getAuthState(),
    item,
  };
}

/** Build a ConditionContext for static rendering (no window, no live data). */
export function buildStaticContext(
  rootProps: Record<string, any> | null,
  item: Record<string, any> | null = null
): ConditionContext {
  return {
    urlParams: null,
    formFields: null,
    connectorData: null,
    company: rootProps?.company || null,
    viewportWidth: null,
    auth: null,
    item,
  };
}
