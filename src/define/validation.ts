import { BUILT_IN_NAMES } from "./builtins";
import type { PageHubComponentDef } from "./types";

export function validate<P extends Record<string, any>>(
  def: PageHubComponentDef<P>,
  allowBuiltIn: boolean
) {
  const tag = `[PageHub] defineComponent("${def.name || "?"}")`;

  if (!def.name || typeof def.name !== "string") {
    throw new Error(`${tag}: "name" is required and must be a string`);
  }
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(def.name)) {
    const suggestion = def.name.charAt(0).toUpperCase() + def.name.slice(1);
    throw new Error(
      `${tag}: name must be PascalCase (start with uppercase, alphanumeric only). Did you mean "${suggestion}"?`
    );
  }
  if (!allowBuiltIn && BUILT_IN_NAMES.has(def.name)) {
    throw new Error(`${tag}: "${def.name}" is a built-in component. Choose a different name.`);
  }
  if (
    !def.component ||
    (typeof def.component !== "function" && typeof def.component !== "object")
  ) {
    throw new Error(`${tag}: "component" is required and must be a React component`);
  }
  if (def.toHTML && typeof def.toHTML !== "function") {
    throw new Error(`${tag}: "toHTML" must be a function`);
  }
  if (def.props) {
    for (const [key, schema] of Object.entries(def.props)) {
      if (!schema.type) throw new Error(`${tag}: props.${key} is missing "type"`);
      if (!schema.label) throw new Error(`${tag}: props.${key} is missing "label"`);
      if (schema.type === "slider" && (schema.min == null || schema.max == null)) {
        throw new Error(`${tag}: props.${key} has type "slider" but is missing "min" and/or "max"`);
      }
    }
  }
  if (def.presets) {
    for (let i = 0; i < def.presets.length; i++) {
      if (!def.presets[i].label) {
        throw new Error(`${tag}: presets[${i}] is missing "label"`);
      }
    }
  }
}
