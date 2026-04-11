import { ROOT_NODE } from "@craftjs/core";

/** One row in variable pickers (TipTap `{{` menu, More panel, future Link URL UI). */
export type EditorVariableOption = { id: string; label: string };

/**
 * Built-in site placeholders for the editor (company.* + year).
 * Custom keys from Site Settings are appended by {@link getEditorVariableOptions}.
 */
export const BUILTIN_EDITOR_VARIABLE_OPTIONS: EditorVariableOption[] = [
  { id: "company.name", label: "Company Name" },
  { id: "company.tagline", label: "Tagline" },
  { id: "company.type", label: "Business Type" },
  { id: "company.location", label: "Location" },
  { id: "company.address", label: "Address" },
  { id: "company.phone", label: "Phone" },
  { id: "company.email", label: "Email" },
  { id: "company.website", label: "Website" },
  { id: "year", label: "Current Year" },
];

/**
 * Full variable list for inline text tooling: built-ins plus `variables.*` from ROOT.
 */
export function getEditorVariableOptions(query: any | null | undefined): EditorVariableOption[] {
  const vars: EditorVariableOption[] = [...BUILTIN_EDITOR_VARIABLE_OPTIONS];
  if (!query) return vars;

  try {
    const root = query.node(ROOT_NODE).get();
    const customVars = root?.data?.props?.variables;
    if (Array.isArray(customVars)) {
      customVars.forEach((v: { key?: string }) => {
        if (v.key?.trim()) {
          vars.push({ id: `variables.${v.key}`, label: v.key });
        }
      });
    }
  } catch {
    // Craft query not ready
  }

  return vars;
}
