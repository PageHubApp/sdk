import { actionToHref } from "./action";
import type { PageIndex } from "./page/pageManagement";

/** `<a … href="ref:…"` / `href='ref:…'` inside rich-text HTML. */
const REF_HREF_RE = /(<a\b[^>]*?\shref\s*=\s*)(["'])\s*(ref:[^"']*?)\s*\2/gi;

/**
 * Rewrite internal page links (`ref:<pageId>[/path][?query][#hash]`) inside a
 * Text node's rich-text HTML to the same URL a `link` action resolves to
 * (`actionToHref`). A missing page or malformed ref becomes `#`. Every other
 * href (https, mailto, tel, sms, #anchor, /relative) is left untouched.
 *
 * Both walkers call this — the React viewer (`Text.body.tsx`) and the static
 * exporter (`Text.toHTML.ts`). The stored HTML keeps `ref:` so links survive
 * page renames; resolution happens at render time only.
 */
export function resolveRefLinks(
  html: string,
  pageIndex: PageIndex | null | undefined,
  currentPath?: string
): string {
  if (!html || !html.includes("ref:")) return html;
  return html.replace(REF_HREF_RE, (_m, head: string, quote: string, ref: string) => {
    const resolved = actionToHref({ type: "link", href: ref }, pageIndex, currentPath) || "#";
    return `${head}${quote}${resolved}${quote}`;
  });
}
