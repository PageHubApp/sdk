/**
 * Pure (non-hook) variant of usePropertyHasValue — checks if a property has any
 * value set on the given className/componentProps for the current view.
 *
 * Hook variant lives in usePropertyHasValue.ts and wraps this function.
 * Use this from contexts where you need to evaluate visibility for many
 * properties at once (e.g. filtering arrays in a useMemo).
 */
import { getPropFinalValue } from "../../viewport/propSystem";
import type { PropertyDef } from "./registry/propertyDefs";

export function propertyHasValue(
  def: PropertyDef,
  className: string,
  componentProps: Record<string, any>,
  view: string,
  classDark: boolean
): boolean {
  const propType = def.propType || "class";
  if (propType === "component") {
    const v = componentProps[def.propKey || def.id];
    return v !== undefined && v !== null && v !== "";
  }
  const result = getPropFinalValue(
    { propKey: def.propKey || def.id, propType },
    view,
    { className },
    classDark
  );
  return result.value != null && result.value !== "";
}
