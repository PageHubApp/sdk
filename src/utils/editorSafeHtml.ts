import DOMPurify from "dompurify";

/**
 * A site's own markup (rich text, SVG media) made inert for the editor.
 *
 * The editor runs on the host app's origin, signed in as whoever is editing,
 * and the markup it renders was written by anyone with edit access to the site
 * — so an `<img onerror>` or `<svg><image onerror>` in it would run as the
 * editing user. This strips scripts, event-handler attributes and
 * `javascript:` URLs. Published and preview renders keep the raw markup: they
 * run on the site's own origin, where author code is expected.
 *
 * Client-only, like the editor: returns "" without a DOM.
 */
export function editorSafeHtml(html: string | null | undefined): string {
  if (!html || typeof window === "undefined") return "";
  return DOMPurify.sanitize(html);
}
