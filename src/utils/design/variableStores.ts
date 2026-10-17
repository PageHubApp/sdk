/**
 * Module-level stores the variable resolver reads: connector data, the
 * client data fetcher, site-customer auth state, runtime vars
 * (window.PageHub.setVar) and the render mode. Re-exported from
 * ./variables, which is the public import path.
 */
import { setState } from "../state/stateRegistry";
import { STATE_KEY } from "../state/keys";
import { sdkLog } from "../logger";

// ── Connector data context (set by editor when connector data is loaded) ────
export interface SdkBindingMeta {
  totalCount?: number;
  totalPages?: number;
  hasMore?: boolean;
}

export interface SdkConnectorProviderData {
  bindings: Record<string, any[]>;
  bindingsMeta?: Record<string, SdkBindingMeta>;
}

/** Matches ConnectorDataMap: provider → { bindings, bindingsMeta }. */
let _connectorData: Record<string, SdkConnectorProviderData> | null = null;

/** Set connector data for variable resolution in the editor. */
export function setConnectorData(data: Record<string, SdkConnectorProviderData> | null) {
  _connectorData = data;
}

/** Get current connector data. */
export function getConnectorData() {
  return _connectorData;
}

/** Meta for a single binding (pagination totals, hasMore). Null if unknown. */
export function getBindingMeta(provider: string, bindingId: string): SdkBindingMeta | null {
  return _connectorData?.[provider]?.bindingsMeta?.[bindingId] ?? null;
}

// ── Client-side data fetcher (registerable handler) ───────────────────────────

export interface ClientDataFetchOptions {
  /** Arbitrary keys passed through to the server (query, category, sort, etc.). */
  [key: string]: any;
}

/** Rows, or rows plus this query's page totals (published to `publishStateKeys`). */
export type ClientDataFetchResult = any[] | { items: any[]; meta?: SdkBindingMeta } | null;

type ClientDataFetcher = (
  provider: string,
  collection: string,
  options?: ClientDataFetchOptions
) => Promise<ClientDataFetchResult>;

let _clientDataFetcher: ClientDataFetcher | null = null;

export function registerClientDataFetcher(fn: ClientDataFetcher) {
  _clientDataFetcher = fn;
}

export function getClientDataFetcher(): ClientDataFetcher | null {
  return _clientDataFetcher;
}

// ── Auth state (set by app, read by condition evaluator) ──────────────────────

export interface AuthCustomer {
  email?: string;
  name?: string;
  orderCount?: number;
  totalSpent?: number;
  hasSubscription?: boolean;
  currency?: string;
}

export interface AuthState {
  status: "logged-in" | "logged-out";
  customer?: AuthCustomer | null;
}

// Client-side live auth. Never written during SSR (the app sets it from a
// layout effect / token verify), so it can't leak between server requests.
// Render-time reads go through `useAuthState()`, which falls back to the
// per-request `AuthStateProvider` value on the server and during hydration.
let _authState: AuthState | null = null;
const _authListeners = new Set<() => void>();

/** Subscribe to `setAuthState` writes. Returns an unsubscribe fn. */
export function subscribeAuthState(fn: () => void): () => void {
  _authListeners.add(fn);
  return () => {
    _authListeners.delete(fn);
  };
}

export function setAuthState(state: AuthState | null) {
  _authState = state;
  _authListeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      sdkLog.error("Auth state listener error:", e);
    }
  });
  // Mirror status into the central state registry so any subscriber (state
  // condition, stateModifiers, useGlobalStateTick) re-evaluates without a
  // dedicated CustomEvent. The dedicated `auth.*` variable interpolation +
  // `auth` condition evaluator continue to read `getAuthState()` directly —
  // this state write is purely the reactivity propagation.
  try {
    setState(
      STATE_KEY.authStatus,
      { kind: "value", value: state?.status ?? "logged-out", source: "runtime" },
      "auth"
    );
  } catch {
    /* registry might not be available in the same tick; safe to ignore */
  }
}

export function getAuthState(): AuthState | null {
  return _authState;
}

// ── Runtime variables (set at runtime via window.PageHub.setVar) ──────────────
//
// Mirrors the connector / auth setter pattern. Updates are IMMUTABLE — the
// store reference is replaced on every set so React's useSyncExternalStore can
// detect the change cleanly. A monotonic version number is exposed so the
// useSyncExternalStore snapshot is a primitive (no re-render-on-every-render).

let _runtimeVars: Record<string, string> = {};
let _runtimeVersion = 0;
const _runtimeListeners = new Set<() => void>();

/** Set a runtime variable. Coerces to string. Triggers subscribers. */
export function setRuntimeVar(key: string, value: any): void {
  if (!key || typeof key !== "string") return;
  const stringValue = value == null ? "" : String(value);
  _runtimeVars = { ..._runtimeVars, [key]: stringValue };
  _runtimeVersion++;
  _runtimeListeners.forEach(fn => {
    try {
      fn();
    } catch (e) {
      sdkLog.error("Runtime var listener error:", e);
    }
  });
}

/** Read the current runtime vars snapshot. */
export function getRuntimeVars(): Record<string, string> {
  return _runtimeVars;
}

/** Monotonic version — used as the useSyncExternalStore snapshot. */
export function getRuntimeVarsVersion(): number {
  return _runtimeVersion;
}

/** Subscribe to runtime var changes. Returns an unsubscribe fn. */
export function subscribeRuntimeVars(fn: () => void): () => void {
  _runtimeListeners.add(fn);
  return () => {
    _runtimeListeners.delete(fn);
  };
}

let _queueDrained = false;
export function isRuntimeQueueDrained(): boolean {
  return _queueDrained;
}
export function markRuntimeQueueDrained(): void {
  _queueDrained = true;
}

// Render mode — the editor sets "editor" at boot (app `PageHubEditorIntegration`);
// published / viewer / SSR leave the default "viewer". Gates whether an unset
// {{company.*}} var falls back to placeholder seed copy (editor preview) or
// renders empty (live site must never ship "Acme Inc." etc.). Default "viewer"
// keeps published pages safe even if a consumer never calls the setter.
let _renderMode: "editor" | "viewer" = "viewer";

/** Set the variable-resolution render mode (editor shows seed defaults, viewer blanks them). */
export function setRenderMode(mode: "editor" | "viewer"): void {
  _renderMode = mode;
}

/** Current render mode. */
export function getRenderMode(): "editor" | "viewer" {
  return _renderMode;
}
