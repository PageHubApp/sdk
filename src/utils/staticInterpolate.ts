/**
 * Variable interpolation for the static walker. Re-exported from
 * `staticHtml.ts`, which is where component `toHTML`s import it from.
 */
import { replaceVariables } from "./design/variables";
import { safeHref } from "./htmlSafety";
import type { StaticRenderContext } from "./staticHtml";

/**
 * Build a minimal interpolation context for static toHTML. The walker exposes
 * the full node tree via `ctx.nodes`; ROOT props carry company / theme /
 * variables / pageMedia which `replaceVariables` walks.
 */
export function buildInterpContext(ctx: StaticRenderContext): Record<string, any> {
  return ctx.nodes?.["ROOT"]?.props || {};
}

/**
 * Run `replaceVariables` against a string using the walker's ROOT props.
 * Returns the input unchanged if it has no `{{...}}` tokens (cheap fast-path)
 * or if interpolation fails. `{{item.*}}` resolves against `ctx.currentItem`,
 * which Data.toHTML sets around each repeater iteration.
 *
 * Pass `{ html: true }` when the result is emitted as markup (element content,
 * embed code) so visitor-written values are escaped. Attribute values don't
 * need it — `buildAttrs` escapes them.
 */
export function interpolate(
  text: string | null | undefined,
  ctx: StaticRenderContext,
  opts?: { html?: boolean }
): string {
  if (typeof text !== "string" || !text) return "";
  if (!text.includes("{{")) return text;
  const rootProps = buildInterpContext(ctx);
  return replaceVariables(text, rootProps, ctx.currentItem ?? null, null, opts);
}

/**
 * Interpolate an action href and keep it only when its scheme is allowed
 * (see `safeHref`). The href exit for every static `toHTML`.
 */
export function interpolateHref(
  href: string | null | undefined,
  ctx: StaticRenderContext
): string | undefined {
  return safeHref(href ? interpolate(href, ctx) : href);
}

/**
 * Resolve `{{company.*}}` / `{{variables.*}}` in a string while leaving
 * `{{item.*}}` untouched.
 *
 * The `<a href>` the static walker emits is interpolated, but the same action
 * is ALSO serialized into `data-ph-actions`, and the static click dispatcher
 * preventDefaults the anchor and navigates to that copy instead. Its
 * `interpolateItem` only matches `{{item.*}}`, so any other token would reach
 * `window.location.assign` verbatim — a `tel:{{company.phoneTel}}` button
 * would render a correct href and then navigate to the literal braces.
 *
 * `{{item.*}}` must stay unresolved: it is per-row and only the client knows
 * the row. Running `replaceVariables` with a null item would flatten it to ""
 * and break every repeater link, so those tokens are masked across the call.
 */
export function interpolateNonItem(raw: string, ctx: StaticRenderContext): string {
  const stash: string[] = [];
  const masked = raw.replace(/\{\{\s*item\.[^}]*\}\}/g, m => {
    stash.push(m);
    return ` PHITEM${stash.length - 1} `;
  });
  const out = interpolate(masked, ctx);
  return out.replace(/ PHITEM(\d+) /g, (_, i) => stash[Number(i)] ?? "");
}
