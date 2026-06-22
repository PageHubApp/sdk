import { getStateValue, setState } from "../state/stateRegistry";
import { STATE_KEY, VAR_PREFIX } from "../state/keys";
import { sdkLog } from "../logger";
import { walkPath } from "../walkPath";

/**
 * Shape of ROOT_NODE props that the variable / page / media / action helpers
 * need to read at runtime. Editor call sites read this once via
 * `query.node(ROOT_NODE).get()?.data?.props` and pass forward; the walker
 * provides it directly from the parsed NodeMap.
 */
export type RootProps = Record<string, any>;

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

type ClientDataFetcher = (
  provider: string,
  collection: string,
  options?: ClientDataFetchOptions
) => Promise<any[] | null>;

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

let _authState: AuthState | null = null;

export function setAuthState(state: AuthState | null) {
  _authState = state;
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

// Default placeholder values for company variables
const DEFAULT_VALUES: Record<string, string> = {
  "company.name": "Acme Inc.",
  "company.tagline": "The ultimate solution to all your problems!",
  "company.type": "technology",
  "company.location": "Los Angeles, CA",
  "company.address": "123 Main St, Suite 100 Los Angeles, CA 90001",
  "company.phone": "(555) 123-4567",
  "company.email": "contact@acme.com",
  "company.website": "https://www.acme.com",
};

/**
 * Split a `state.` lookup remainder into the registry key and an optional nested
 * JSON path. State keys conventionally look like `ns:scope:field` (colon-
 * delimited), so the first `.` AFTER the last `:` opens the JSON walk — e.g.
 * `pdp:abc:matching-variant.formatted` →
 * `{ stateKey: "pdp:abc:matching-variant", tail: "formatted" }`. Shared by
 * `replaceVariables` (runtime) and `resolveVariable` (editor preview) so the
 * heuristic can't drift between them.
 */
function splitStateKeyPath(rest: string): { stateKey: string; tail: string } {
  const lastColon = rest.lastIndexOf(":");
  const dotAfter = rest.indexOf(".", lastColon === -1 ? 0 : lastColon);
  return dotAfter === -1
    ? { stateKey: rest, tail: "" }
    : { stateKey: rest.slice(0, dotAfter), tail: rest.slice(dotAfter + 1) };
}

// ── Per-domain variable resolvers ─────────────────────────────────────────────
//
// Each resolves ONE variable namespace to a string, or `undefined` on miss, so
// callers can layer their own miss policy on top (`replaceVariables` →
// default / fallback / empty; `resolveVariable` → raw `varId` / `DEFAULT_VALUES`).
// `replaceVariables`' runtime `resolveVar` dispatches to these; the editor-
// preview `resolveVariable` reuses the ones whose behavior is identical
// (auth / connector / variables / generic root-prop). It KEEPS its own inline
// `state` and `item` handling because those genuinely DIVERGE:
//   • state — `resolveVariable` returns "" for a JSON tail that walks to an
//     empty string, where the runtime treats "" as a miss.
//   • item  — runtime binds the live repeater `itemContext`; the editor binds
//     the connector first-item *preview*. (Do NOT merge these.)

/** auth.* — e.g. auth.status, auth.customer.email. */
function resolveAuthVar(key: string): string | undefined {
  const auth = getAuthState();
  if (!auth) return undefined;
  const parts = key.slice(VAR_PREFIX.auth.length).split(".");
  const value = walkPath(auth, parts);
  if (value !== undefined && value !== null && value !== "") return String(value);
  return undefined;
}

/**
 * state.<key>[.<dotPath>] — registry lookup, optionally walking into a parsed-
 * JSON value. State values are stored as strings; when the entry is serialized
 * JSON (e.g. `pdp:abc:matching-variant` is the serialized matched variant)
 * authors can interpolate nested fields:
 *
 *   {{state.pdp:abc:matching-variant.formatted}}
 *
 * `splitStateKeyPath` finds the first `.` AFTER the last `:` to separate the
 * registry key from the nested path. Returns `undefined` for missing/empty (so
 * the caller's default handling applies) and for a tail that walks to empty —
 * matching connector / auth behavior.
 */
function resolveStateVar(key: string): string | undefined {
  const rest = key.slice(VAR_PREFIX.state.length);
  const { stateKey, tail } = splitStateKeyPath(rest);
  const raw = getStateValue(stateKey);
  if (raw == null || raw === "") return undefined;
  if (!tail) return String(raw);
  // Tail present → try parsing the value as JSON and walk.
  try {
    const parsed = JSON.parse(raw);
    const walked = walkPath(parsed, tail.split("."));
    if (walked !== undefined && walked !== null && walked !== "") return String(walked);
  } catch {
    /* not JSON; fall through */
  }
  return undefined;
}

/** item.* — resolves against the live repeater item context (runtime only). */
function resolveItemVar(key: string, itemContext: Record<string, any>): string | undefined {
  const parts = key.slice(VAR_PREFIX.item.length).split(".");
  const value = walkPath(itemContext, parts);
  if (value !== undefined && value !== null && value !== "") return String(value);
  return undefined;
}

/**
 * connector.* — walks the loaded connector data map. Assumes `_connectorData`
 * is set; call sites gate on `_connectorData` so the no-connector case falls
 * through to the generic root-prop walk (preserved from both original callers).
 */
function resolveConnectorVar(key: string): string | undefined {
  const data = _connectorData;
  if (!data) return undefined;
  const parts = key.slice(VAR_PREFIX.connector.length).split(".");
  const value = walkPath(data, parts);
  if (value !== undefined && value !== null && value !== "") return String(value);
  if (parts[parts.length - 1] === "length") {
    const parent = walkPath(data, parts.slice(0, -1));
    if (Array.isArray(parent)) return String(parent.length);
  }
  return undefined;
}

/** variables.* — runtime store (window.PageHub.setVar) wins, then rootProps. */
function resolveVariablesVar(key: string, rootProps: RootProps): string | undefined {
  const varKey = key.slice(VAR_PREFIX.variables.length);
  // Runtime store wins (window.PageHub.setVar)
  if (Object.prototype.hasOwnProperty.call(_runtimeVars, varKey)) {
    const rv = _runtimeVars[varKey];
    if (rv !== undefined && rv !== null && rv !== "") return rv;
  }
  const customVars = rootProps.variables;
  if (Array.isArray(customVars)) {
    const found = customVars.find((v: any) => v.key === varKey);
    if (found?.value) return String(found.value);
  }
  return undefined;
}

/** Generic dotted lookup into ROOT props (company.*, etc.). */
function resolveRootPropVar(key: string, rootProps: RootProps): string | undefined {
  const parts = key.split(".");
  const value = walkPath(rootProps, parts);
  if (value !== undefined && value !== null && value !== "") return String(value);
  return undefined;
}

// ── Template expression parsing ───────────────────────────────────────────────

type ParsedTemplateExpr =
  | { kind: "ternary"; lhs: string; op: "==" | "!="; rhs: string; ifTrue: string; ifFalse: string }
  | { kind: "truthy"; key: string; ifTrue: string; ifFalse: string }
  | { kind: "plain"; key: string; fallback: string | null };

const stripQuotes = (s: string): string => s.replace(/^["']|["']$/g, "");

/**
 * Parse the inner expression of a `{{...}}` token into a structured form.
 * Pure (no resolution) so it's unit-testable in isolation; the caller resolves
 * `lhs` / `key` and applies its own miss policy. Match order — ternary, then
 * truthy, then plain `||` — mirrors the original inline branching exactly, and
 * quote-stripping / trimming of the literal branches is applied unconditionally
 * (the original applied the identical transform to whichever branch was chosen).
 */
function parseTemplateExpr(raw: string): ParsedTemplateExpr {
  const trimmed = raw.trim();

  // ── Ternary: {{key == value ? ifTrue : ifFalse}} ──
  // Requires spaces around the else `:` to avoid matching ref: or https:
  const ternaryMatch = trimmed.match(/^(.+?)\s*(==|!=)\s*(.+?)\s*\?\s*(.+?)\s+:\s+(.+)$/);
  if (ternaryMatch) {
    const [, lhsRaw, op, rhsRaw, ifTrue, ifFalse] = ternaryMatch;
    return {
      kind: "ternary",
      lhs: lhsRaw.trim(),
      op: op as "==" | "!=",
      rhs: stripQuotes(rhsRaw.trim()),
      ifTrue: stripQuotes(ifTrue.trim()),
      ifFalse: stripQuotes(ifFalse.trim()),
    };
  }

  // ── Bare truthiness: {{auth.status ? /yes : /no}} ──
  const truthyMatch = trimmed.match(/^(.+?)\s*\?\s*(.+?)\s+:\s+(.+)$/);
  if (truthyMatch) {
    const [, keyRaw, ifTrue, ifFalse] = truthyMatch;
    return {
      kind: "truthy",
      key: keyRaw.trim(),
      ifTrue: stripQuotes(ifTrue.trim()),
      ifFalse: stripQuotes(ifFalse.trim()),
    };
  }

  // ── Standard variable with optional || fallback ──
  const pipeIdx = trimmed.indexOf("||");
  if (pipeIdx !== -1) {
    return {
      kind: "plain",
      key: trimmed.slice(0, pipeIdx).trim(),
      fallback: stripQuotes(trimmed.slice(pipeIdx + 2).trim()),
    };
  }
  return { kind: "plain", key: trimmed, fallback: null };
}

/**
 * Replaces variables in text with values from ROOT_NODE props
 * Supports syntax like: {{company.name}}, {{company.email}}, {{year}}, etc.
 * Uses default placeholder values when variables are not set.
 *
 * @param text - The text containing variable placeholders
 * @param rootProps - ROOT_NODE props (read once at the editor boundary or supplied by walker)
 * @returns Text with variables replaced by actual values or defaults
 */
export const replaceVariables = (
  text: string | undefined,
  rootProps: RootProps | null | undefined,
  itemContext?: Record<string, any> | null,
  anchors?: Readonly<Record<string, string>> | null
): string => {
  // Ensure text is a string and not null/undefined
  if (!text || typeof text !== "string") {
    return "";
  }

  try {
    if (!rootProps) return text;

    // First, unwrap <span data-variable="...">{{...}}</span> to just {{...}}
    // so the regex below can replace them cleanly without leftover wrapper spans
    let processed = text.replace(
      /<span[^>]*data-variable="([^"]*)"[^>]*>\{\{[^}]*\}\}<\/span>/g,
      (_, varName) => `{{${varName}}}`
    );

    // Pre-pass: resolve `{{anchor.X}}` tokens against the wrapper-supplied
    // anchor map FIRST, so nested forms like `{{state.{{anchor.chat}}:title}}`
    // turn into `{{state.ph-chat-XYZ:title}}` before the main pass runs.
    // Authors typically write anchor tokens inside state lookups; bare
    // `{{anchor.X}}` is also valid (resolves to the id string).
    if (anchors) {
      processed = processed.replace(
        /\{\{anchor\.([a-zA-Z0-9_-]+)\}\}/g,
        (_, k) => anchors[k] ?? ""
      );
    }

    // Resolve a single variable key to its string value (or undefined if not
    // found). Shared by normal replacement and ternary branch evaluation. Thin
    // dispatcher over the module-level per-domain resolvers; the `&& itemContext`
    // / `&& _connectorData` guards preserve the original fall-through to the
    // generic root-prop walk when those contexts are absent.
    const resolveVar = (key: string): string | undefined => {
      if (key === "year") return new Date().getFullYear().toString();
      if (key.startsWith(VAR_PREFIX.auth)) return resolveAuthVar(key);
      if (key.startsWith(VAR_PREFIX.state)) return resolveStateVar(key);
      if (key.startsWith(VAR_PREFIX.item) && itemContext) return resolveItemVar(key, itemContext);
      if (key.startsWith(VAR_PREFIX.connector) && _connectorData) return resolveConnectorVar(key);
      if (key.startsWith(VAR_PREFIX.variables)) return resolveVariablesVar(key, rootProps);
      return resolveRootPropVar(key, rootProps);
    };

    // Replace variables like {{company.name}}, {{auth.status == logged-in ? /account : /login}}, etc.
    return processed.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const expr = parseTemplateExpr(variable);

      // ── Ternary: {{key == value ? ifTrue : ifFalse}} ──
      if (expr.kind === "ternary") {
        const lhs = resolveVar(expr.lhs) ?? "";
        const passes = expr.op === "==" ? lhs === expr.rhs : lhs !== expr.rhs;
        return passes ? expr.ifTrue : expr.ifFalse;
      }
      // ── Bare truthiness: {{auth.status ? /yes : /no}} ──
      if (expr.kind === "truthy") {
        const value = resolveVar(expr.key);
        const passes = value !== undefined && value !== "" && value !== "false";
        return passes ? expr.ifTrue : expr.ifFalse;
      }

      // ── Standard variable with optional || fallback ──
      const resolved = resolveVar(expr.key);
      if (resolved !== undefined) return resolved;
      if (expr.fallback !== null) return expr.fallback;

      // Editor shows realistic placeholder defaults (Acme Inc., etc.) so authors
      // preview a populated page. On the live site we must NOT ship that seed copy
      // for an unset {{company.*}} — render it empty instead.
      if (_renderMode === "editor") {
        const defaultValue = DEFAULT_VALUES[expr.key];
        if (defaultValue !== undefined) return defaultValue;
      } else if (expr.key.startsWith("company.")) {
        return "";
      }

      // Unresolved `item.*` / `connector.*` / `auth.*` are context-dependent
      // and leaking the raw `{{...}}` literal looks broken on live sites.
      // Render as empty string so empty templates at least render cleanly
      // (customer skeletons, pre-client-fetch repeater cards, etc.).
      if (
        expr.key.startsWith(VAR_PREFIX.item) ||
        expr.key.startsWith(VAR_PREFIX.connector) ||
        expr.key.startsWith(VAR_PREFIX.auth) ||
        expr.key.startsWith(VAR_PREFIX.variables)
      ) {
        return "";
      }

      return match;
    });
  } catch (e) {
    sdkLog.error("Error replacing variables:", e);
    return text;
  }
};

/**
 * Resolves a single variable ID to its display value.
 * Used by the VariableNode editor view to show rendered text.
 */
export const resolveVariable = (
  varId: string,
  rootProps: RootProps | null | undefined,
  anchors?: Readonly<Record<string, string>> | null
): string => {
  if (!varId) return "";

  try {
    // Resolve `{{anchor.X}}` tokens inside the varId so chips like
    // `state.{{anchor.chat}}:assistantName` work in the editor preview.
    let resolvedId = varId;
    if (anchors && resolvedId.includes("{{anchor.")) {
      resolvedId = resolvedId.replace(
        /\{\{anchor\.([a-zA-Z0-9_-]+)\}\}/g,
        (_, k) => anchors[k] ?? ""
      );
    }

    // Handle dynamic variables
    if (resolvedId === "year") {
      return new Date().getFullYear().toString();
    }

    // state.<key>[.<dotPath>] — central registry lookup. Mirrors the
    // logic in replaceVariables so editor chips display live state.
    if (resolvedId.startsWith(VAR_PREFIX.state)) {
      const rest = resolvedId.slice(VAR_PREFIX.state.length);
      const { stateKey, tail } = splitStateKeyPath(rest);
      const raw = getStateValue(stateKey);
      if (raw == null || raw === "") return varId;
      if (!tail) return String(raw);
      try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        const v = walkPath(parsed, tail.split("."));
        return v == null ? varId : String(v);
      } catch {
        return varId;
      }
    }
    // Replace the outer varId with anchor-resolved form for downstream
    // branches so they see the resolved id.
    varId = resolvedId;

    // Handle auth.* variables
    if (varId.startsWith(VAR_PREFIX.auth)) return resolveAuthVar(varId) ?? varId;

    // Handle item.* variables (show first item as preview in editor) — KEPT
    // inline: this resolves against the connector first-item preview, NOT the
    // live repeater `itemContext` the runtime resolver uses. Do not merge.
    if (varId.startsWith(VAR_PREFIX.item) && _connectorData) {
      const parts = varId.slice(VAR_PREFIX.item.length).split(".");
      for (const provider of Object.values(_connectorData)) {
        const bindings = provider?.bindings;
        if (!bindings) continue;
        for (const items of Object.values(bindings)) {
          if (Array.isArray(items) && items.length > 0) {
            const value = walkPath(items[0], parts);
            if (value !== undefined && value !== null && value !== "") return String(value);
          }
        }
      }
      return varId;
    }

    // Handle connector.* variables (no-connector case falls through, as before)
    if (varId.startsWith(VAR_PREFIX.connector) && _connectorData)
      return resolveConnectorVar(varId) ?? varId;

    if (!rootProps) return DEFAULT_VALUES[varId] || varId;

    // Handle custom variables
    if (varId.startsWith(VAR_PREFIX.variables)) return resolveVariablesVar(varId, rootProps) ?? varId;

    return resolveRootPropVar(varId, rootProps) ?? (DEFAULT_VALUES[varId] || varId);
  } catch {
    return DEFAULT_VALUES[varId] || varId;
  }
};

/**
 * Get available variables from ROOT_NODE for display/autocomplete
 */
export const getAvailableVariables = (rootProps: RootProps | null | undefined): string[] => {
  try {
    if (!rootProps) return [];

    const variables: string[] = [];

    // Add auth variables
    const auth = getAuthState();
    if (auth) {
      variables.push("auth.status");
      if (auth.customer) {
        for (const key of Object.keys(auth.customer)) {
          variables.push(`auth.customer.${key}`);
        }
      }
    }

    // Add company variables if they exist
    if (rootProps.company && typeof rootProps.company === "object") {
      Object.keys(rootProps.company).forEach(key => {
        if (rootProps.company[key]) {
          variables.push(`company.${key}`);
        }
      });
    }

    // Add custom variables
    if (Array.isArray(rootProps.variables)) {
      rootProps.variables.forEach((v: any) => {
        if (v.key && v.value) {
          variables.push(`variables.${v.key}`);
        }
      });
    }

    // Add connector variables — paths: connector.<provider>.bindings.<bindingId>.0.*
    if (_connectorData) {
      for (const [provider, pdata] of Object.entries(_connectorData)) {
        const bindings = pdata?.bindings;
        if (!bindings) continue;
        for (const [bindingId, items] of Object.entries(bindings)) {
          if (Array.isArray(items) && items.length > 0) {
            const base = `connector.${provider}.bindings.${bindingId}`;
            variables.push(`${base}.length`);
            const first = items[0];
            if (first && typeof first === "object") {
              for (const field of Object.keys(first)) {
                const val = first[field];
                if (val && typeof val === "object" && !Array.isArray(val)) {
                  for (const subfield of Object.keys(val)) {
                    variables.push(`${base}.0.${field}.${subfield}`);
                  }
                } else {
                  variables.push(`${base}.0.${field}`);
                }
              }
            }
          }
        }
      }
    }

    return variables;
  } catch (e) {
    sdkLog.error("Error getting available variables:", e);
    return [];
  }
};
