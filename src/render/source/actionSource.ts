/**
 * Craft → HTML-first source emitters for `Button` and `Link` (see
 * docs/strategy/html-first-converter.md, the "Button/Link action" mapping row).
 *
 * These are the `toSource` twins of `Button/Button.toHTML.ts` and
 * `Link/Link.toHTML.ts`: they read the SAME props (`props.action` as a
 * `NodeAction[]`, `props.text`, `props.icon`) but emit **Liquid + HTML source**
 * instead of expanded output. Two intentional differences from the `toHTML`
 * emitters:
 *
 *  1. **Native first.** Each action maps to the native attribute the html-first
 *     site-runtime (`@pagehub-editor/site-runtime`) already reads — `commandfor`
 *     + `command` for modal/drawer invokers, `data-cart*` for cart, `data-copy`,
 *     `data-theme-toggle`, `data-state-*` for the state store — rather than the
 *     old static walker's `data-ph-actions` JSON. Attribute names and value
 *     shapes are taken from the runtime itself (`packages/site-runtime/src/chunks/*`
 *     and `state-store.ts#splitKey`), NOT the README (whose `key=value` state
 *     examples are stale — the parser splits on `:`).
 *  2. **Icons stay source.** `props.icon` (`ref-icon:set/Name`) becomes the
 *     Liquid `{{ 'set/Name' | icon }}` filter, not an inline `<svg>` — the engine
 *     resolves it at render time.
 *
 * A multi-action chain ALSO ships the full ordered chain as a `data-ph-actions`
 * JSON attribute (reusing `actionsAttr`, exactly as `Button.toHTML` does), so a
 * runtime that dispatches the chain stays in lockstep with the static walker.
 */
import type { StaticRenderContext } from "../static/types";
import type { ToSourceFn } from "./toSource";
import { actionsAttr, getInlineStyle, getPageIndex, handlerAttrs } from "../../utils/staticHtml";
import {
  actionToHref,
  actionTrigger,
  findLinkAction,
  migrateActions,
  type NodeAction,
} from "../../utils/action";
import { stateClassAttr } from "./conditions";

// ─── Shared element helpers (mirror toSource.ts `el` / `classString`; those are
//     module-private there and this file must not edit toSource.ts) ───────────

/** The element's class string, verbatim — every breakpoint/state variant kept. */
function classString(props: Record<string, any>): string | undefined {
  const c = props.className;
  const s = typeof c === "string" ? c : Array.isArray(c) ? c.join(" ") : "";
  return s.trim() || undefined;
}

/** `<tag a="b">children</tag>`. Attrs with nullish/empty values are dropped. */
function el(tagName: string, attrs: Record<string, string | null | undefined>, children: string): string {
  const a = Object.entries(attrs)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
    .join(" ");
  return `<${tagName}${a ? " " + a : ""}>${children}</${tagName}>`;
}

// ─── icon ────────────────────────────────────────────────────────────────────

type IconProp = { value?: string; position?: string; size?: string; gap?: string; color?: string; only?: boolean };

/** Normalize `props.icon` the way Button/Link `toHTML` do (string → object + defaults). */
function normalizeIcon(raw: any, size: string, gap: string): IconProp {
  let icon = raw;
  if (typeof icon === "string") icon = { value: icon };
  return { position: "left", size, gap, ...(icon || {}) };
}

/**
 * The icon span for a Button/Link. A `ref-icon:set/Name` becomes the Liquid
 * `{{ 'set/Name' | icon }}` filter (the format's native icon source); any other
 * value (e.g. a media ref) is left for the icon/media pass and emits nothing.
 */
function iconSource(icon: IconProp): string {
  if (!icon.value || !icon.value.startsWith("ref-icon:")) return "";
  const name = icon.value.slice("ref-icon:".length);
  const cls = [icon.size, icon.color || "fill-current", "flex items-center justify-center"]
    .filter(Boolean)
    .join(" ");
  return el("span", { class: cls, "aria-hidden": "true" }, `{{ ${JSON.stringify(name)} | icon }}`);
}

// ─── action → native attributes ───────────────────────────────────────────────

/** `data-state-on` / `data-every` from an action's optional `trigger`. */
function stateTrigger(a: NodeAction): Record<string, string> {
  const t = actionTrigger(a);
  if (!t || t === "click") return {};
  const out: Record<string, string> = { "data-state-on": t };
  const ms = (a as { intervalMs?: number }).intervalMs;
  if (t === "interval" && typeof ms === "number" && ms > 0) out["data-every"] = `${ms}ms`;
  return out;
}

/**
 * One action → the native attributes the site-runtime reads for it. `link` and
 * `download-file` carry the href (handled by `hrefAttrs`, not here) so they add
 * nothing. Types with no native attribute (`manage-subscription`, `agent-send`,
 * `*-local-storage`) also return `{}` — they ride the `data-ph-actions` chain
 * only, and are reported by the state-system pass when they stand alone.
 *
 * State separators are `:` (what `state-store.ts#splitKey` parses), not the
 * README's `=`.
 */
export function actionToAttrs(a: NodeAction): Record<string, string> {
  switch (a.type) {
    case "open-modal":
      // Native invoker: a modal is a <dialog>, opened modally.
      return { commandfor: a.anchor, command: "show-modal" };
    case "show-hide": {
      // The target is a `[popover]` element (or a `<dialog>` for a modal); the
      // direction picks the native invoker command the runtime's `invokers`
      // chunk honors. `tab` (gallery swap) has NO native popover/runtime
      // mechanism — the new runtime switches tabs through state (a `set-state`
      // on the thumb + `data-state-show` / `data-state-class` on the panels),
      // not a per-action command. Emit nothing for it rather than a misleading
      // popover command.
      if (a.direction === "tab") return {};
      const command =
        a.direction === "show" ? "show-popover" : a.direction === "hide" ? "hide-popover" : "toggle-popover";
      return { commandfor: a.target, command };
    }
    case "toggle-theme":
      return { "data-theme-toggle": "" };
    case "copy-to-clipboard":
      return { "data-copy": a.text ?? "" };
    case "add-to-cart": {
      // The cart line id comes from the enclosing repeater/form (the Data pass
      // binds `data-cart-id`); a static quantity ships here when set.
      const out: Record<string, string> = { "data-cart": "add" };
      if (typeof a.quantity === "number") out["data-cart-qty"] = String(a.quantity);
      return out;
    }
    case "toggle-cart":
      return { "data-cart": "open" };
    case "cart-checkout":
      return { "data-cart": "checkout" };
    case "set-state":
      return { "data-state-set": `${a.key}:${a.value}`, ...stateTrigger(a) };
    case "toggle-state":
      return {
        "data-state-toggle": a.values ? `${a.key}:${a.values[0]}|${a.values[1]}` : a.key,
        ...stateTrigger(a),
      };
    case "clear-state":
      return { "data-state-clear": a.key, ...stateTrigger(a) };
    case "increment-state":
    case "decrement-state": {
      const step = typeof a.step === "number" ? a.step : 1;
      const sign = a.type === "increment-state" ? "+" : "-";
      const out: Record<string, string> = { "data-state-step": `${a.key}:${sign}${step}`, ...stateTrigger(a) };
      if (a.min != null) out["data-min"] = String(a.min);
      if (a.max != null) out["data-max"] = String(a.max);
      if (a.wrap) out["data-wrap"] = "";
      return out;
    }
    default:
      return {};
  }
}

/**
 * The href-carrying attributes (`href` / `target` / `rel` / `download`) for the
 * first link- or download-ish action. `ref:<pageId>` is resolved to the format's
 * page URL via the ctx page index (same resolver as `toHTML`), but any
 * `{{ item.* }}` suffix is kept verbatim — it is already valid Liquid in source.
 */
function hrefAttrs(actions: NodeAction[], ctx?: StaticRenderContext): Record<string, string> {
  const link = findLinkAction(actions);
  if (link) {
    const href = actionToHref(link, getPageIndex(ctx), ctx?.currentPath);
    if (!href) return {};
    const out: Record<string, string> = { href };
    if (link.target) out.target = link.target;
    if (/^https?:\/\//.test(href)) out.rel = "noopener noreferrer";
    return out;
  }
  const dl = actions.find((a): a is Extract<NodeAction, { type: "download-file" }> => a.type === "download-file");
  if (dl?.url) return { href: dl.url, download: dl.filename ?? "" };
  return {};
}

/**
 * The interactive attributes a Container / Text / Image carries from its `props.action`: the resolved
 * link href (+ target/rel), the native invoker/state attrs for every action, the full ordered chain as
 * `data-ph-actions` when there's more than one, and `props.attrs` passthrough. `linkHref` is returned
 * separately so a plain-`div` caller can swap to `<a>` (mirrors `Container.toHTML`'s anchor swap).
 */
export function interactiveAttrs(
  props: Record<string, any>,
  ctx?: StaticRenderContext
): { attrs: Record<string, string | null | undefined>; linkHref: string | null } {
  const actions = migrateActions(props);
  if (!actions.length) return { attrs: { ...handlerAttrs(props), ...passthroughAttrs(props) }, linkHref: null };
  const href = hrefAttrs(actions, ctx);
  const native: Record<string, string> = {};
  for (const a of actions) Object.assign(native, actionToAttrs(a));
  const chain = actions.length > 1 ? (actionsAttr(props, ctx) as Record<string, string | undefined>) : {};
  return {
    attrs: { ...href, ...native, ...handlerAttrs(props), ...passthroughAttrs(props), ...chain },
    linkHref: href.href ?? null,
  };
}

/** `aria-label` for an icon-only control (same fallback as `toHTML`). */
function iconOnlyLabel(props: Record<string, any>, icon: IconProp, fallback: string): Record<string, string> {
  if (icon.only) return { "aria-label": typeof props.text === "string" && props.text ? props.text : fallback };
  return {};
}

/** Pass-through `props.attrs` (data-attrs, role, aria-attrs), verbatim — matches the format's "attrs carry over" rule. */
function passthroughAttrs(props: Record<string, any>): Record<string, string> {
  const raw = props.attrs;
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith("on")) continue; // event keys never pass through (React rejects them; handlers pass owns them)
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = String(v);
  }
  return out;
}

/**
 * Shared Button/Link source builder. `baseTag` is `"a"` when the component must
 * always be an anchor (Link), else the tag falls back to `<button>` when no href
 * resolves (Button).
 */
function buildActionSource(
  props: Record<string, any>,
  ctx: StaticRenderContext | undefined,
  opts: { alwaysAnchor: boolean; iconSize: string; iconGap: string; labelFallback: string; iconExtra: (vertical: boolean, gap: string) => string },
): string {
  const icon = normalizeIcon(props.icon, opts.iconSize, opts.iconGap);
  const actions = migrateActions(props);
  const href = hrefAttrs(actions, ctx);
  const tag = opts.alwaysAnchor || href.href ? "a" : "button";

  // Icon layout classes, appended to the verbatim className (mirrors toHTML).
  const cls = classString(props);
  let extra = "";
  if (icon.value) {
    const vertical = icon.position === "top" || icon.position === "bottom";
    extra = opts.iconExtra(vertical, icon.gap || opts.iconGap);
  }
  if (tag === "button" && !/\bbtn\b/.test(cls || "") && !/\bcursor-\S+/.test(cls || "")) {
    extra = [extra, "cursor-pointer"].filter(Boolean).join(" ");
  }
  const fullCls = [cls, extra].filter(Boolean).join(" ") || undefined;

  // Native attributes for every action, merged (distinct action types use
  // distinct keys; a same-key collision keeps the last, and the chain below
  // preserves full order).
  const native: Record<string, string> = {};
  for (const a of actions) Object.assign(native, actionToAttrs(a));

  const attrs: Record<string, string | null | undefined> = {
    class: fullCls,
    style: getInlineStyle(props) || undefined,
    ...href,
    ...native,
    ...iconOnlyLabel(props, icon, opts.labelFallback),
    ...passthroughAttrs(props),
    // State-driven class modifiers (e.g. a tab/pagination Button's `tab-active`).
    ...stateClassAttr(props, ctx),
  };
  if (tag === "button") attrs.type = typeof props.type === "string" ? props.type : "button";
  // A multi-action chain also ships the full ordered chain (resolved hrefs),
  // exactly as Button.toHTML stamps it.
  if (actions.length > 1) Object.assign(attrs, actionsAttr(props, ctx));

  // Label is persisted HTML (TipTap / variable spans) and stays verbatim — its
  // `{{ item.* }}` tokens are already the format's binding form.
  const textHTML = !icon.only && typeof props.text === "string" ? props.text : "";
  const iconHTML = icon.only || icon.value ? iconSource(icon) : "";
  const before = icon.position === "left" || icon.position === "top";
  const inner = before ? iconHTML + textHTML : textHTML + iconHTML;

  return el(tag, attrs, inner);
}

/** `Button` → native `<button>`/`<a>` source. */
export const buttonSource: ToSourceFn = (props, _children, ctx) =>
  buildActionSource(props, ctx, {
    alwaysAnchor: false,
    iconSize: "w-6 h-6",
    iconGap: "gap-2",
    labelFallback: "Button",
    iconExtra: (vertical, gap) =>
      ["flex", vertical ? "flex-col" : "flex-row", "items-center", "justify-center", gap].join(" "),
  });

/** `Link` → native `<a>` source (always an anchor, even with no href). */
export const linkSource: ToSourceFn = (props, _children, ctx) =>
  buildActionSource(props, ctx, {
    alwaysAnchor: true,
    iconSize: "w-4 h-4",
    iconGap: "gap-1.5",
    labelFallback: "Link",
    iconExtra: (vertical, gap) => ["inline-flex", vertical ? "flex-col" : "flex-row", "items-center", gap].join(" "),
  });
