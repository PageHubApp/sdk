/**
 * Image prop normalization — `content` is a legacy alias for `src`.
 *
 * Historical block / template JSON often carries the image media id (or URL)
 * on `props.content`. The canonical field today is `props.src` to match
 * native `<img src>` semantics. To keep legacy saved pages rendering, every
 * read goes through {@link getImageSrc} and writers MUST only set `src`.
 *
 * The MCP validator (`packages/mcp-core/src/node-validation.js`) auto-migrates
 * `content` → `src` on ingest, and `assertNoImageSrcContentConflict` rejects
 * conflicting writes loudly. Saved data is migrated by
 * `scripts/migrate-image-content-to-src.mjs`.
 *
 * @see /Users/admin/projects/pagehub.dev/.claude/known-issues/image-src-content-shadowing.md
 */

export type ImageSrcSource = {
  src?: unknown;
  /** @deprecated Legacy alias for `src`. Read via {@link getImageSrc}, never written by new code. */
  content?: unknown;
};

/**
 * Resolve the effective image source from an Image node's props, applying
 * legacy `content` fallback. Returns the raw value as authored (almost
 * always a string; typed `any` to match the historic inline read at call
 * sites that branch on `startsWith` etc.). `getImageSrcString` is the safer
 * variant that coerces to `string`.
 */
export function getImageSrc(props: ImageSrcSource | undefined | null): any {
  return props?.src ?? props?.content;
}

/**
 * Coerce the resolved image source to a string. Returns `""` when the value
 * is null/undefined or a non-stringifiable shape (matches the body's
 * previous inline behavior).
 */
export function getImageSrcString(props: ImageSrcSource | undefined | null): string {
  const v = getImageSrc(props);
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}
