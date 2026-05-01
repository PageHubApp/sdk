/**
 * Resolve a nested repeater's items from a parent item context.
 *
 * Used when a Container's dataSource has `scope` — instead of fetching from
 * connector data, it reads a path into the current repeater item:
 *
 *   dataSource: { provider: "stripe", collection: "products", scope: "item.images" }
 *     → iterates over item.images (expected to be an array)
 *
 *   dataSource: { ..., scope: "item.metadata.sizes", splitBy: "," }
 *     → splits the string "XS,S,M,L" → ["XS", "S", "M", "L"]
 *     → each string is wrapped as { value: "XS", slug: "xs" } so templates
 *       can use {{item.value}} for display + {{item.slug}} for URLs/classes
 *
 * Returns null when the path doesn't exist, so the Container can treat it
 * like any other "no items" case.
 */

function walkPath(obj: any, parts: string[]): any {
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolve a string-keyed path (e.g. "item.images", "item.metadata.sizes")
 * from the current item context to an array of items.
 *
 * - Paths starting with `item.` are resolved against `itemContext`.
 * - Arrays of primitives (strings/numbers) are wrapped as `{ value, slug }`.
 * - Arrays of objects pass through unchanged.
 * - When `splitBy` is set, a string value is split into an array first.
 */
export function resolveNestedItems(
  itemContext: Record<string, any> | null,
  scope: string,
  splitBy?: string
): any[] | null {
  if (!itemContext || !scope) return null;
  const parts = scope.split(".");
  // Drop leading "item" if present — it's the anchor, not a real key.
  if (parts[0] === "item") parts.shift();
  if (parts.length === 0) return null;

  let value = walkPath(itemContext, parts);
  if (value == null) return null;

  // Split a string by delimiter.
  if (typeof value === "string" && splitBy) {
    value = value
      .split(splitBy)
      .map(s => s.trim())
      .filter(Boolean);
  }

  if (!Array.isArray(value)) return null;

  // Wrap primitive items as { value, slug } so templates stay uniform.
  return value.map((v, idx) => {
    if (typeof v === "string" || typeof v === "number") {
      const str = String(v);
      return {
        id: `${scope}-${idx}`,
        value: str,
        title: str,
        slug: slugify(str),
        // For image arrays specifically — when the value is a URL, expose
        // it under both `src` and `image` for natural template binding.
        src: str,
        image: str,
      };
    }
    return v;
  });
}
