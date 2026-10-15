/**
 * Output guards for values a visitor can write — collection rows from public
 * forms, connector data, URL state, customer profile fields. Authors run code
 * on their own site by design; a visitor never should.
 *
 * Shared by the React walker, the static walker and the email renderer so all
 * three agree on what reaches HTML. Pure functions, no DOM. The static
 * runtime's client-side refetch (`render/static/runtime/chunks/repeater.ts`,
 * `chunks/state.ts`, `chunks/actions.ts`) runs as a separate inlined script
 * and carries its own copies of the same rules.
 */

/** Escape a string for an HTML text node or a quoted attribute value. */
export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * A collection item lists its rich-text fields under this key. Those values are
 * the site owner's own markup and render as HTML; visitor form writes into
 * rich-text fields are escaped when they're saved, so they arrive here inert.
 */
export const RICH_HTML_KEYS = "__richHtml";

/** `item.<field>` whose field is one of the item's rich-text fields. */
export function isOwnerHtmlKey(key: string, item: Record<string, any> | null | undefined): boolean {
  if (!item || !key.startsWith("item.")) return false;
  const keys = item[RICH_HTML_KEYS];
  return Array.isArray(keys) && keys.includes(key.slice(5).split(".")[0]);
}

/** Schemes an interpolated href may carry. Anything else is dropped. */
const SAFE_HREF_SCHEMES = new Set(["http", "https", "mailto", "tel", "ref"]);

/**
 * `href` when it is relative (`/x`, `?q`, `#a`, `x/y`) or uses an allowed
 * scheme; `undefined` otherwise. Browsers ignore ASCII whitespace and control
 * characters inside a scheme (`java\tscript:`), so those are stripped before
 * the scheme is read. The original string is returned unchanged when allowed.
 */
export function safeHref(href: string | null | undefined): string | undefined {
  if (typeof href !== "string" || !href) return undefined;
  // eslint-disable-next-line no-control-regex
  const probe = href.replace(/[\u0000- \u007f]/g, "");
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(probe);
  if (!scheme) return href;
  return SAFE_HREF_SCHEMES.has(scheme[1].toLowerCase()) ? href : undefined;
}

/** Attributes a browser navigates to or submits to. */
const URL_ATTRS = new Set(["href", "xlink:href", "action", "formaction"]);

/**
 * An interpolated pass-through attribute value (`props.attrs`), with URL
 * attributes held to `safeHref`. `undefined` means drop the attribute.
 */
export function safeAttrValue(name: string, value: string): string | undefined {
  return URL_ATTRS.has(name.toLowerCase()) ? safeHref(value) : value;
}
