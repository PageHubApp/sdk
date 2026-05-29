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
  /** Draft/payload key (the UI and API contract — flat). */
  key: string;
  /** Dot-path on the CraftJS page node props. Defaults to `key` if omitted. */
  nodePath?: string;
  /** Default value when the field is missing */
  defaultValue:
    | string
    | boolean
    | string[]
    | Array<{ varName: string; value: string }>
    | unknown[];
}

/**
 * Page-level settings stored as props on the page Container node.
 * Order matches the UI tabs (Basic → SEO → Advanced).
 *
 * Draft keys stay flat (the UI / API contract); `nodePath` gives the
 * canonical dot-path when storing under a nested namespace like `seo.*`.
 */
export const PAGE_SETTINGS_FIELDS: readonly PageSettingsFieldDef[] = [
  // Basic
  { key: "pageSlug", defaultValue: "" },
  { key: "pageImage", defaultValue: "" },
  // SEO — nested under seo.* on the node
  { key: "pageTitle", nodePath: "seo.title", defaultValue: "" },
  { key: "pageDescription", nodePath: "seo.description", defaultValue: "" },
  { key: "pageKeywords", nodePath: "seo.keywords", defaultValue: "" },
  { key: "pageAuthor", nodePath: "seo.author", defaultValue: "" },
  { key: "ogTitle", nodePath: "seo.ogTitle", defaultValue: "" },
  { key: "ogDescription", nodePath: "seo.ogDescription", defaultValue: "" },
  { key: "ogImage", nodePath: "seo.ogImage", defaultValue: "" },
  { key: "ogType", nodePath: "seo.ogType", defaultValue: "website" },
  { key: "twitterCard", nodePath: "seo.twitterCard", defaultValue: "summary_large_image" },
  { key: "twitterSite", nodePath: "seo.twitterSite", defaultValue: "" },
  { key: "twitterCreator", nodePath: "seo.twitterCreator", defaultValue: "" },
  // Advanced
  { key: "canonicalUrl", nodePath: "seo.canonicalUrl", defaultValue: "" },
  { key: "headCode", defaultValue: "" },
  { key: "bodyClass", defaultValue: "" },
  { key: "hideHeader", defaultValue: false },
  { key: "hideFooter", defaultValue: false },
  { key: "hideChrome", defaultValue: false },
  { key: "jsonLd", nodePath: "seo.jsonLd", defaultValue: "" },
  { key: "schema", nodePath: "seo.schema", defaultValue: [] },
  { key: "pagePassword", defaultValue: "" },
  { key: "themeOverrides", defaultValue: [] },
  // Access Control (conditionGroups is the same prop used by node-level conditions)
  { key: "conditionGroups", defaultValue: [] },
  { key: "pageConditionFailAction", defaultValue: "" },
  { key: "pageConditionRedirectUrl", defaultValue: "" },
  { key: "pageConditionFallbackPageId", defaultValue: "" },
] as const;

/** Just the draft keys, for iteration / allowlisting. */
export const PAGE_SETTINGS_KEYS: readonly string[] = PAGE_SETTINGS_FIELDS.map(f => f.key);

function readPath(source: Record<string, any>, path: string): any {
  if (!path.includes(".")) return source[path];
  return path.split(".").reduce((acc: any, seg) => (acc == null ? acc : acc[seg]), source);
}

function writePath(target: Record<string, any>, path: string, value: any): void {
  if (!path.includes(".")) {
    target[path] = value;
    return;
  }
  const segs = path.split(".");
  let cursor = target;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i];
    if (cursor[seg] == null || typeof cursor[seg] !== "object") cursor[seg] = {};
    cursor = cursor[seg];
  }
  cursor[segs[segs.length - 1]] = value;
}

/** Build a defaults object keyed by draft `key`. */
export function pageSettingsDefaults(): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of PAGE_SETTINGS_FIELDS) out[f.key] = f.defaultValue;
  return out;
}

/** Read settings props from a source (node props OR payload.props), filling defaults. */
export function readSettingsProps(source: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of PAGE_SETTINGS_FIELDS) {
    const path = f.nodePath || f.key;
    const value = readPath(source, path);
    out[f.key] = value !== undefined ? value : f.defaultValue;
  }
  return out;
}

/** Write a snapshot of draft values onto a target (node props OR payload.props). */
export function writeSettingsProps(
  target: Record<string, any>,
  snapshot: Record<string, any>
): void {
  for (const f of PAGE_SETTINGS_FIELDS) {
    const value = snapshot[f.key];
    const storagePath = f.nodePath || f.key;
    writePath(target, storagePath, value);
    // If the storage moved to a nested path, remove any stale flat copy so
    // readers don't see conflicting values during transition.
    if (f.nodePath && f.nodePath !== f.key && f.key in target) {
      delete target[f.key];
    }
  }
}
