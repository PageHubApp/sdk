/**
 * Pure (non-hook) variant of usePropertyHasValue — checks if a property has any
 * value set on the given className/componentProps for the current view.
 *
 * Hook variant lives in usePropertyHasValue.ts and wraps this function.
 * Use this from contexts where you need to evaluate visibility for many
 * properties at once (e.g. filtering arrays in a useMemo).
 */
import { getPropFinalValue } from "../../viewport/state/propSystem";
import type { PropertyDef } from "./registry/propertyDefs";

export function propertyHasValue(
  def: PropertyDef,
  className: string,
  componentProps: Record<string, any>,
  view: string,
  classDark: boolean
): boolean {
  // Bundles "have a value" when any of their child properties does.
  // Lets the chip auto-appear in a section when the node already carries
  // bundle classes (e.g. existing ring-2 ring-primary auto-shows the Ring chip).
  if (def.input.type === "bundle") {
    return def.input.properties.some(child =>
      propertyHasValue(child, className, componentProps, view, classDark)
    );
  }

  // Shorthand "has a value" when any tag in any mode does. The default
  // propKey check (def.id) only matches the uniform tag; without this,
  // axes-only shorthands (skew, space) and prefix-mismatched shorthands
  // (scrollPadding tags `scroll-p*`, not `scrollPadding`) would never
  // auto-show on existing nodes.
  if (def.input.type === "shorthand") {
    for (const mode of def.input.modes) {
      for (const tag of mode.tags) {
        const r = getPropFinalValue(
          { propKey: tag, propType: "class" },
          view,
          { className },
          classDark
        );
        if (r.value != null && r.value !== "") return true;
      }
    }
    return false;
  }

  if (def.input.type === "multi-toggle") {
    for (const t of def.input.toggles) {
      const r = getPropFinalValue(
        { propKey: t.propKey, propType: "class" },
        view,
        { className },
        classDark
      );
      if (r.value != null && r.value !== "") return true;
    }
    return false;
  }

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
