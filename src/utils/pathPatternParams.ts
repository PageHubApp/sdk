/**
 * Per-page path patterns (`pathPattern` on the page Container) + tail segment matching.
 * Shared by server connector fetch and client Container binding resolution.
 */

export type PrepareViewerRoute = "subdomain" | "view" | "static";

function slugQueryToArray(slug: string | string[] | undefined): string[] {
  if (slug == null) return [];
  return Array.isArray(slug) ? (slug as string[]) : [String(slug)];
}

/**
 * Path segments after the page slug — aligned across subdomain / view / static.
 *
 * - **subdomain** (`pages/[[...slug]].tsx`): `['pageSlug', 'products', 'handle']` → `['products','handle']`
 * - **view** (`pages/view/[[...slug]].tsx`): `query.slug` = `[templateSlug, pageSlug, ...tail]`
 * - **static** (`pages/static/[[...slug]].tsx`): `[domain, pageSlug, ...tail]` → tail after domain+page
 */
export function getPathTailSegments(
  route: PrepareViewerRoute,
  options: {
    query?: Record<string, string | string[] | undefined> | null;
    catchAllSlug?: string[] | null;
  }
): string[] {
  if (route === "view") {
    const slugArr = slugQueryToArray(options.query?.slug);
    return slugArr.slice(2);
  }
  if (route === "subdomain") {
    const segs = options.catchAllSlug || [];
    return segs.slice(1);
  }
  const segs = options.catchAllSlug || [];
  return segs.slice(2);
}

/**
 * Match URL path tail segments against a pattern like `products/:handle` or `:handle`.
 * Literal segments must match exactly; `:name` captures one segment.
 */
export function matchPathPattern(
  pattern: string | null | undefined,
  segments: string[]
): Record<string, string> | null {
  if (!pattern?.trim()) {
    return {};
  }
  const parts = pattern
    .split("/")
    .map(s => s.trim())
    .filter(Boolean);
  if (parts.length !== segments.length) {
    return null;
  }
  const params: Record<string, string> = {};
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const seg = segments[i] ?? "";
    if (p.startsWith(":")) {
      params[p.slice(1)] = seg;
    } else if (p !== seg) {
      return null;
    }
  }
  return params;
}

const LITERAL_SEGMENT = /^[A-Za-z0-9._~-]+$/;
const PARAM_SEGMENT = /^:[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * Check a `pathPattern` an author typed. Returns a message for the author, or
 * null when it's valid. Empty means "no pattern" and is valid.
 *
 * The pattern describes the path AFTER the page's own URL segment: a page at
 * `/product` with `:handle` serves `/product/classic-tee`.
 */
export function validatePathPattern(pattern: string | null | undefined): string | null {
  const p = (pattern ?? "").trim();
  if (!p) return null;
  if (p.startsWith("/")) return "Leave off the leading slash — start with the first part, like :handle.";
  if (/\s/.test(p)) return "Remove the spaces. Use - or _ inside a part instead.";
  if (p.endsWith("/") || p.includes("//")) return "Remove the empty part — each / needs text on both sides.";
  const seen = new Set<string>();
  for (const seg of p.split("/")) {
    if (seg.startsWith(":")) {
      if (!PARAM_SEGMENT.test(seg)) {
        return `"${seg}" isn't a valid name. After the colon use letters, numbers or _, starting with a letter.`;
      }
      if (seen.has(seg)) return `"${seg}" is used twice. Give each part its own name.`;
      seen.add(seg);
    } else if (!LITERAL_SEGMENT.test(seg)) {
      return `"${seg}" has characters a URL can't hold. Use letters, numbers, -, _ or .`;
    }
  }
  return null;
}

/** First page node with a non-empty `pathPattern` in assembled Craft JSON. */
export function findPagePathPattern(nodes: Record<string, any> | null | undefined): string | null {
  if (!nodes) return null;
  for (const n of Object.values(nodes)) {
    const props = (n as any)?.props;
    if (props?.type === "page" && typeof props.pathPattern === "string") {
      const t = props.pathPattern.trim();
      if (t) return t;
    }
  }
  return null;
}

export function resolveRouteParamsForPathPattern(
  pathPattern: string | null,
  pathTailSegments: string[] | undefined
): Record<string, string> {
  if (!pathTailSegments?.length) {
    return {};
  }
  const pp = pathPattern?.trim();
  if (!pp) {
    return {};
  }
  return matchPathPattern(pp, pathTailSegments) ?? {};
}
