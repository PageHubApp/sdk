import { ROOT_NODE } from "@craftjs/core";

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
export const replaceVariables = (text: string | undefined, query: any): string => {
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

    // Replace variables like {{company.name}}, {{company.email}}, etc.
    // This handles both plain text and HTML content
    return processed.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const trimmedVar = variable.trim();

      // Handle special dynamic variables
      if (trimmedVar === "year") {
        return new Date().getFullYear().toString();
      }

      // Parse nested properties (e.g., "company.name" -> rootProps.company.name)
      const parts = trimmedVar.split(".");
      let value: any = rootProps;

      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = value[part];
        } else {
          // Variable not found, use default placeholder if available
          const defaultValue = DEFAULT_VALUES[trimmedVar];
          return defaultValue !== undefined ? defaultValue : match;
        }
      }

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

    const root = query.node(ROOT_NODE).get();
    if (!root) return DEFAULT_VALUES[varId] || varId;

    const rootProps = root.data.props;
    const parts = varId.split(".");
    let value: any = rootProps;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return DEFAULT_VALUES[varId] || varId;
      }
    }

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

    return variables;
  } catch (e) {
    console.error("Error getting available variables:", e);
    return [];
  }
};
