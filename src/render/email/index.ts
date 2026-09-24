/**
 * @pagehub/sdk/email-renderer — render a PageHub node tree as an email.
 *
 * Server-only (compiles CSS with the Tailwind compiler + lightningcss and
 * inlines it with juice). The editor-side pieces — `emailEditorConfig`,
 * `EMAIL_PROFILE` constants and `validateEmailTree` — are also exported from
 * the main `@pagehub/sdk` entry. See docs/sdk/email-export.md.
 *
 * ```ts
 * import { renderEmailHTML } from "@pagehub/sdk/email-renderer";
 * const { html, text, warnings } = await renderEmailHTML({
 *   content: savedNodes,
 *   variables: { "customer.name": "Ada" },
 *   preheader: "Your order is on its way",
 * });
 * ```
 */

export { renderEmailHTML } from "./renderEmailHTML";
export type { RenderEmailOptions, RenderEmailResult } from "./renderEmailHTML";
export { buildEmailCss } from "./emailCss";
export { evalStaticMath } from "./cssMath";
export { resolveCssVars } from "./cssVars";
export { htmlToText } from "./text";
export { EMAIL_RESOLVER } from "./emitters";
export {
  EMAIL_CLASS_ALLOWLIST,
  EMAIL_COMPONENTS,
  EMAIL_INSPECTOR_TABS,
  EMAIL_STACK_BREAKPOINT,
  EMAIL_UNSAFE,
  EMAIL_WIDTH,
  emailEditorConfig,
  isEmailClassAllowed,
} from "./profile";
export { validateEmailTree } from "./validate";
export type { EmailIssue } from "./validate";
