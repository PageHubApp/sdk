import { ComponentDefinitionError } from "../utils/errors";
import { BUILT_IN_NAMES } from "./builtins";
import type { PageHubComponentDef } from "./types";

export function validate<P extends Record<string, any>>(
  def: PageHubComponentDef<P>,
  allowBuiltIn: boolean
) {
  const tag = `[PageHub] defineComponent("${def.name || "?"}")`;

  if (!def.name || typeof def.name !== "string") {
    throw new ComponentDefinitionError({
      code: "COMPONENT_NAME_REQUIRED",
      message: `${tag}: "name" is required and must be a string`,
    });
  }
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(def.name)) {
    const suggestion = def.name.charAt(0).toUpperCase() + def.name.slice(1);
    throw new ComponentDefinitionError({
      code: "COMPONENT_NAME_INVALID",
      message: `${tag}: name must be PascalCase (start with uppercase, alphanumeric only). Did you mean "${suggestion}"?`,
      hint: `Rename to "${suggestion}".`,
    });
  }
  if (!allowBuiltIn && BUILT_IN_NAMES.has(def.name)) {
    throw new ComponentDefinitionError({
      code: "COMPONENT_NAME_BUILTIN_COLLISION",
      message: `${tag}: "${def.name}" is a built-in component. Choose a different name.`,
    });
  }
  if (
    !def.component ||
    (typeof def.component !== "function" && typeof def.component !== "object")
  ) {
    throw new ComponentDefinitionError({
      code: "COMPONENT_MISSING_COMPONENT",
      message: `${tag}: "component" is required and must be a React component`,
    });
  }
  if (def.toHTML && typeof def.toHTML !== "function") {
    throw new ComponentDefinitionError({
      code: "COMPONENT_INVALID_TOHTML",
      message: `${tag}: "toHTML" must be a function`,
    });
  }
  if (def.props) {
    for (const [key, schema] of Object.entries(
      def.props as Record<string, import("./types").PropSchema | undefined>
    )) {
      if (!schema) continue;
      if (!schema.type) {
        throw new ComponentDefinitionError({
          code: "COMPONENT_PROP_MISSING_TYPE",
          message: `${tag}: props.${key} is missing "type"`,
        });
      }
      if (!schema.label) {
        throw new ComponentDefinitionError({
          code: "COMPONENT_PROP_MISSING_LABEL",
          message: `${tag}: props.${key} is missing "label"`,
        });
      }
      if (schema.type === "slider" && (schema.min == null || schema.max == null)) {
        throw new ComponentDefinitionError({
          code: "COMPONENT_PROP_SLIDER_MISSING_BOUNDS",
          message: `${tag}: props.${key} has type "slider" but is missing "min" and/or "max"`,
        });
      }
    }
  }
}
