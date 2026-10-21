/**
 * Craft → HTML-first source converter (see docs/strategy/html-first-converter.md).
 *
 * The mirror of the static `renderToHTML` walker: the SAME tree walk, but each node emits
 * **Liquid + HTML source** instead of expanded output. `renderToSource(rootId, nodes, ctx)` returns
 * the `.liquid` source for a page; the standalone engine parses + renders it back to the DOM the
 * static walker produces today. Parity is gated by `scripts/converter/parity.mjs` (zero DOM diff).
 *
 * Styles / ids are produced with the same `getInlineStyle` helper the `toHTML` emitters use; classes
 * are kept verbatim (all breakpoints). The only other intentional difference is the DYNAMIC parts: a `Data`
 * repeater becomes `{% for %}` instead of expanded rows, a media id becomes `{{ id | image_url }}`,
 * a condition becomes `{% if %}`, etc. This file covers the leaf/structural types; the dynamic
 * emitters (Data, Form, actions) land on top of it, harness-gated, one at a time.
 */
import type { SerializedNodes } from "../static/types";
import { getInlineStyle, ariaAttrs, type StaticRenderContext } from "../../utils/staticHtml";
import { headerSlotProps } from "../../components/Header/headerSlot";
import { unwrapP } from "../../utils/unwrapP";
import { STATE_KEY } from "../../utils/state/keys";
import { dataSource } from "./dataSource";
import { formSource, formElementSource } from "./formSource";
import { videoSource, audioSource, embedSource, mapSource, mapPointSource, mapPathSource } from "./mediaSource";
import { buttonSource, linkSource, interactiveAttrs } from "./actionSource";
import { conditionExpr, stateClassAttr, isRuntimeStateKey } from "./conditions";
import { normalizeInViewState } from "../../utils/state/inViewTracker";
import { cssAnimationPresets, toTimingFunction } from "../../utils/animations/animations";

/** A node → its Liquid+HTML source. `childrenSource` is the already-emitted source of its children. */
export type ToSourceFn = (props: Record<string, any>, childrenSource: string, ctx: StaticRenderContext) => string;

/**
 * The element's class string, verbatim. Unlike the static walker's `staticClasses`, the converter
 * keeps EVERY class — including responsive (`md:` / `lg:`) and state variants — because the source is
 * one document for all breakpoints; the view-specific filtering the static HTML needs does not apply.
 */
function classString(props: Record<string, any>): string | undefined {
  const c = props.className;
  const s = typeof c === "string" ? c : Array.isArray(c) ? c.join(" ") : "";
  return s.trim() || undefined;
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** `<tag a="b">children</tag>`, or `<tag a="b">` for void elements. Attrs with nullish values are dropped. */
function el(tagName: string, attrs: Record<string, string | null | undefined>, children: string): string {
  const a = Object.entries(attrs)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, "&quot;")}"`)
    .join(" ");
  const open = `<${tagName}${a ? " " + a : ""}>`;
  return VOID.has(tagName) ? open : `${open}${children}</${tagName}>`;
}

/**
 * CartBadge → the wrapper + an absolutely-positioned count pill the runtime updates via
 * `data-state-text="cart:count"` (mirrors the static `cartBadgeToHTML`). The pill colors come from CSS
 * vars, not `bg-primary` classes, because the compiler can't see classes it hard-codes here.
 */
function cartBadgeSource(props: Record<string, any>, children: string): string {
  const cls = classString(props) || "relative";
  const pill =
    props.showCount === false
      ? ""
      : el(
          "span",
          {
            class: "hidden flex items-center justify-center absolute pointer-events-none",
            style:
              "top: -4px; right: -4px; min-width: 18px; height: 18px; border-radius: 9999px; font-size: 10px; font-weight: 700; background-color: var(--color-primary); color: var(--color-primary-content)",
            "aria-label": "0 items in cart",
            "aria-live": "polite",
            "data-state-text": STATE_KEY.cartCount,
            "data-state-show-when-truthy": STATE_KEY.cartCount,
          },
          "0"
        );
  return el("div", { class: cls, style: getInlineStyle(props) || undefined, id: props.id || props.anchor || undefined }, `${children}${pill}`);
}

/**
 * Icon → a `<span>` wrapper (color + centering classes) holding the `{{ 'set/Name' | icon }}` filter
 * (the engine resolves the SVG at render). Mirrors Icon.toHTML: `role="img"` with an aria-label, else
 * `aria-hidden`. A non-`ref-icon:` value (e.g. `ref-image:*`) emits an empty span, as the static walker does.
 */
function iconNodeSource(props: Record<string, any>): string {
  const color = props.color || "fill-current";
  const wrapCls = [color, "inline-flex", "items-center", "justify-center", classString(props)].filter(Boolean).join(" ");
  const aria = ariaAttrs(props);
  const hasLabel = typeof aria["aria-label"] === "string" && aria["aria-label"].length > 0;
  const value = typeof props.value === "string" ? props.value : "";
  const inner = value.startsWith("ref-icon:") ? `{{ ${JSON.stringify(value.slice("ref-icon:".length))} | icon }}` : "";
  return el(
    "span",
    { class: wrapCls || undefined, ...aria, role: hasLabel ? "img" : undefined, "aria-hidden": hasLabel ? undefined : "true" },
    inner
  );
}

/** Container `props.type` → HTML tag (mirrors Container.toHTML's mapping). */
const CONTAINER_TAGS = new Set(["section", "header", "footer", "nav", "aside", "main", "form", "details", "summary", "label", "ul", "ol", "li", "table", "thead", "tbody", "tfoot", "tr", "td", "th"]);
function containerTag(type: unknown): string {
  if (type === "page") return "article";
  if (typeof type === "string" && CONTAINER_TAGS.has(type)) return type;
  return "div";
}

/**
 * An Image `src` → its source form. An absolute/root URL stays literal; a stored media id becomes the
 * `image_url` filter; a value that is already a Liquid binding (`{{item.image}}`, common in a repeater
 * row) has its EXPRESSION piped through `image_url` — never wrapped again, which would nest `{{ }}`.
 */
function imageSrc(content: string): string {
  if (!content) return "";
  if (/^(https?:|data:|\/)/.test(content)) return content;
  const binding = content.match(/^\s*\{\{-?\s*([\s\S]*?)\s*-?\}\}\s*$/);
  if (binding) {
    const expr = binding[1]!.split("|")[0]!.trim(); // drop any existing filter; image_url resolves the id
    // A client-only state binding (`state.pdp:current:…`) has colons that aren't a valid Liquid path;
    // it resolves to nothing server-side anyway (the old walker bakes it empty too), so blank it rather
    // than emit un-parseable Liquid. The runtime fills these dynamic srcs client-side.
    if (!/^[A-Za-z_][\w.]*$/.test(expr)) return "";
    return `{{ ${expr} | image_url }}`;
  }
  // Single-quote the id literal — a double-quoted `src="…"` can't hold `{{ "id" }}` without the inner
  // quotes being HTML-escaped to `&quot;`, which breaks the Liquid expression.
  return `{{ '${content.split("'").join("\\'")}' | image_url }}`;
}

function sanitizeTagName(raw: unknown): string {
  if (typeof raw !== "string") return "div";
  const clean = raw.trim().toLowerCase();
  return /^[a-z][a-z0-9]*$/.test(clean) ? clean : "div";
}

/**
 * Rewrite Craft's one-level `{{ a || fallback }}` binding fallback into Liquid `{{ a | default: '…' }}`
 * (the fallback is a literal string, per the resolver's `walkPath` rule). Anything without `||` passes
 * through untouched, so existing `| filter` pipes and plain `{{ item.x }}` tokens are unaffected. This
 * is the ONE place the stored rich-text binding syntax is translated for the engine.
 */
export function liquidizeBindings(s: string): string {
  return s.replace(/\{\{-?\s*([\s\S]*?)\s*-?\}\}/g, (full, expr: string) => {
    const head = expr.split("|")[0]!.trim();
    // A client-only state binding (`state.cart:open`, `state.pdp:current:…`) has colons that aren't a
    // valid Liquid path and resolves to nothing server-side (the walker bakes it empty); blank the
    // token so the page parses. The surrounding `data-variable` span lets the runtime fill it.
    if (/[:[]/.test(head)) return "";
    if (!expr.includes("||")) return full;
    const i = expr.indexOf("||");
    const fallback = expr.slice(i + 2).trim();
    const lit = /^(['"]).*\1$/.test(fallback) ? fallback : "'" + fallback.split("'").join("\\'") + "'";
    return `{{ ${expr.slice(0, i).trim()} | default: ${lit} }}`;
  });
}

// ─── interactive state + animation attributes (html-first runtime) ───────────

/** `root.animationLoop` → `--anim-iteration` (`loop` → infinite, `once` → 1, a count). */
function toIterationCount(loop: string): string | null {
  if (loop === "loop") return "infinite";
  if (loop === "once") return "1";
  return /^\d+(\.\d+)?$/.test(loop) ? loop : null;
}

/**
 * `props.root.animation` (a `cssAnimationPresets` key) → the html-first runtime's
 * entrance-animation contract: `data-animate="<suffix>"` (the keyframe name after
 * `animate-css-`, read by `chunks/animate.ts`), an optional `data-animate-trigger`,
 * and the `--anim-*` override vars `animate.css` reads. Only ENTRANCE presets map —
 * the runtime's animate chunk is entrance-only, so hover / continuous presets and
 * `site:<slug>` animations have no mechanism and emit nothing.
 */
function animationAttrs(props: Record<string, any>): { attrs: Record<string, string>; styleVars: string } {
  const root = props.root || {};
  const key = root.animation;
  const preset = typeof key === "string" ? cssAnimationPresets[key] : undefined;
  if (!preset || preset.group !== "Entrance" || !preset.animateClass) return { attrs: {}, styleVars: "" };
  const attrs: Record<string, string> = { "data-animate": preset.animateClass.replace(/^animate-css-/, "") };
  // Scroll is the runtime default (reveal on into-view); load/continuous reveal at once.
  const trigger = (typeof root.animationTrigger === "string" && root.animationTrigger) || preset.trigger;
  if (trigger !== "scroll") attrs["data-animate-trigger"] = "load";
  const vars: string[] = [];
  const dur = root.animationDuration != null && root.animationDuration !== "" ? parseFloat(root.animationDuration) : NaN;
  if (!Number.isNaN(dur)) vars.push(`--anim-duration: ${dur}s`);
  const del = root.animationDelay != null && root.animationDelay !== "" ? parseFloat(root.animationDelay) : NaN;
  if (!Number.isNaN(del)) vars.push(`--anim-delay: ${del}s`);
  if (typeof root.animationEasing === "string" && root.animationEasing) {
    vars.push(`--anim-easing: ${toTimingFunction(root.animationEasing)}`);
  }
  if (typeof root.animationLoop === "string" && root.animationLoop) {
    const it = toIterationCount(root.animationLoop);
    if (it) vars.push(`--anim-iteration: ${it}`);
  }
  return { attrs, styleVars: vars.join("; ") };
}

/**
 * Container shown/hidden by a state key → the runtime's `data-state-show` (the
 * `state` chunk sets `hidden = !test(key)`). Colon-namespaced keys the runtime
 * can't parse (`cart:open`, `form:x:fields`) are dropped — cart visibility is
 * the cart chunk's own domain, and form lifecycle is `[data-form-state]`.
 */
function visibilityShowAttr(props: Record<string, any>): Record<string, string> {
  const k = props.visibilityStateKey;
  if (typeof k !== "string" || !k || !isRuntimeStateKey(k)) return {};
  return { "data-state-show": k };
}

/** Container `inViewState` → `data-state-in-view="key=value"` (the `state-view` chunk's scroll-rail group writer). */
function inViewStateAttr(props: Record<string, any>): Record<string, string> {
  const iv = normalizeInViewState(props.inViewState);
  return iv ? { "data-state-in-view": `${iv.key}=${iv.value}` } : {};
}

/** The style attr for a node, merging `getInlineStyle` with any animation override vars. */
function styleWithAnim(props: Record<string, any>, styleVars: string): string | undefined {
  return [getInlineStyle(props), styleVars].filter(Boolean).join("; ") || undefined;
}

/** The DOM id an invoker's `commandfor` points at: the passthrough `attrs.id`, else `id`/`anchor`. */
function domId(props: Record<string, any>): string | undefined {
  const a = props.attrs && typeof props.attrs === "object" ? (props.attrs as any).id : undefined;
  return (typeof a === "string" && a) || props.id || props.anchor || undefined;
}

/**
 * Make an element a valid invoker TARGET when another node's action points at its id: a `show-hide`
 * target gets the `popover` attribute (`command="show/hide/toggle-popover"` acts on it) and an
 * `open-modal` target becomes a `<dialog>` (`command="show-modal"`). Without this the trigger has
 * nothing to open. The target id set is collected tree-wide by `convertSite` onto `ctx`.
 */
function invokerTarget(props: Record<string, any>, ctx: StaticRenderContext): { tag: "dialog" | null; attrs: Record<string, string | undefined> } {
  const id = domId(props);
  if (!id) return { tag: null, attrs: {} };
  if ((ctx as any).dialogTargets?.has?.(id)) return { tag: "dialog", attrs: {} };
  if ((ctx as any).popoverTargets?.has?.(id)) return { tag: null, attrs: { popover: "auto" } };
  return { tag: null, attrs: {} };
}

/** Container → its HTML tag, carrying class/style/id + any action (link → `<a>`, native invoker attrs). */
export function containerSource(props: Record<string, any>, children: string, ctx: StaticRenderContext): string {
  if (props.type === "component" || props.type === "componentCanvas") return "";
  let t = containerTag(props.type);
  // A plain div whose first action resolves to a link href renders as `<a>` (mirrors
  // Container.toHTML), so the same node is a real, crawlable, focusable link as on React routes.
  const { attrs: act, linkHref } = interactiveAttrs(props, ctx);
  if (t === "div" && linkHref) t = "a";
  // When another node's invoker targets this element's id, make it a real popover / <dialog> target.
  const target = invokerTarget(props, ctx);
  if (target.tag && t === "div") t = target.tag;
  const anim = animationAttrs(props);
  return el(
    t,
    {
      class: classString(props),
      style: styleWithAnim(props, anim.styleVars),
      id: props.id || props.anchor || undefined,
      ...act,
      ...anim.attrs,
      ...visibilityShowAttr(props),
      ...inViewStateAttr(props),
      ...stateClassAttr(props, ctx),
      ...target.attrs,
    },
    children
  );
}

/** The source emitters, keyed by node type — the `toSource` twin of `defaultResolver`. */
export const sourceResolver: Record<string, ToSourceFn> = {
  Container: containerSource,
  // Header is the `<header>` landmark slot: an unstyled slot renders `display: contents` so a sticky
  // block inside can pin against `<main>` (headerSlotProps). Footer and the cart/checkout chrome are
  // plain containers — same aliases the static resolver uses.
  Header: (props, children, ctx) => containerSource(headerSlotProps(props), children, ctx),
  Footer: containerSource,
  CartDrawer: containerSource,
  CartItems: containerSource,
  CartSubtotal: containerSource,
  CheckoutBanner: containerSource,
  CartBadge: cartBadgeSource,
  Icon: (props) => iconNodeSource(props),

  Text(props, _children, ctx) {
    const t = sanitizeTagName(props.tagName);
    // Rich text is kept as-is apart from the one-level `||` fallback → Liquid `default` rewrite; its
    // `{{ item.* }}` / `<span data-variable>` tokens are already the format's binding form.
    let inner = liquidizeBindings(typeof props.text === "string" ? props.text : "");
    // A Text with a link action wraps its inner text in `<a href>` INSIDE the original tag (mirrors
    // Text.toHTML) — the tag keeps its semantics/classes; native/handler attrs ride the outer tag.
    const { attrs, linkHref } = interactiveAttrs(props, ctx);
    const { href, target, rel, ...outer } = attrs as Record<string, string | null | undefined>;
    if (linkHref) inner = el("a", { href: linkHref, target, rel }, unwrapP(inner));
    const anim = animationAttrs(props);
    return el(t, { class: classString(props), style: styleWithAnim(props, anim.styleVars), id: props.id || undefined, ...outer, ...anim.attrs }, inner);
  },

  Image(props, _children, ctx) {
    const cls = classString(props);
    const content = props.src ?? props.content ?? "";
    const alt = typeof props.alt === "string" ? props.alt : typeof props.title === "string" ? props.title : "";
    // Inline SVG (icon) keeps its markup; a media id becomes the `image_url` filter so the renderer
    // resolves the same CDN URL the static walker baked in.
    if (props.type === "svg" && content) {
      return el("span", { class: cls, role: alt ? undefined : "presentation", "aria-label": alt || undefined }, String(content));
    }
    const src = imageSrc(String(content));
    const anim = animationAttrs(props);
    return el("img", { class: cls, src, alt, style: anim.styleVars || undefined, ...anim.attrs });
  },

  // Lazy ref: dataSource imports the walker from this module, so a direct ref would hit the cyclic
  // import's temporal-dead-zone; calling it at render time is past initialization.
  Data: (props, children, ctx) => dataSource(props, children, ctx),
  Form: formSource,
  FormElement: formElementSource,
  Video: videoSource,
  Audio: audioSource,
  Embed: embedSource,
  Map: mapSource,
  MapPoint: mapPointSource,
  MapPath: mapPathSource,
  Button: (props, children, ctx) => buttonSource(props, children, ctx),
  Link: (props, children, ctx) => linkSource(props, children, ctx),
};

/** A reusable-component slug for a `type:"component"` node (its saved-component ref or node id). */
export function componentSlug(props: Record<string, any>, nodeId: string): string {
  return String(props.component || props.savedComponent || nodeId);
}

/**
 * Emit the Liquid source for a node and its subtree. Conditions on a node wrap it in `{% if %}`.
 * Unknown types fall back to a `<div>` wrapper so the walk never drops a subtree silently.
 */
export function renderNodeToSource(nodeId: string, nodes: SerializedNodes, ctx: StaticRenderContext): string {
  const node = nodes[nodeId];
  if (!node || (node as any).hidden) return "";
  const props = node.props || {};
  const children = (node.nodes || []).map((id: string) => renderNodeToSource(id, nodes, ctx)).join("");
  // Expose the current node + the whole map so an emitter that needs its own children (e.g. Data,
  // which partitions template rows from the empty slot) can re-walk them instead of using the string.
  (ctx as any).nodes = nodes;
  (ctx as any).renderingNodeId = nodeId;
  const emit = sourceResolver[resolveType(node)];
  const body = emit ? emit(props, children, ctx) : el("div", {}, children);

  const groups = props.conditionGroups;
  if (Array.isArray(groups) && groups.length > 0) {
    // Client-only / non-flattenable conditions can't be decided at render time: the node is emitted
    // ungated with the reported note so the migration surfaces them per site.
    const notes: string[] = [];
    const expr = conditionExpr(groups, (n) => notes.push(n));
    if (expr) return `{% if ${expr} %}${body}{% endif %}`;
    return `${notes.join("")}${body}`;
  }
  return body;
}

/** The registered component name for a node (Craft `displayName`/`type.resolvedName`). */
function resolveType(node: SerializedNodes[string]): string {
  const t: any = (node as any).type;
  return (typeof t === "string" ? t : t?.resolvedName) || (node as any).displayName || "Container";
}

/** The page's `.liquid` source: the root node's subtree. (Partial lifting + `{% render %}` next.) */
export function renderToSource(rootId: string, nodes: SerializedNodes, ctx: StaticRenderContext): string {
  return renderNodeToSource(rootId, nodes, ctx);
}
