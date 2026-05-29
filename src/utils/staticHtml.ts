/**
 * Shared utilities for static HTML rendering.
 *
 * Used by each component's `.craft.toHTML()` method and the tree walker
 * in `static-renderer.ts`. No React, no DOM — pure functions only.
 */

import parse from "style-to-object";
import { migrateActions, actionToHref } from "./action";
import { applyHandlerOptions, readHandlerOptions } from "./actions/handlerCode";
import type { PageIndex } from "./page/pageManagement";
import { getCdnUrl, generateSrcSet, generateSizes, inferFixedSizesFromClassName } from "./cdn";
import { isCSSAnimation, getCSSAnimationProps } from "./animations/animations";
import { purifyToTailwind } from "./tailwind/daisyuiToTailwind";
import { replaceVariables } from "./design/variables";
import { BUILTIN_STATE_MODIFIERS } from "./conditions/stateBuiltinModifiers";
import type { ComponentModifier } from "../define/types";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Context passed to every `.craft.toHTML()` call */
export interface StaticRenderContext {
  /** All nodes in the tree (for child lookup, query shims, etc.) */
  nodes: Record<string, any>;
  /** Set by the static HTML tree walker around each `toHTML` call (for parent lookups). */
  renderingNodeId?: string;
  /** Viewport mode */
  view: "desktop" | "mobile";
  /** Palette from ROOT node */
  palette: Array<{ name: string; color: string }>;
  /** Accumulator — every Tailwind class encountered */
  classes: Set<string>;
  /** Accumulator — Google Font URLs needed */
  fontUrls: Set<string>;
  /** Render child node IDs to HTML (provided by the tree walker) */
  renderChildren: (nodeIds: string[]) => string;
  /** When true, replace DaisyUI/spatial classes with pure Tailwind equivalents */
  pureTailwind?: boolean;
  /** Set to true by the tree walker when a node has client-only conditions */
  hasClientConditions?: boolean;
  /** Set to true by `toHTML` when it stamps a `data-ph-load-show` marker on a node — opts the static export into shipping the load-action bootstrap script (`getLoadActionScript()`). */
  hasLoadActions?: boolean;
  /** Server-fetched connector data — enables connector-backed condition eval at SSR. */
  connectorData?: Record<string, { bindings: Record<string, any[]> }> | null;
  /**
   * Current repeater item context. Set by `Data.toHTML` around each iteration's
   * child render pass so component toHTMLs can resolve `{{item.*}}` tokens via
   * `interpolate()`. Null at the top level.
   */
  currentItem?: Record<string, any> | null;
  /**
   * Set by the walker when entering a `Data` node — Data.toHTML reads these IDs
   * and renders them once per resolved item via `ctx.renderChildren`. The
   * walker skips its normal pre-render for Data so per-item interpolation works.
   */
  repeaterChildIds?: string[];
  /**
   * Optional request hints supplied by the host (Next.js page) for SSR
   * condition resolution: cookie-derived auth state, UA-derived viewport
   * class, parsed URL query. Lets `auth` / `device` / `url-param`
   * conditions resolve definitively at SSR instead of deferring to the
   * client re-eval script.
   */
  requestContext?: {
    isAuthenticated?: boolean;
    userAgentClass?: "mobile" | "tablet" | "desktop";
    urlParams?: Record<string, string>;
  };
  /**
   * Map of page node id → `{ isHomePage, displayName }` for ROOT's `page`-typed
   * children. Seeded by the static renderer before walking so toHTML emitters
   * can resolve `ref:<pageId>` action hrefs to real paths.
   */
  pageIndex?: PageIndex;
  /**
   * Current request path (e.g. `/static/<siteId>/about` or `/about`). Lets
   * `resolvePageRef` prefix internal `ref:<pageId>` hrefs so navigation works
   * under preview routes (`/static/<id>`, `/view/<id>`, `/build/<id>`). On
   * production custom domains this is the bare slug path and no prefix is
   * applied — that's intentional.
   */
  currentPath?: string;
}

/** Signature every `.craft.toHTML` must implement.
 *
 * Generic over the component's props shape so `defineComponent<P>(...)` can
 * narrow `props` for host authors. Defaults to `Record<string, any>` so
 * existing non-generic call sites (every built-in toHTML module, the
 * fallback in `helpers.ts`, processor resolvers in `forStatic.ts`) keep
 * compiling untouched.
 */
export type ToHTMLFn<P = Record<string, any>> = (
  props: P,
  childrenHTML: string,
  ctx: StaticRenderContext
) => string;

// ─── HTML helpers ───────────────────────────────────────────────────────────

const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

export function buildAttrs(attrs: Record<string, string | boolean | undefined | null>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false || value === "") continue;
    if (value === true) {
      parts.push(key);
    } else {
      parts.push(`${key}="${escapeAttr(String(value))}"`);
    }
  }
  return parts.length ? " " + parts.join(" ") : "";
}

export function styleObjToString(obj: Record<string, string> | null | undefined): string {
  if (!obj) return "";
  return Object.entries(obj)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => {
      const prop = k.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${prop}: ${v}`;
    })
    .join("; ");
}

export function cssStringToObj(
  cssString: string | undefined | null
): Record<string, string> | null {
  if (!cssString) return null;
  try {
    return parse(cssString);
  } catch {
    return null;
  }
}

export function isVoidElement(tag: string): boolean {
  return VOID_ELEMENTS.has(tag);
}

// ─── Tag builder ────────────────────────────────────────────────────────────

/** Build a complete HTML tag string */
export function tag(
  tagName: string,
  attrs: Record<string, string | boolean | undefined | null>,
  innerHTML?: string
): string {
  const attrStr = buildAttrs(attrs);
  if (isVoidElement(tagName)) {
    return `<${tagName}${attrStr} />`;
  }
  return `<${tagName}${attrStr}>${innerHTML || ""}</${tagName}>`;
}

// ─── Aria / accessibility attributes ────────────────────────────────────────

const ARIA_KEYS = ["role", "aria-label", "aria-hidden", "aria-describedby", "aria-live"] as const;

/** Extract aria/accessibility attributes + scroll-timeline data from component props for static HTML. */
export function ariaAttrs(props: Record<string, any>): Record<string, string | undefined> {
  const attrs: Record<string, string | undefined> = {};
  for (const key of ARIA_KEYS) {
    if (props[key]) attrs[key] = props[key];
  }
  // Scroll timeline: emit data attribute so GSAP can find this node
  if (props.root?.scrollTimeline?.preset) {
    attrs["data-scroll-timeline"] = JSON.stringify(props.root.scrollTimeline);
  }
  return attrs;
}

// ─── Custom JS handlers (props.handlers) ───────────────────────────────────

// React synthetic event names → native HTML event handler attributes. Most are
// a simple lowercase; only onDoubleClick deviates (`dblclick`).
const REACT_EVENT_TO_HTML: Record<string, string> = {
  onDoubleClick: "ondblclick",
};

/**
 * Emit author-declared `props.handlers` as native HTML event attributes
 * (`onclick="..."`, `onmouseenter="..."`, ...) on the element. Browsers run
 * these without any framework runtime. Mirrors `addCustomHandlers` on the
 * React path so exported static HTML has the same behavior as hydrated pages.
 */
export function handlerAttrs(props: Record<string, any>): Record<string, string | undefined> {
  const h = props.handlers;
  if (!h || typeof h !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
    if (typeof v !== "string" || !v.trim()) continue;
    if (!/^on[A-Z]/.test(k)) continue;
    const attr = REACT_EVENT_TO_HTML[k] ?? k.toLowerCase();
    out[attr] = applyHandlerOptions(v, readHandlerOptions(props.handlerOptions, k));
  }
  return out;
}

/**
 * Pass `props.attrs` (plain HTML attribute map) through to the rendered tag.
 * Mirrors the Container.toHTML inline passthrough; extracted so Text /
 * Button / Link / Image / FormElement can share the same semantics.
 *
 * Only string/number/boolean values are accepted (matches what React
 * DOM attribute serialization tolerates).
 */
export function attrsPassthrough(
  props: Record<string, any>
): Record<string, string | number | boolean | undefined> {
  const a = props.attrs;
  if (!a || typeof a !== "object") return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(a as Record<string, unknown>)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v as string | number | boolean;
    }
  }
  return out;
}

// ─── Class resolution ───────────────────────────────────────────────────────

/** Responsive prefix regex — matches md:, lg:, xl:, 2xl: */
const RESPONSIVE_RE = /^(md:|lg:|xl:|2xl:)/;

/**
 * Resolve Tailwind classes for static HTML output.
 *
 * Reads `props.className` (the source of truth after className migration)
 * and filters responsive prefixes for mobile view.
 */
export function staticClasses(
  props: Record<string, any>,
  ctx: StaticRenderContext,
  exclude: string[] = [],
  only: string[] = []
): string {
  // className is now a string (post-migration)
  let cls =
    typeof props.className === "string"
      ? props.className
      : Array.isArray(props.className)
        ? props.className.join(" ")
        : "";

  // For mobile view, filter out responsive-prefixed classes
  if (ctx.view !== "desktop" && cls) {
    cls = cls
      .split(/\s+/)
      .filter(c => !RESPONSIVE_RE.test(c))
      .join(" ");
  }

  // Append helpers (typography preset classes)
  if (props.helpers) {
    cls = [cls, props.helpers].filter(Boolean).join(" ");
  }

  // Purify DaisyUI/spatial → pure Tailwind when requested
  if (ctx.pureTailwind && cls) {
    cls = purifyToTailwind(cls);
  }

  // Collect every class for the CSS extraction accumulator
  collectClasses(cls, ctx);

  // ── CSS animation classes (automatic for all components) ────────────
  const animKey = props.root?.animation;
  if (animKey && isCSSAnimation(animKey)) {
    const { className } = getCSSAnimationProps(animKey, {
      duration: props.root?.animationDuration ? parseFloat(props.root.animationDuration) : null,
      delay: props.root?.animationDelay ? parseFloat(props.root.animationDelay) : null,
      easing: props.root?.animationEasing || null,
      trigger: props.root?.animationTrigger || null,
    });
    if (className) {
      collectClasses(className, ctx);
      return [cls, className].filter(Boolean).join(" ");
    }
  }

  return cls;
}

/** Collect classes from a raw className string */
export function collectClasses(className: string, ctx: StaticRenderContext): void {
  if (!className) return;
  for (const c of className.split(/\s+/)) {
    if (c) ctx.classes.add(c);
  }
}

// ─── Inline style helper ────────────────────────────────────────────────────

export function getInlineStyle(props: Record<string, any>): string {
  let styleObj = props.root?.style ? cssStringToObj(props.root.style) : null;
  if (props.background?.image) {
    styleObj = { ...(styleObj || {}), "background-image": `url(${props.background.image})` };
  }
  // State-bound style bindings — at SSR the registry is empty, so emit each
  // binding's `defaultValue` (or "0"). Hydration overwrites with the live
  // value on first React render.
  if (Array.isArray(props.stateStyleBindings) && props.stateStyleBindings.length > 0) {
    const next: Record<string, string> = { ...(styleObj || {}) };
    for (const b of props.stateStyleBindings) {
      if (!b || !b.key || !b.styleProp) continue;
      const raw = typeof b.defaultValue === "string" ? b.defaultValue : "0";
      const out = b.template ? String(b.template).replace(/\{\{value\}\}/g, raw) : raw;
      next[b.styleProp] = out;
    }
    styleObj = next;
  }

  // ── CSS animation inline style overrides ────────────────────────────
  const animKey = props.root?.animation;
  if (animKey && isCSSAnimation(animKey)) {
    const { style: animStyle } = getCSSAnimationProps(animKey, {
      duration: props.root?.animationDuration ? parseFloat(props.root.animationDuration) : null,
      delay: props.root?.animationDelay ? parseFloat(props.root.animationDelay) : null,
      easing: props.root?.animationEasing || null,
      trigger: props.root?.animationTrigger || null,
    });
    if (Object.keys(animStyle).length) {
      // Convert camelCase keys to kebab-case for HTML style attr
      const kebabStyle: Record<string, string> = {};
      for (const [k, v] of Object.entries(animStyle)) {
        kebabStyle[k] = v;
      }
      styleObj = { ...(styleObj || {}), ...kebabStyle };
    }
  }

  return styleObjToString(styleObj);
}

// ─── Multi-action stamping ──────────────────────────────────────────────────

/**
 * Emit the full `props.action` chain (normalized via `migrateActions`) as a
 * `data-ph-actions` JSON attribute. The vanilla static runtime dispatches the
 * chain in click order; the first link action also stays on the `<a href>`
 * fallback for no-JS / right-click semantics, so emitting it here doesn't
 * double-fire (the runtime dedupes against the anchor href on click).
 *
 * Load-trigger actions are filtered out — they're separately stamped as
 * `data-ph-load-show` / `data-ph-load-set-state` and fire on mount, not
 * click. Including them here would re-fire on every click.
 */
/** Read the page index for `ref:<pageId>` resolution. Prefers the value seeded
 *  on `ctx` by the static renderer; falls back to `ROOT.props._pageIndex`. */
export function getPageIndex(ctx?: StaticRenderContext): PageIndex | null {
  return (ctx?.pageIndex ??
    ctx?.nodes?.ROOT?.props?._pageIndex ??
    null) as PageIndex | null;
}

/**
 * Resolve any action to an href string for static `<a>` tags, with the page
 * index plumbed in. Mirrors `actionToHref` but reads `pageIndex` from `ctx`
 * so callers don't have to.
 */
export function resolveActionHref(action: any, ctx?: StaticRenderContext): string | null {
  return actionToHref(action, getPageIndex(ctx), ctx?.currentPath);
}

export function actionsAttr(
  props: Record<string, any>,
  ctx?: StaticRenderContext
): Record<string, string | undefined> {
  const all = migrateActions(props);
  const actions = all.filter((a: any) => a?.trigger !== "load");
  if (!actions.length) return {};
  // Resolve `ref:<pageId>[/path|?query|#hash]` hrefs to real paths so the
  // runtime's window.location.assign(href) doesn't try to launch a "ref:"
  // scheme. Same resolver the <a href> path uses.
  const pageIndex = getPageIndex(ctx);
  const resolved = actions.map((a: any) => {
    if (a?.type === "link" && typeof a.href === "string" && a.href.startsWith("ref:")) {
      const real = actionToHref(a, pageIndex, ctx?.currentPath);
      return real ? { ...a, href: real } : a;
    }
    return a;
  });
  return { "data-ph-actions": JSON.stringify(resolved) };
}

// ─── State-binding attributes ───────────────────────────────────────────────

/** Emit `data-state-binding` for `<FormElement>`-style state-binding props. */
export function stateBindingAttrs(props: Record<string, any>): Record<string, string | undefined> {
  const b = props.stateBinding;
  if (!b || typeof b !== "object" || !b.key) return {};
  return { "data-state-binding": JSON.stringify(b) };
}

/**
 * Resolve a modifier name to its class list. Mirrors
 * `applyStateModifiers` — reads the viewer-safe builtin registry and any
 * site-saved overrides on `ROOT.props.modifiers[<componentName>]`.
 */
function resolveModifierClasses(
  componentName: string,
  modifierName: string,
  rootProps: any
): string {
  const builtin = BUILTIN_STATE_MODIFIERS[componentName] ?? [];
  const siteSaved =
    (rootProps?.modifiers?.[componentName] as ComponentModifier[] | undefined) ?? [];
  const available = builtin.concat(siteSaved);
  const mod = available.find(m => m.name === modifierName);
  if (!mod) return "";
  if (mod.classes) return mod.classes;
  return mod.name;
}

/**
 * Emit `data-state-modifiers` for state-driven className modifier rules.
 *
 * The runtime is state-table-free: we resolve modifier *names* to Tailwind
 * class strings here at SSR, so the emitted payload is
 * `[{ conditions, classes: "<class string>" }, ...]`. The runtime just
 * toggles the resolved class string when the binding's conditions pass.
 *
 * Resolves against the same `BUILTIN_STATE_MODIFIERS` registry the React
 * path uses, plus any site-saved overrides on
 * `ROOT.props.modifiers[<componentName>]`. The component name comes from
 * `ctx.renderingNodeId` (set by the walker).
 */
export function stateModifiersAttrs(
  props: Record<string, any>,
  ctx?: StaticRenderContext
): Record<string, string | undefined> {
  const m = props.stateModifiers;
  if (!Array.isArray(m) || m.length === 0) return {};
  // Without ctx we can't resolve names → classes; emit the raw JSON shape
  // as a degraded fallback (component-side callers always thread ctx through).
  if (!ctx) return { "data-state-modifiers": JSON.stringify(m) };

  const node = ctx.renderingNodeId ? ctx.nodes?.[ctx.renderingNodeId] : null;
  const componentName =
    (node && (typeof node.type === "string" ? node.type : node.type?.resolvedName)) || "Container";
  const rootProps = ctx.nodes?.["ROOT"]?.props || {};

  const resolved = m.map((binding: any) => {
    const classes = Array.isArray(binding?.modifiers)
      ? binding.modifiers
          .map((name: string) => resolveModifierClasses(componentName, name, rootProps))
          .filter(Boolean)
          .join(" ")
      : "";
    return { conditions: binding?.conditions || [], classes };
  });
  // Filter bindings with no resolved classes (unknown modifier names) so the
  // runtime doesn't iterate dead bindings.
  const filtered = resolved.filter(b => b.classes);
  if (!filtered.length) return {};
  return { "data-state-modifiers": JSON.stringify(filtered) };
}

/** Emit `data-state-style-bindings` for state-driven inline style bindings. */
export function stateStyleBindingsAttrs(
  props: Record<string, any>
): Record<string, string | undefined> {
  const m = props.stateStyleBindings;
  if (!Array.isArray(m) || m.length === 0) return {};
  return { "data-state-style-bindings": JSON.stringify(m) };
}

/** Emit `data-computed-state-bindings` for compute-on-mount state writes. */
export function computedStateBindingsAttrs(
  props: Record<string, any>
): Record<string, string | undefined> {
  const m = props.computedStateBindings;
  if (!Array.isArray(m) || m.length === 0) return {};
  return { "data-computed-state-bindings": JSON.stringify(m) };
}

/** Emit `data-visibility-state-key` so the runtime can toggle the node. */
export function visibilityStateKeyAttr(
  props: Record<string, any>
): Record<string, string | undefined> {
  const k = props.visibilityStateKey;
  if (typeof k !== "string" || !k) return {};
  return { "data-visibility-state-key": k };
}

/** Emit `data-publish-state-keys` so connector-backed nodes can publish meta. */
export function publishStateKeysAttr(
  props: Record<string, any>
): Record<string, string | undefined> {
  const k = props.dataSource?.publishStateKeys;
  if (!k || typeof k !== "object") return {};
  return { "data-publish-state-keys": JSON.stringify(k) };
}

/** All state-related data-attrs in one spread. */
export function stateAttrs(
  props: Record<string, any>,
  ctx?: StaticRenderContext
): Record<string, string | undefined> {
  return {
    ...stateBindingAttrs(props),
    ...stateModifiersAttrs(props, ctx),
    ...stateStyleBindingsAttrs(props),
    ...computedStateBindingsAttrs(props),
    ...visibilityStateKeyAttr(props),
    ...publishStateKeysAttr(props),
  };
}

// ─── Variable interpolation ─────────────────────────────────────────────────

/**
 * Build a minimal interpolation context for static toHTML. The walker exposes
 * the full node tree via `ctx.nodes`; ROOT props carry company / theme /
 * variables / pageMedia which `replaceVariables` walks. Item context is
 * threaded through when toHTML is called inside a repeater (Wave 3).
 */
export function buildInterpContext(ctx: StaticRenderContext): Record<string, any> {
  return ctx.nodes?.["ROOT"]?.props || {};
}

/**
 * Run `replaceVariables` against a string using the walker's ROOT props.
 * Returns the input unchanged if it has no `{{...}}` tokens (cheap fast-path)
 * or if interpolation fails. Item-scoped tokens (`{{item.*}}`) resolve to
 * empty string until repeater iteration lands in Wave 3.
 */
export function interpolate(
  text: string | null | undefined,
  ctx: StaticRenderContext,
  item: Record<string, any> | null = null
): string {
  if (typeof text !== "string" || !text) return "";
  if (!text.includes("{{")) return text;
  const rootProps = buildInterpContext(ctx);
  // Fall back to ctx.currentItem when caller didn't pass an explicit item —
  // Data.toHTML sets ctx.currentItem around each iteration so component
  // toHTMLs resolve `{{item.*}}` without each one being item-aware.
  const resolvedItem = item ?? ctx.currentItem ?? null;
  return replaceVariables(text, rootProps, resolvedItem);
}

// Re-export for component convenience
export { getCdnUrl, generateSrcSet, generateSizes, inferFixedSizesFromClassName };
