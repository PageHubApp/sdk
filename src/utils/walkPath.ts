/**
 * Walk a dot-separated path into a nested object. Numeric string parts index
 * into arrays (e.g. `images.0.url`). Returns `undefined` if any segment is
 * missing or descends into a non-object.
 *
 * Single source for the SDK's dot-path resolution — used by variable
 * interpolation, condition evaluation, and nested-item (scope) resolution.
 *
 * NOTE: `conditions/clientScript.ts` deliberately keeps its OWN inline copy —
 * that function is serialized to a standalone browser string via
 * `stringifyChunk` and minified independently, so it can't import this module.
 * Keep the two behaviourally in lockstep.
 */
export function walkPath(obj: any, parts: string[]): any {
  let value = obj;
  for (const part of parts) {
    if (value == null || typeof value !== "object") return undefined;
    if (Array.isArray(value) && /^\d+$/.test(part)) {
      value = value[parseInt(part, 10)];
    } else if (part in value) {
      value = value[part];
    } else {
      return undefined;
    }
  }
  return value;
}
