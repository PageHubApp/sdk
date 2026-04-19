import { ROOT_NODE } from "@craftjs/utils";
import {
  findAncestorDataSource,
  getConnectorFieldDefs,
  getConnectorProviderLabel,
  getConnectorCollectionLabel,
} from "./dataSourceContext";

/** One row in variable pickers (TipTap `{{` menu, More panel, future Link URL UI). */
export type EditorVariableOption = { id: string; label: string; group?: string };

/**
 * Built-in site placeholders for the editor (company.* + year).
 * Custom keys from Site Settings are appended by {@link getEditorVariableOptions}.
 */
export const BUILTIN_EDITOR_VARIABLE_OPTIONS: EditorVariableOption[] = [
  { id: "company.name", label: "Company Name", group: "Company" },
  { id: "company.tagline", label: "Tagline", group: "Company" },
  { id: "company.type", label: "Business Type", group: "Company" },
  { id: "company.location", label: "Location", group: "Company" },
  { id: "company.address", label: "Address", group: "Company" },
  { id: "company.phone", label: "Phone", group: "Company" },
  { id: "company.email", label: "Email", group: "Company" },
  { id: "company.website", label: "Website", group: "Company" },
  { id: "year", label: "Current Year", group: "System" },
];

/**
 * Full variable list for inline text tooling: built-ins plus scoped connector
 * fields (when inside a data-bound Container) plus `variables.*` from ROOT.
 *
 * @param query - CraftJS query object
 * @param nodeId - Current node ID (for scoped data source detection)
 */
export function getEditorVariableOptions(
  query: any | null | undefined,
  nodeId?: string
): EditorVariableOption[] {
  const vars: EditorVariableOption[] = [];

  // Scoped connector fields first (most relevant when inside a data-bound Container)
  if (query && nodeId) {
    try {
      const ds = findAncestorDataSource(nodeId, query);
      if (ds) {
        const fields = getConnectorFieldDefs(ds.provider, ds.collection);
        const providerLabel = getConnectorProviderLabel(ds.provider);
        const colLabel = getConnectorCollectionLabel(ds.provider, ds.collection);

        if (fields) {
          const groupName = `${providerLabel} ${colLabel}`;
          for (const field of fields) {
            vars.push({
              id: `item.${field.id}`,
              label: field.label,
              group: groupName,
            });
          }
        }
      }
    } catch {
      // Node tree not ready
    }
  }

  // Built-in variables
  vars.push(...BUILTIN_EDITOR_VARIABLE_OPTIONS);

  // Custom variables from ROOT.props.variables
  if (query) {
    try {
      const root = query.node(ROOT_NODE).get();
      const customVars = root?.data?.props?.variables;
      if (Array.isArray(customVars)) {
        customVars.forEach((v: { key?: string }) => {
          if (v.key?.trim()) {
            vars.push({ id: `variables.${v.key}`, label: v.key, group: "Custom" });
          }
        });
      }
    } catch {
      // Craft query not ready
    }
  }

  return vars;
}
