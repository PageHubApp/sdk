/**
 * Page URL slugs — the ONE rule for turning a page into its URL segment.
 *
 * Every surface that builds a page URL (links via `resolvePageRef`, editor
 * navigation, sitemap / llms feeds, dashboard page lists, site export) and
 * every surface that matches a request path back to a page (the sharded
 * `/api/page` router, template / revision previews, client page filtering)
 * goes through these helpers, so a URL one of them emits always resolves on
 * the others.
 *
 * Rule: an explicit `pageSlug` wins; otherwise the display name runs through
 * the `slug` package (lowercase, transliterate accents/scripts, drop
 * punctuation, collapse separators to `-`); a name that slugs to nothing falls
 * back to the page's node id. "Lana B. Nassar" → `lana-b-nassar`,
 * "Q&A" → `qa`, "Café" → `cafe`.
 */

import sluggit from "slug";

/** Display name → URL segment (no override, no fallback). */
export function pageSlugFromName(name: unknown): string {
  return sluggit(typeof name === "string" ? name : "", "-");
}

export interface PageSlugSource {
  /** Explicit URL segment set by the author — wins when non-empty. */
  pageSlug?: string | null;
  displayName?: string | null;
}

/**
 * The URL segment a page serves at. `fallbackId` (the page node id) is used
 * when there is no override and the name slugs to nothing.
 */
export function resolvePageSlug(page: PageSlugSource, fallbackId?: string): string {
  return page.pageSlug || pageSlugFromName(page.displayName) || fallbackId || "";
}

/** Same, read off a serialized Craft page node (`custom.displayName`, `props.pageSlug`). */
export function pageNodeSlug(node: any, nodeId?: string): string {
  return resolvePageSlug(
    {
      pageSlug: node?.props?.pageSlug,
      displayName: node?.custom?.displayName || node?.props?.displayName,
    },
    nodeId
  );
}

/** Does a request path segment address a page with this resolved slug? Case-insensitive. */
export function pageSlugMatches(slug: string, segment: string | null | undefined): boolean {
  return !!slug && !!segment && slug.toLowerCase() === segment.toLowerCase();
}
