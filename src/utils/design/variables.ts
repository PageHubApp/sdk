import { ROOT_NODE } from "@craftjs/core";

// ── Connector data context (set by editor when connector data is loaded) ────

let _connectorData: Record<string, Record<string, any[]>> | null = null;

/** Set connector data for variable resolution in the editor. */
export function setConnectorData(data: Record<string, Record<string, any[]>> | null) {
  _connectorData = data;
}

/** Get current connector data. */
export function getConnectorData() {
  return _connectorData;
}

// ── Client-side data fetcher (registerable handler) ───────────────────────────

type ClientDataFetcher = (provider: string, collection: string) => Promise<any[] | null>;

let _clientDataFetcher: ClientDataFetcher | null = null;

export function registerClientDataFetcher(fn: ClientDataFetcher) {
  _clientDataFetcher = fn;
}

export function getClientDataFetcher(): ClientDataFetcher | null {
  return _clientDataFetcher;
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
export const replaceVariables = (text: string | undefined, query: any, itemContext?: Record<string, any> | null): string => {
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

    // Replace variables like {{company.name}}, {{connector.stripe.products.0.title}}, etc.
    // This handles both plain text and HTML content
    return processed.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const trimmedVar = variable.trim();

      // Handle special dynamic variables
      if (trimmedVar === "year") {
        return new Date().getFullYear().toString();
      }

      // Handle item.* variables (scoped inside a data-bound repeater)
      if (trimmedVar.startsWith("item.") && itemContext) {
        const parts = trimmedVar.slice("item.".length).split(".");
        const value = walkPath(itemContext, parts);
        if (value !== undefined && value !== null && value !== "") return String(value);
        return match;
      }

      // Handle connector.* variables (e.g. connector.stripe.products.0.title)
      if (trimmedVar.startsWith("connector.") && _connectorData) {
        const parts = trimmedVar.slice("connector.".length).split(".");
        const value = walkPath(_connectorData, parts);
        if (value !== undefined && value !== null && value !== "") return String(value);
        // Support .length on arrays
        if (parts[parts.length - 1] === "length") {
          const parent = walkPath(_connectorData, parts.slice(0, -1));
          if (Array.isArray(parent)) return String(parent.length);
        }
        return match;
      }

      // Handle custom variables (variables.myKey -> lookup in rootProps.variables array)
      if (trimmedVar.startsWith("variables.")) {
        const varKey = trimmedVar.slice("variables.".length);
        const customVars = rootProps.variables;
        if (Array.isArray(customVars)) {
          const found = customVars.find((v: any) => v.key === varKey);
          if (found?.value) return String(found.value);
        }
        return match;
      }

      // Parse nested properties (e.g., "company.name" -> rootProps.company.name)
      const parts = trimmedVar.split(".");
      const value = walkPath(rootProps, parts);

      // Return the value if found and not empty, otherwise use default
      if (value !== undefined && value !== null && value !== "") {
        return String(value);
      }

      // Use default placeholder if available, otherwise return original
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

    // Handle item.* variables (show first item as preview in editor)
    if (varId.startsWith("item.") && _connectorData) {
      // Find the first collection with data and resolve against item[0]
      const parts = varId.slice("item.".length).split(".");
      for (const provider of Object.values(_connectorData)) {
        for (const items of Object.values(provider)) {
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

    // Add connector variables from loaded connector data
    if (_connectorData) {
      for (const [provider, collections] of Object.entries(_connectorData)) {
        for (const [collection, items] of Object.entries(collections)) {
          if (Array.isArray(items) && items.length > 0) {
            variables.push(`connector.${provider}.${collection}.length`);
            // Add field paths from the first item as examples
            const first = items[0];
            if (first && typeof first === "object") {
              for (const field of Object.keys(first)) {
                const val = first[field];
                if (val && typeof val === "object" && !Array.isArray(val)) {
                  // Nested object (e.g. price.formatted)
                  for (const subfield of Object.keys(val)) {
                    variables.push(`connector.${provider}.${collection}.0.${field}.${subfield}`);
                  }
                } else {
                  variables.push(`connector.${provider}.${collection}.0.${field}`);
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
