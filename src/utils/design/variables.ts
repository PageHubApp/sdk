import { ROOT_NODE } from "@craftjs/core";

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
}

export function getAuthState(): AuthState | null {
  return _authState;
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
  itemContext?: Record<string, any> | null
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
      const ternaryMatch = trimmedVar.match(
        /^(.+?)\s*(==|!=)\s*(.+?)\s*\?\s*(.+?)\s+:\s+(.+)$/
      );
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
      return defaultValue !== undefined ? defaultValue : match;
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
export const resolveVariable = (varId: string, query: any): string => {
  if (!varId) return "";

  try {
    // Handle dynamic variables
    if (varId === "year") {
      return new Date().getFullYear().toString();
    }

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
