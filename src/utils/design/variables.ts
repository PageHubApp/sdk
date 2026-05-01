// Import directly from @craftjs/utils to avoid the broken ESM re-export
// chain in @craftjs/core that breaks tsx/Node ESM resolution in CLI scripts
// (e.g. backfill-template-previews.mjs). Same symbol, same value.
import { ROOT_NODE } from "@craftjs/utils";
import { getStateValue, setState } from "../state/stateRegistry";

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
  // dedicated CustomEvent. Replaces the legacy `pagehub:auth-changed` bus.
  // The dedicated `auth.*` variable interpolation + `auth` condition
  // evaluator continue to read `getAuthState()` directly — this state write
  // is purely the reactivity propagation.
  try {
    setState(
      "auth:status",
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
      console.error("Runtime var listener error:", e);
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

/** Walk a dot-separated path into a nested object, supporting array indices. */
function walkPath(obj: any, parts: string[]): any {
  let value = obj;
  for (const part of parts) {
    if (value && typeof value === "object") {
      if (Array.isArray(value) && /^\d+$/.test(part)) {
        value = value[parseInt(part, 10)];
      } else if (part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  return value;
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
 * Replaces variables in text with values from ROOT_NODE props
 * Supports syntax like: {{company.name}}, {{company.email}}, {{year}}, etc.
 * Uses default placeholder values when variables are not set.
 *
 * @param text - The text containing variable placeholders
 * @param query - The Craft.js query object to access ROOT_NODE
 * @returns Text with variables replaced by actual values or defaults
 */
export const replaceVariables = (
  text: string | undefined,
  query: any,
  itemContext?: Record<string, any> | null,
  anchors?: Readonly<Record<string, string>> | null
): string => {
  // Ensure text is a string and not null/undefined
  if (!text || typeof text !== "string") {
    return "";
  }

  try {
    const root = query.node(ROOT_NODE).get();
    if (!root) return text;

    const rootProps = root.data.props;

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

    // Resolve a single variable key to its string value (or undefined if not found).
    // Shared by normal replacement and ternary branch evaluation.
    const resolveVar = (key: string): string | undefined => {
      if (key === "year") return new Date().getFullYear().toString();

      // auth.* — e.g. auth.status, auth.customer.email
      if (key.startsWith("auth.")) {
        const auth = getAuthState();
        if (!auth) return undefined;
        const parts = key.slice("auth.".length).split(".");
        const value = walkPath(auth, parts);
        if (value !== undefined && value !== null && value !== "") return String(value);
        return undefined;
      }

      // state.<key>[.<dotPath>] — registry lookup, optionally walking into
      // a parsed-JSON value. State values are stored as strings; if the
      // entry is a JSON object/array (e.g. `pdp:abc:matching-variant` is the
      // serialized matched variant) authors can interpolate nested fields:
      //
      //   {{state.pdp:abc:matching-variant.formatted}}
      //
      // Splits on the FIRST `.` after `state.<key>` where `<key>` may contain
      // `:` and `-`. Practically: find the first `.` AFTER any `:` segment.
      // The anchor-pre-pass above already substituted `{{anchor.X}}` into
      // the key portion. Returns `undefined` for missing/empty so default-
      // value handling applies (matches connector/auth behavior).
      if (key.startsWith("state.")) {
        const rest = key.slice("state.".length);
        // Heuristic: state keys conventionally look like `ns:scope:field`
        // (using `:`). The first `.` AFTER the last `:` segment opens a
        // nested-path walk. When no `.` after a colon, treat the whole
        // remainder as the key.
        const lastColon = rest.lastIndexOf(":");
        const dotAfter = rest.indexOf(".", lastColon === -1 ? 0 : lastColon);
        const stateKey = dotAfter === -1 ? rest : rest.slice(0, dotAfter);
        const tail = dotAfter === -1 ? "" : rest.slice(dotAfter + 1);
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

      if (key.startsWith("item.") && itemContext) {
        const parts = key.slice("item.".length).split(".");
        const value = walkPath(itemContext, parts);
        if (value !== undefined && value !== null && value !== "") return String(value);
        return undefined;
      }

      if (key.startsWith("connector.") && _connectorData) {
        const parts = key.slice("connector.".length).split(".");
        const value = walkPath(_connectorData, parts);
        if (value !== undefined && value !== null && value !== "") return String(value);
        if (parts[parts.length - 1] === "length") {
          const parent = walkPath(_connectorData, parts.slice(0, -1));
          if (Array.isArray(parent)) return String(parent.length);
        }
        return undefined;
      }

      if (key.startsWith("variables.")) {
        const varKey = key.slice("variables.".length);
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

      const parts = key.split(".");
      const value = walkPath(rootProps, parts);
      if (value !== undefined && value !== null && value !== "") return String(value);
      return undefined;
    };

    // Replace variables like {{company.name}}, {{auth.status == logged-in ? /account : /login}}, etc.
    return processed.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      let trimmedVar = variable.trim();

      // ── Ternary: {{key == value ? ifTrue : ifFalse}} ──
      // Requires spaces around the else `:` to avoid matching ref: or https:
      const ternaryMatch = trimmedVar.match(/^(.+?)\s*(==|!=)\s*(.+?)\s*\?\s*(.+?)\s+:\s+(.+)$/);
      if (ternaryMatch) {
        const [, lhsRaw, op, rhsRaw, ifTrue, ifFalse] = ternaryMatch;
        const lhs = resolveVar(lhsRaw.trim()) ?? "";
        const rhs = rhsRaw.trim().replace(/^["']|["']$/g, "");
        const passes = op === "==" ? lhs === rhs : lhs !== rhs;
        return (passes ? ifTrue : ifFalse).trim().replace(/^["']|["']$/g, "");
      }
      // Bare truthiness: {{auth.status ? /yes : /no}}
      const truthyMatch = trimmedVar.match(/^(.+?)\s*\?\s*(.+?)\s+:\s+(.+)$/);
      if (truthyMatch) {
        const [, keyRaw, ifTrue, ifFalse] = truthyMatch;
        const value = resolveVar(keyRaw.trim());
        const passes = value !== undefined && value !== "" && value !== "false";
        return (passes ? ifTrue : ifFalse).trim().replace(/^["']|["']$/g, "");
      }

      // ── Standard variable with optional || fallback ──
      let fallback: string | null = null;
      const pipeIdx = trimmedVar.indexOf("||");
      if (pipeIdx !== -1) {
        fallback = trimmedVar
          .slice(pipeIdx + 2)
          .trim()
          .replace(/^["']|["']$/g, "");
        trimmedVar = trimmedVar.slice(0, pipeIdx).trim();
      }

      const resolved = resolveVar(trimmedVar);
      if (resolved !== undefined) return resolved;
      if (fallback !== null) return fallback;

      const defaultValue = DEFAULT_VALUES[trimmedVar];
      if (defaultValue !== undefined) return defaultValue;

      // Unresolved `item.*` / `connector.*` / `auth.*` are context-dependent
      // and leaking the raw `{{...}}` literal looks broken on live sites.
      // Render as empty string so empty templates at least render cleanly
      // (customer skeletons, pre-client-fetch repeater cards, etc.).
      if (
        trimmedVar.startsWith("item.") ||
        trimmedVar.startsWith("connector.") ||
        trimmedVar.startsWith("auth.") ||
        trimmedVar.startsWith("variables.")
      ) {
        return "";
      }

      return match;
    });
  } catch (e) {
    console.error("Error replacing variables:", e);
    return text;
  }
};

/**
 * Resolves a single variable ID to its display value.
 * Used by the VariableNode editor view to show rendered text.
 */
export const resolveVariable = (
  varId: string,
  query: any,
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
    if (resolvedId.startsWith("state.")) {
      const rest = resolvedId.slice("state.".length);
      const lastColon = rest.lastIndexOf(":");
      const dotAfter = rest.indexOf(".", lastColon === -1 ? 0 : lastColon);
      const stateKey = dotAfter === -1 ? rest : rest.slice(0, dotAfter);
      const tail = dotAfter === -1 ? "" : rest.slice(dotAfter + 1);
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
    if (varId.startsWith("auth.")) {
      const auth = getAuthState();
      if (!auth) return varId;
      const parts = varId.slice("auth.".length).split(".");
      const value = walkPath(auth, parts);
      if (value !== undefined && value !== null && value !== "") return String(value);
      return varId;
    }

    // Handle item.* variables (show first item as preview in editor)
    if (varId.startsWith("item.") && _connectorData) {
      const parts = varId.slice("item.".length).split(".");
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

    // Handle connector.* variables
    if (varId.startsWith("connector.") && _connectorData) {
      const parts = varId.slice("connector.".length).split(".");
      const value = walkPath(_connectorData, parts);
      if (value !== undefined && value !== null && value !== "") return String(value);
      if (parts[parts.length - 1] === "length") {
        const parent = walkPath(_connectorData, parts.slice(0, -1));
        if (Array.isArray(parent)) return String(parent.length);
      }
      return varId;
    }

    const root = query.node(ROOT_NODE).get();
    if (!root) return DEFAULT_VALUES[varId] || varId;

    const rootProps = root.data.props;

    // Handle custom variables
    if (varId.startsWith("variables.")) {
      const varKey = varId.slice("variables.".length);
      if (Object.prototype.hasOwnProperty.call(_runtimeVars, varKey)) {
        const rv = _runtimeVars[varKey];
        if (rv !== undefined && rv !== null && rv !== "") return rv;
      }
      const customVars = rootProps.variables;
      if (Array.isArray(customVars)) {
        const found = customVars.find((v: any) => v.key === varKey);
        if (found?.value) return String(found.value);
      }
      return varId;
    }

    const parts = varId.split(".");
    const value = walkPath(rootProps, parts);

    if (value !== undefined && value !== null && value !== "") {
      return String(value);
    }

    return DEFAULT_VALUES[varId] || varId;
  } catch {
    return DEFAULT_VALUES[varId] || varId;
  }
};

/**
 * Get available variables from ROOT_NODE for display/autocomplete
 */
export const getAvailableVariables = (query: any): string[] => {
  try {
    const root = query.node(ROOT_NODE).get();
    if (!root) return [];

    const rootProps = root.data.props;
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
    console.error("Error getting available variables:", e);
    return [];
  }
};
