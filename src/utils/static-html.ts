/**
 * Shared utilities for static HTML rendering.
 *
 * Used by each component's `.craft.toHTML()` method and the tree walker
 * in `static-renderer.ts`. No React, no DOM — pure functions only.
 */

import parse from "style-to-object";
import { getCdnUrl } from "./cdn";
import { isCSSAnimation, getCSSAnimationProps } from "./animations";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Context passed to every `.craft.toHTML()` call */
export interface StaticRenderContext {
  /** All nodes in the tree (for child lookup, query shims, etc.) */
  nodes: Record<string, any>;
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
}

/** Signature every `.craft.toHTML` must implement */
export type ToHTMLFn = (
  props: Record<string, any>,
  childrenHTML: string,
  ctx: StaticRenderContext,
) => string;

// ─── HTML helpers ───────────────────────────────────────────────────────────

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
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

export function cssStringToObj(cssString: string | undefined | null): Record<string, string> | null {
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
  innerHTML?: string,
): string {
  const attrStr = buildAttrs(attrs);
  if (isVoidElement(tagName)) {
    return `<${tagName}${attrStr} />`;
  }
  return `<${tagName}${attrStr}>${innerHTML || ""}</${tagName}>`;
}

// ─── Aria / accessibility attributes ────────────────────────────────────────

const ARIA_KEYS = ["role", "aria-label", "aria-hidden", "aria-describedby", "aria-live"] as const;

/** Extract aria/accessibility attributes from component props for static HTML. */
export function ariaAttrs(props: Record<string, any>): Record<string, string | undefined> {
  const attrs: Record<string, string | undefined> = {};
  for (const key of ARIA_KEYS) {
    if (props[key]) attrs[key] = props[key];
  }
  return attrs;
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
  only: string[] = [],
): string {
  // className is now a string (post-migration)
  let cls = typeof props.className === "string"
    ? props.className
    : Array.isArray(props.className)
      ? props.className.join(" ")
      : "";

  // For mobile view, filter out responsive-prefixed classes
  if (ctx.view !== "desktop" && cls) {
    cls = cls.split(/\s+/).filter(c => !RESPONSIVE_RE.test(c)).join(" ");
  }

  // Append helpers (typography preset classes)
  if (props.helpers) {
    cls = [cls, props.helpers].filter(Boolean).join(" ");
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
  if (props.backgroundImage) {
    styleObj = { ...(styleObj || {}), "background-image": `url(${props.backgroundImage})` };
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

// Re-export for component convenience
export { getCdnUrl };
