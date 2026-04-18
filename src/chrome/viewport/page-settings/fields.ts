/**
 * Single source of truth for page settings fields.
 *
 * Every field that appears in PageSettingsDraft (minus the top-level
 * pageName / isHomePage / is404Page which have special handling) is
 * listed here with its default value. Used by:
 *   - PageSettingsModal (SDK) — draft creation, mapping, commit
 *   - settings.js (server) — allowlist for GET/PATCH
 */

export interface PageSettingsFieldDef {
  /** Property key on both the CraftJS page node props and PageSettingsPayload.props */
  key: string;
  /** Default value when the field is missing */
  defaultValue: string | string[] | Array<{ varName: string; value: string }>;
}

/**
 * Page-level settings stored as props on the page Container node.
 * Order matches the UI tabs (Basic → SEO → Advanced).
 */
export const PAGE_SETTINGS_FIELDS: readonly PageSettingsFieldDef[] = [
  // Basic
  { key: "pageSlug", defaultValue: "" },
  { key: "pageImage", defaultValue: "" },
  // SEO
  { key: "pageTitle", defaultValue: "" },
  { key: "pageDescription", defaultValue: "" },
  { key: "pageKeywords", defaultValue: "" },
  { key: "pageAuthor", defaultValue: "" },
  { key: "ogTitle", defaultValue: "" },
  { key: "ogDescription", defaultValue: "" },
  { key: "ogImage", defaultValue: "" },
  { key: "ogType", defaultValue: "website" },
  { key: "twitterCard", defaultValue: "summary_large_image" },
  { key: "twitterSite", defaultValue: "" },
  { key: "twitterCreator", defaultValue: "" },
  // Advanced
  { key: "canonicalUrl", defaultValue: "" },
  { key: "headCode", defaultValue: "" },
  { key: "bodyClass", defaultValue: "" },
  { key: "jsonLd", defaultValue: "" },
  { key: "pagePassword", defaultValue: "" },
  { key: "themeOverrides", defaultValue: [] },
  // Access Control (conditionGroups is the same prop used by node-level conditions)
  { key: "conditionGroups", defaultValue: [] },
  { key: "pageConditionFailAction", defaultValue: "" },
  { key: "pageConditionRedirectUrl", defaultValue: "" },
  { key: "pageConditionFallbackPageId", defaultValue: "" },
] as const;

/** Just the keys, for iteration / allowlisting. */
export const PAGE_SETTINGS_KEYS: readonly string[] = PAGE_SETTINGS_FIELDS.map(f => f.key);

/** Build a defaults object from the field list. */
export function pageSettingsDefaults(): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of PAGE_SETTINGS_FIELDS) out[f.key] = f.defaultValue;
  return out;
}

/** Read settings props from a source object, filling defaults for missing keys. */
export function readSettingsProps(source: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of PAGE_SETTINGS_FIELDS) {
    out[f.key] = source[f.key] !== undefined ? source[f.key] : f.defaultValue;
  }
  return out;
}
