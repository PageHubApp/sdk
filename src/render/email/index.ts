/**
 * @pagehub/sdk/email-renderer — the CSS and text halves of an email.
 *
 * Server-only (compiles CSS with the Tailwind compiler + lightningcss). The host
 * renders its own markup and hands it to these: `buildEmailCss` compiles the
 * classes the markup uses into literal values an email client keeps, and
 * `htmlToText` makes the plain-text alternative.
 */

export { buildEmailCss } from "./emailCss";
export { evalStaticMath } from "./cssMath";
export { resolveCssVars } from "./cssVars";
export { htmlToText } from "./text";
