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
import { withCartItemsDefaults } from "../../utils/cart/cartItemsDefaults";
import { agentBubbleSource, agentChatSource } from "./chatSource";
import { dataSource } from "./dataSource";
import { liquidizeBindings, rawRichBindings } from "./bindings";
import { formSource, formElementSource } from "./formSource";
import { videoSource, audioSource, embedSource, mapSource, mapPointSource, mapPathSource } from "./mediaSource";
import { buttonSource, linkSource, interactiveAttrs } from "./actionSource";
import { invokerTarget } from "./handlerSource";
import { instanceSource } from "./componentSource";
import { stateModifiers, isRuntimeStateKey } from "./conditions";
import { gateNode } from "./nodeGate";
import { normalizeInViewState } from "../../utils/state/inViewTracker";
import { cssAnimationPresets, toTimingFunction } from "../../utils/animations/animations";
import { iconFillWrapperClass } from "../../utils/icons/iconResolver";

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
    .map(([k, v]) => `${k}="${liquidizeBindings(String(v)).replace(/"/g, "&quot;")}"`)
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
            class: "flex items-center justify-center absolute pointer-events-none",
            hidden: "hidden",
            style:
              "top: -4px; right: -4px; min-width: 18px; height: 18px; border-radius: 9999px; font-size: 10px; font-weight: 700; background-color: var(--color-primary); color: var(--color-primary-content)",
            "aria-label": "0 items in cart",
            "aria-live": "polite",
            "data-state-text": STATE_KEY.cartCount,
            "data-state-show": `${STATE_KEY.cartCount}>0`,
          },
          "0"
        );
  return el("div", { class: cls, style: getInlineStyle(props) || undefined, id: props.id || props.anchor || undefined }, `${children}${pill}`);
}

/**
 * CartSubtotal → hidden while the cart is empty (`data-state-show="cart:count>0"`), holding the
 * author's children or, when there are none, the built-in "Subtotal  $X" row the app's CartSubtotal
 * `toHTML` emits (`components/stripe/cartSubtotalDefaults.ts`; the SDK can't import app code, so the
 * classes are repeated here). `cart:total` is filled by the cart runtime.
 */
function cartSubtotalSource(props: Record<string, any>, children: string): string {
  const cls = classString(props) || "border-base-300 border-t px-6 py-3";
  const inner =
    children.trim() ||
    el(
      "div",
      { class: "flex items-center justify-between" },
      el("span", { class: "text-base-content/70" }, "Subtotal") +
        el("span", { class: "text-xl font-bold", "data-state-text": STATE_KEY.cartTotal }, "")
    );
  return el("div", { class: cls, hidden: "hidden", "data-state-show": `${STATE_KEY.cartCount}>0` }, inner);
}

/**
 * CartItems → the empty host the cart chunk fills with the line items. Every setting ships as a `data-*`
 * attribute with its default filled in (the `toHTML` contract): the chunk builds the rows from them, and the
 * class values reach the CSS compiler through the attribute text.
 */
function cartItemsSource(props: Record<string, any>): string {
  const s = withCartItemsDefaults(props);
  return el(
    "div",
    {
      class: classString(props) || "flex-1 overflow-y-auto px-6 py-4",
      "data-cart-items": "true",
      "data-empty-class": s.emptyBoxClass,
      "data-empty-text": s.emptyText,
      "data-empty-text-class": s.emptyTextClass,
      "data-list-class": s.listClassName,
      "data-row-class": s.rowClassName,
      "data-image-class": s.imageClassName,
      "data-body-class": s.bodyClassName,
      "data-title-class": s.titleClassName,
      "data-variant-class": s.variantClassName,
      "data-price-class": s.priceClassName,
      "data-controls-class": s.controlsClassName,
      "data-quantity-class": s.quantityClassName,
      "data-control-button-class": s.controlButtonClassName,
      "data-remove-button-class": s.removeButtonClassName,
    },
    ""
  );
}

/**
 * Icon → a `<span>` wrapper (color + centering classes) holding the `{{ 'set/Name' | icon }}` filter
 * (the engine resolves the SVG at render). Mirrors Icon.toHTML: `role="img"` with an aria-label, else
 * `aria-hidden`. A `ref-image:<id>` value (an uploaded logo mark) resolves to a CDN `<img>` through the
 * same `image_url` filter the Image emitter uses, mirroring the React resolver. Any other value is empty.
 */
function iconNodeSource(props: Record<string, any>): string {
  const color = props.color || "fill-current";
  const baseCls = [color, "inline-flex", "items-center", "justify-center", classString(props)].filter(Boolean).join(" ");
  // The `{{ … | icon }}` svg carries only the 1em `ph-icon-svg` base; a sized wrapper stretches it to fill
  // (mirrors toHTML stamping `ph-icon-fill` on the svg). See iconFillWrapperClass.
  const wrapCls = [baseCls, iconFillWrapperClass(baseCls)].filter(Boolean).join(" ");
  const aria = ariaAttrs(props);
  const hasLabel = typeof aria["aria-label"] === "string" && aria["aria-label"].length > 0;
  const value = typeof props.value === "string" ? props.value : "";
  const inner = value.startsWith("ref-icon:")
    ? `{{ ${JSON.stringify(value.slice("ref-icon:".length))} | icon }}`
    : value.startsWith("ref-image:")
      ? `<img class="size-full object-contain" src="${imageSrc(value.slice("ref-image:".length))}" alt="">`
      : "";
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
  return imageSource(content).src;
}

/**
 * An Image `src` → the attribute value plus, for a bare binding with no fallback, `guard`: the Liquid path the
 * `<img>` must be wrapped in `{% if %}` for. The old static walker (`Image.toHTML`) drops an image whose src
 * resolves to nothing; shipping `<img>` with no src would be a broken box. A binding with a `|| fallback` keeps the
 * image and falls back to the literal (`| default:`), as `interpolate` does.
 */
function imageSource(content: string): { src: string; guard: string | null } {
  if (!content) return { src: "", guard: null };
  if (/^(https?:|data:|\/)/.test(content)) return { src: content, guard: null };
  const binding = content.match(/^\s*\{\{-?\s*([\s\S]*?)\s*-?\}\}\s*$/);
  if (binding) {
    const [primary, fallbackRaw] = binding[1]!.split("||");
    const expr = primary!.split("|")[0]!.trim(); // drop any existing filter; image_url resolves the id
    // A client-only state binding (`state.pdp:current:…`) has colons that aren't a valid Liquid path;
    // it resolves to nothing server-side anyway (the old walker bakes it empty too), so blank it rather
    // than emit un-parseable Liquid. The runtime fills these dynamic srcs client-side.
    if (!/^[A-Za-z_][\w.]*$/.test(expr)) return { src: "", guard: null };
    const fallback = fallbackRaw?.trim().replace(/^(["'])([\s\S]*)\1$/, "$2");
    if (fallback) return { src: `{{ ${expr} | image_url | default: '${fallback.split("'").join("\\'")}' }}`, guard: null };
    return { src: `{{ ${expr} | image_url }}`, guard: expr };
  }
  // Single-quote the id literal — a double-quoted `src="…"` can't hold `{{ "id" }}` without the inner
  // quotes being HTML-escaped to `&quot;`, which breaks the Liquid expression.
  return { src: `{{ '${content.split("'").join("\\'")}' | image_url }}`, guard: null };
}

function sanitizeTagName(raw: unknown): string {
  if (typeof raw !== "string") return "div";
  const clean = raw.trim().toLowerCase();
  return /^[a-z][a-z0-9]*$/.test(clean) ? clean : "div";
}

export { liquidizeBindings } from "./bindings";

/**
 * A `<span data-variable="state.<key>">` whose token liquidizeBindings blanked (nothing server-side can fill a
 * client state value) gets `data-state-text="<key>"`, which the runtime's state chunk fills and keeps current.
 * `<key>` may walk into a JSON value (`pdp:current:matching-variant.formatted`).
 */
function bindStateText(html: string): string {
  return html.replace(/<span data-variable="state\.([^"{}\s]+)"([^>]*)><\/span>/g, '<span data-variable="state.$1"$2 data-state-text="$1"></span>');
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
 * can't parse (`form:x:fields`) are dropped — form lifecycle is `[data-form-state]`.
 * The cart drawer's `cart:open` is kept: the cart chunk writes it.
 */
function visibilityShowAttr(props: Record<string, any>): Record<string, string> {
  const k = props.visibilityStateKey;
  // `cart:open` is the one namespaced key the runtime owns: the cart chunk toggles it and the state chunk shows the panel.
  if (typeof k !== "string" || !k || (k !== STATE_KEY.cartOpen && !isRuntimeStateKey(k))) return {};
  return { "data-state-show": k };
}

/**
 * A Container that is a form's `fields` / `loading` / `loaded` slot (`visibilityStateKey: form:<id>:<slot>`)
 * → the site-runtime form chunk's `data-form-state="idle|sending|sent"`, which swaps those children in place
 * on submit. The authored `hidden` class becomes the `hidden` ATTRIBUTE: the chunk toggles `el.hidden`, and a
 * lingering `.hidden` class would keep the sending / thank-you block display:none after it is "shown".
 */
const FORM_SLOT_STATE: Record<string, string> = { fields: "idle", loading: "sending", loaded: "sent" };
function formSlotState(props: Record<string, any>): string | null {
  const m = /^form:.+:(fields|loading|loaded)$/.exec(typeof props.visibilityStateKey === "string" ? props.visibilityStateKey : "");
  return m ? FORM_SLOT_STATE[m[1]!]! : null;
}

/** Container `inViewState` → `data-state-in-view="key=value"` (the `state-view` chunk's scroll-rail group writer). */
function inViewStateAttr(props: Record<string, any>): Record<string, string> {
  const iv = normalizeInViewState(props.inViewState);
  return iv ? { "data-state-in-view": `${iv.key}=${iv.value}` } : {};
}

/**
 * Container `computedStateBindings` with a `variant-match` → the runtime's `data-state-compute`. The variant map and
 * axes stay `{{ item.* }}` bindings (the engine fills them per repeater row); `data-axis-key` is the chips' key
 * template (`pdp:current:axis:%axis%`). The state-compute chunk writes the matched variant, as JSON, to `data-compute-key`.
 * `count` maps to the runtime's `count` compute (`data-from` / `data-count-value`). Other compute types have no runtime counterpart and emit nothing.
 */
function computeAttrs(props: Record<string, any>): Record<string, string | undefined> {
  const bindings: any[] = Array.isArray(props.computedStateBindings) ? props.computedStateBindings : [];
  // `count` (a quiz score): how many of the `from` keys equal `value`. The runtime's `count` compute reads them as `data-from`.
  const tally = bindings.find((x) => x?.compute?.type === "count" && typeof x.key === "string" && Array.isArray(x.from));
  if (tally) {
    return {
      "data-state-compute": "count",
      "data-compute-key": tally.key,
      "data-from": tally.from.join(","),
      "data-count-value": tally.compute.value ? String(tally.compute.value) : undefined,
    };
  }
  const b = bindings.find((x: any) => x?.compute?.type === "variant-match");
  if (!b || typeof b.key !== "string") return {};
  const c = b.compute;
  const axes = Array.isArray(c.axes) ? c.axes.join(",") : String(c.axes ?? "");
  return {
    "data-state-compute": "variant-match",
    "data-compute-key": b.key,
    "data-variants": String(c.variantMap ?? ""),
    "data-axes": axes,
    "data-axis-key": String(c.axisKeyTemplate ?? ""),
  };
}

/** The style attr for a node, merging `getInlineStyle` with any animation override vars. */
function styleWithAnim(props: Record<string, any>, styleVars: string): string | undefined {
  return [getInlineStyle(props), styleVars].filter(Boolean).join("; ") || undefined;
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
  const mods = stateModifiers(props, ctx);
  let cls = (classString(props) ?? "") + mods.classAdd || undefined;
  const slot = formSlotState(props);
  let startsHidden = false;
  // A form slot and the cart drawer panel are shown by toggling the `hidden` ATTRIBUTE; a lingering `.hidden` class would stay display:none.
  if ((slot || props.visibilityStateKey === STATE_KEY.cartOpen) && cls && /(^|\s)hidden(\s|$)/.test(cls)) {
    const kept = cls.split(/\s+/).filter((c) => c !== "hidden");
    // The authored `flex hidden` pair collapsed to `hidden` at save time (twMerge); a shown panel stacks its column again.
    if (props.visibilityStateKey === STATE_KEY.cartOpen && kept.includes("flex-col") && !kept.includes("flex")) kept.push("flex");
    cls = kept.join(" ") || undefined;
    startsHidden = true;
  }
  const anim = animationAttrs(props);
  return el(
    t,
    {
      class: cls,
      ...(slot ? { "data-form-state": slot } : {}),
      ...(startsHidden ? { hidden: "hidden" } : {}),
      style: styleWithAnim(props, anim.styleVars),
      id: props.id || props.anchor || undefined,
      ...act,
      ...anim.attrs,
      ...visibilityShowAttr(props),
      ...inViewStateAttr(props),
      ...computeAttrs(props),
      ...mods.attrs,
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
  CartItems: (props) => cartItemsSource(props),
  CartSubtotal: (props, children) => cartSubtotalSource(props, children),
  CheckoutBanner: containerSource,
  // The site chat widget (chatSource.ts): a hidden shell the runtime's `chat` chunk finishes.
  AgentFloatingBubble: agentBubbleSource,
  AgentChat: agentChatSource,
  CartBadge: cartBadgeSource,
  Icon: (props) => iconNodeSource(props),

  Text(props, _children, ctx) {
    const t = sanitizeTagName(props.tagName);
    // Rich text is kept as-is apart from the one-level `||` fallback → Liquid `default` rewrite; its
    // `{{ item.* }}` / `<span data-variable>` tokens are already the format's binding form.
    // The TipTap `<p>` wrapper is dropped (unwrapP) so the text sits directly in the node's own element,
    // as Text.toHTML does; a `<span><p>…</p></span>` would otherwise render block-level with p margins.
    const text = typeof props.text === "string" ? props.text : "";
    // Hand-edited data can hold paragraph runs with no outer `<p>` ("A</p><p>B"): a browser reads that as two
    // paragraphs, but unwrapP would leave the stray tags inside the node's own element (a `</p>` closing an `<h1>`).
    // A `p` / `div` element takes the stray tags as they are (the browser reads them as sibling paragraphs and the
    // file lints); any other element (`h1`, `span`) can't hold them.
    const rawText = t !== "p" && t !== "div" && !/^\s*<p[\s>]/.test(text) && /<\/p>\s*<p>/.test(text) ? `<p>${text}</p>` : text;
    const wrapped = /^<p>[\s\S]*<\/p>$/.test(rawText.trim());
    let inner = bindStateText(rawRichBindings(liquidizeBindings(unwrapP(rawText)), (ctx as any).richFields, wrapped));
    // A Text with a link action wraps its inner text in `<a href>` INSIDE the original tag (mirrors
    // Text.toHTML) — the tag keeps its semantics/classes; native/handler attrs ride the outer tag.
    const { attrs, linkHref } = interactiveAttrs(props, ctx);
    const { href, target, rel, ...outer } = attrs as Record<string, string | null | undefined>;
    if (linkHref) inner = el("a", { href: linkHref, target, rel }, unwrapP(inner));
    const anim = animationAttrs(props);
    const mods = stateModifiers(props, ctx);
    const cls = (classString(props) ?? "") + mods.classAdd || undefined;
    return el(t, { class: cls, style: styleWithAnim(props, anim.styleVars), id: props.id || undefined, ...outer, ...anim.attrs, ...mods.attrs }, inner);
  },

  Image(props, _children, ctx) {
    const cls = classString(props);
    const content = props.src ?? props.content ?? "";
    // `alt` can hold a Craft binding (`{{item.title || Product}}`, common on repeater images). Run it
    // through the same `||`→`default:` rewrite the Text path uses — a raw `||` is a LiquidJS parse error
    // ("expected filter name") that blanks the WHOLE page, not just the image.
    const alt = liquidizeBindings(typeof props.alt === "string" ? props.alt : typeof props.title === "string" ? props.title : "");
    // Inline SVG (icon) keeps its markup; a media id becomes the `image_url` filter so the renderer
    // resolves the same CDN URL the static walker baked in.
    if (props.type === "svg" && content) {
      return el("span", { class: cls, role: alt ? undefined : "presentation", "aria-label": alt || undefined }, String(content));
    }
    // `videoId` is the media-library id the editor's picker writes (hero backgrounds, logos, gallery).
    // It wins over `src`/`content` and is always a stored id, so it resolves through the same
    // `image_url` filter — mirroring Image.toHTML's `if (videoId) cdnId = videoId` branch. Without this,
    // a library-picked image ships as an `<img>` with no src and renders blank.
    const { src, guard } = imageSource(String(props.videoId || content));
    const anim = animationAttrs(props);
    // A `{{state.*}}` src (the matched variant's image) can't resolve server-side; mirror Image.toHTML and
    // ship it in `data-state-src` for the runtime's `state-src` directive. Added after `el()` (which blanks
    // colon-keyed state tokens) and wrapped in `{% raw %}` so Liquid leaves the token for the runtime.
    const rawSrc = String(content);
    const stateSrc = !props.videoId && rawSrc.includes("{{state.");
    // Image.toHTML ships nothing for an image with no src (and no state src to fill in): an `<img>` without one is a
    // broken box. A bare binding that may resolve empty (`{{company.logo}}`, a row with no image) is guarded the same way.
    if (!src && !stateSrc) return "";
    let img = el("img", { class: cls, src, alt, style: anim.styleVars || undefined, ...anim.attrs }, "");
    if (stateSrc) img = img.replace(/^<img/, `<img data-state-src="{% raw %}${rawSrc.replace(/"/g, "&quot;")}{% endraw %}"`);
    return guard ? `{% if ${guard} %}${img}{% endif %}` : img;
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
  // A linked copy of a reusable component is a `{% render %}` of its partial (componentSource.ts).
  const instance = instanceSource(node, ctx);
  if (instance !== null) return instance;
  const props = node.props || {};
  // Child ids mirror the static walker: `nodes` first, then Craft `linkedNodes` (a Form's fields / sending /
  // thank-you slots live there, and nothing else renders them).
  const childIds = [...(node.nodes || []), ...Object.values((node as any).linkedNodes || {})] as string[];
  const children = childIds.map((id) => renderNodeToSource(id, nodes, ctx)).join("");
  // Expose the current node + the whole map so an emitter that needs its own children (e.g. Data,
  // which partitions template rows from the empty slot) can re-walk them instead of using the string.
  (ctx as any).nodes = nodes;
  (ctx as any).renderingNodeId = nodeId;
  const emit = sourceResolver[resolveType(node)];
  // Statements the emitter needs ahead of its element (the `{% capture %}`s an attribute refers to): collected on
  // `ctx.pre` for this node only, restored for the outer node a nested walk (a Data's re-walk) interrupted.
  const outerPre = (ctx as any).pre;
  (ctx as any).pre = [];
  const body = emit ? emit(props, children, ctx) : el("div", {}, children);
  const pre: string = ((ctx as any).pre as string[]).join("");
  (ctx as any).pre = outerPre;
  return pre + gateNode(props, body);
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
