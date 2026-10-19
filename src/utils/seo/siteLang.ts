/**
 * The language a site's pages declare in `<html lang>`.
 *
 * Stored as a BCP 47 tag on `ROOT.props.seo.lang` ("uk", "es", "pt-BR"). It is
 * a render input: every document shell (static walker, React viewer, exports)
 * reads it through `siteLang`, so they can't disagree.
 */

/** What a site declares when it sets no language. */
export const DEFAULT_SITE_LANG = "en";

/** Longest tag accepted. Real tags are far shorter; this only bounds junk input. */
const MAX_LANG_LENGTH = 35;

/**
 * The canonical form of a BCP 47 tag (`pt-br` → `pt-BR`), or "" when the input
 * is empty or isn't a well-formed tag.
 */
export function normalizeLangTag(input: unknown): string {
  if (typeof input !== "string") return "";
  const raw = input.trim().replace(/_/g, "-");
  if (!raw || raw.length > MAX_LANG_LENGTH) return "";
  try {
    return Intl.getCanonicalLocales(raw)[0] || "";
  } catch {
    return "";
  }
}

/** The `<html lang>` value for a site, from its ROOT props. */
export function siteLang(rootProps: Record<string, any> | null | undefined): string {
  return normalizeLangTag(rootProps?.seo?.lang) || DEFAULT_SITE_LANG;
}
