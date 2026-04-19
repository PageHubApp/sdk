/**
 * Copy a component's `props.attrs` map onto the DOM `prop` object.
 * Used by Container, Button, and FormElement to pass through data-*, role,
 * autocomplete, and similar string attributes declared on block JSON.
 *
 * Only primitive values (string/number/boolean) are propagated — objects and
 * functions are dropped to avoid accidental prop leaks.
 *
 * When `interpolate` is provided (Button passes `{{item.*}}` context into
 * chip URLs / data attributes inside repeaters), it runs on every string
 * value before assignment.
 */
export function applyAttrs(
  prop: Record<string, any>,
  attrs: unknown,
  interpolate?: (value: string) => string
): void {
  if (!attrs || typeof attrs !== "object") return;
  for (const [k, v] of Object.entries(attrs as Record<string, unknown>)) {
    if (typeof v === "string") {
      prop[k] = interpolate ? interpolate(v) : v;
    } else if (typeof v === "number" || typeof v === "boolean") {
      prop[k] = v;
    }
  }
}
