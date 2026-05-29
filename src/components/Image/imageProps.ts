/**
 * Image prop normalization — canonical field is `props.src` to match native
 * `<img src>` semantics. Read via {@link getImageSrcString} so call sites stay
 * consistent on null/non-string handling.
 */

export type ImageSrcSource = {
  src?: unknown;
};

/**
 * Resolve the effective image source from an Image node's props. Returns the
 * raw value as authored (almost always a string; typed `any` to match call
 * sites that branch on `startsWith` etc.). `getImageSrcString` is the safer
 * variant that coerces to `string`.
 */
export function getImageSrc(props: ImageSrcSource | undefined | null): any {
  return props?.src;
}

/**
 * Coerce the resolved image source to a string. Returns `""` when the value
 * is null/undefined or a non-stringifiable shape.
 */
export function getImageSrcString(props: ImageSrcSource | undefined | null): string {
  const v = getImageSrc(props);
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}
