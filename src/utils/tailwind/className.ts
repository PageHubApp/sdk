/**
 * className utilities — parse and mutate Tailwind className strings.
 *
 * Pure functions, no React, no DOM. Used by the editor settings panels
 * to read/write className as the source of truth (className-first).
 */

import { twMerge } from "tailwind-merge";
import { fontUtilityStemToKey } from "./fontFamilyClass";
import { ringOutlineClassKey } from "./ringOutlineClassKey";
import { TailwindStyles, RootClassGenProps, PREFIX_ENTRIES } from "./tailwind-styles";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Map of prop keys to their current Tailwind class value. */
export type ClassTokens = Record<string, string>;

// ─── Reverse index (built once, cached) ─────────────────────────────────────

let reverseIndex: Map<string, string> | null = null;

function getReverseIndex(): Map<string, string> {
  if (reverseIndex) return reverseIndex;

  reverseIndex = new Map();
  for (const key of Object.keys(TailwindStyles)) {
    if ((RootClassGenProps as string[]).includes(key)) continue;
    for (const cls of (TailwindStyles as Record<string, any>)[key]) {
      // First key wins — matches classNameToVar behavior
      if (!reverseIndex.has(cls)) {
        reverseIndex.set(cls, key);
      }
    }
  }
  return reverseIndex;
}

/**
 * Resolve a Tailwind class to its prop key.
 * Fast path: exact match in reverse index.
 * Fallback: prefix matching for arbitrary values like gap-[32px], bg-primary.
 */
function resolveClassKey(cls: string): string | undefined {
  const idx = getReverseIndex();
  const exact = idx.get(cls);
  if (exact) return exact;

  const ro = ringOutlineClassKey(cls);
  if (ro) return ro;

  const fontKey = fontUtilityStemToKey(cls);
  if (fontKey) return fontKey;

  // Prefix matching for arbitrary/dynamic values.
  //
  // Three prefixes are overloaded between a structural utility and a color
  // token. When the color form isn't in the reverse index (DaisyUI semantic
  // names, theme vars), the bare prefix loop would otherwise resolve it to
  // the structural key and shadow the real structural class in
  // `getClassForView` (left-to-right iteration returns the first match).
  // Mirror the same gates that `classNameToVar` uses in `tailwind-styles.ts`.
  for (const [prefix, key] of PREFIX_ENTRIES) {
    if (cls.startsWith(prefix)) {
      // `text-5xl` is a font size; `text-base-content` is a color.
      if (key === "fontSize" && !isTextFontSizeUtility(cls)) return "text";
      // `border-2` is width; `border-primary` is color.
      if (key === "border" && !isBorderNonColorUtility(cls)) return "borderColor";
      // `font-bold` is a weight (caught by the reverse index above);
      // anything left starting with `font-` is a family token (e.g.
      // `font-heading`, `font-body`, `font-accent` per CLAUDE.md).
      if (key === "fontWeight") return "fontFamily";
      return key;
    }
  }
  return undefined;
}

/** `text-xs` … `text-9xl` — not text *color* utilities. */
const TEXT_FONT_SIZE_STEM = /^(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/;

function isTextFontSizeUtility(base: string): boolean {
  if (!base.startsWith("text-")) return false;
  return TEXT_FONT_SIZE_STEM.test(base.slice(5));
}

/** Width-only `border*` utilities — not border *color* (toolbar `borderColor`). */
function isBorderNonColorUtility(base: string): boolean {
  if (base === "border") return true;
  if (/^border-(0|2|4|8)$/.test(base)) return true;
  if (/^border-[xytrlb]$/.test(base)) return true;
  if (/^border-[xytrlb]-(0|2|4|8)$/.test(base)) return true;
  return false;
}

/**
 * Aligns toolbar `propKey` values with `resolveClassKey` / `TailwindStyles` category names.
 * Used by getClassForView + removeClassForView so reads match writes (ColorInput, UniversalInput, etc.).
 *
 * Most propKeys map straight to a `resolveClassKey` result. The few aliased
 * pairs (the toolbar uses one name, `TailwindStyles` uses another) are listed
 * explicitly below; everything else falls through to the generic equality.
 */
const PROP_KEY_ALIAS: Record<string, string> = {
  bgColor: "background",
  textColor: "text",
  color: "text",
};

export function classPropKeyMatches(base: string, propKey: string): boolean {
  if (propKey === "placeholderColor") {
    if (base.startsWith("placeholder:")) {
      return classPropKeyMatches(base.slice("placeholder:".length), "color");
    }
    return false;
  }
  const resolved = resolveClassKey(base);
  if (resolved === undefined) return false;
  const target = PROP_KEY_ALIAS[propKey] ?? propKey;
  return resolved === target;
}

/**
 * Map a Tailwind class to its toolbar prop key.
 *
 * Thin wrapper over `resolveClassKey` that aliases text-color tokens to
 * `color` — the toolbar / `displayLabel` keying system uses `color`, while
 * `TailwindStyles` stores the same group under `text`. Shadow-bug gates
 * (`text-` / `border-` / `font-` overloads) live in `resolveClassKey`, so
 * this wrapper inherits them automatically.
 */
export function classNameToVar(name: string): string | undefined {
  const k = resolveClassKey(name);
  return k === "text" ? "color" : k;
}

/** v1 variant segments (canonical stack: responsive, then `dark`, then `hover` — matches twMerge-friendly ordering). */
export type ParsedVariantSeg = "sm" | "md" | "lg" | "xl" | "2xl" | "dark" | "hover";

const VARIANT_PREFIX_RE = /^(sm:|md:|lg:|xl:|2xl:|dark:|hover:)/;

const SEG_TO_PREFIX: Record<ParsedVariantSeg, string> = {
  sm: "sm:",
  md: "md:",
  lg: "lg:",
  xl: "xl:",
  "2xl": "2xl:",
  dark: "dark:",
  hover: "hover:",
};

const RESP_ORDER: Record<string, number> = { sm: 1, md: 2, lg: 3, xl: 4, "2xl": 5 };
const RESP_SET = new Set<string>(["sm", "md", "lg", "xl", "2xl"]);

export type ClassScopeOptions = {
  /** When true, read/write utilities under `dark:` after the breakpoint prefix and before `hover:`. */
  classDark?: boolean;
};

function segFromPrefix(pref: string): ParsedVariantSeg {
  return pref.slice(0, -1) as ParsedVariantSeg;
}

/** Strip leading `sm:` / `md:` / … / `dark:` / `hover:` segments; base is the utility stem. */
export function splitClassVariants(classToken: string): {
  segments: ParsedVariantSeg[];
  base: string;
} {
  const segments: ParsedVariantSeg[] = [];
  let rest = classToken;
  while (true) {
    const m = rest.match(VARIANT_PREFIX_RE);
    if (!m) break;
    segments.push(segFromPrefix(m[1]));
    rest = rest.slice(m[1].length);
  }
  return { segments, base: rest };
}

/** Collapse to canonical order: one max-width breakpoint, then `dark`, then `hover`. */
export function normalizeVariantSegments(segments: ParsedVariantSeg[]): ParsedVariantSeg[] {
  const resps: ParsedVariantSeg[] = [];
  let dark = false;
  let hover = false;
  for (const s of segments) {
    if (s === "dark") dark = true;
    else if (s === "hover") hover = true;
    else if (RESP_SET.has(s)) resps.push(s);
  }
  resps.sort((a, b) => RESP_ORDER[a] - RESP_ORDER[b]);
  const out: ParsedVariantSeg[] = [];
  if (resps.length) out.push(resps[resps.length - 1]);
  if (dark) out.push("dark");
  if (hover) out.push("hover");
  return out;
}

function variantChainToPrefix(chain: ParsedVariantSeg[]): string {
  return chain.map(s => SEG_TO_PREFIX[s]).join("");
}

function chainsEqual(a: ParsedVariantSeg[], b: ParsedVariantSeg[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// ─── Parse ──────────────────────────────────────────────────────────────────

/**
 * Parse a className string into structured tokens keyed by prop name.
 *
 * Classes that don't map to a known prop key go under `_unknown`.
 * Responsive-prefixed classes (md:, lg:, etc.) are stored with their
 * prefix intact under a `{prefix}:{propKey}` key.
 *
 * @example
 * parseClasses("flex flex-col gap-4 py-8 bg-primary lg:grid-cols-2")
 * // → {
 * //   display: "flex",
 * //   flex: "flex-col",
 * //   gap: "gap-4",
 * //   py: "py-8",
 * //   _unknown: "bg-primary",
 * //   "lg:gridCols": "lg:grid-cols-2",
 * // }
 */
export function parseClasses(className: string): ClassTokens {
  if (!className || !className.trim()) return {};

  const index = getReverseIndex();
  const tokens: ClassTokens = {};
  const unknowns: string[] = [];

  for (const cls of className.trim().split(/\s+/)) {
    const { segments, base } = splitClassVariants(cls);
    const norm = normalizeVariantSegments(segments);
    const prefixStr = variantChainToPrefix(norm);

    const propKey = resolveClassKey(base);
    if (propKey) {
      const tokenKey = prefixStr ? `${prefixStr}${propKey}` : propKey;
      tokens[tokenKey] = cls;
    } else {
      unknowns.push(cls);
    }
  }

  if (unknowns.length) {
    tokens._unknown = unknowns.join(" ");
  }

  return tokens;
}

// ─── Mutate ─────────────────────────────────────────────────────────────────

/**
 * Replace or add a class in a className string by prop key.
 *
 * Uses twMerge for conflict resolution — if the new class conflicts
 * with an existing one in the same Tailwind group, the old one is replaced.
 *
 * @example
 * mutateClass("flex flex-col gap-4 py-8", "gap", "gap-8")
 * // → "flex flex-col gap-8 py-8"
 *
 * mutateClass("flex flex-col", "gridCols", "grid-cols-3")
 * // → "flex flex-col grid-cols-3"
 */
export function mutateClass(className: string, _propKey: string, newValue: string): string {
  return twMerge(className, newValue);
}

// ─── Remove ─────────────────────────────────────────────────────────────────

/**
 * Remove every class token that matches `propKey` on the utility stem, at any supported variant depth
 * (`md:dark:font-bold`, `hover:text-lg`, etc.). Key matching aligns with `getClassForView` / toolbar inputs.
 *
 * @example
 * removeClass("flex flex-col gap-4 py-8", "gap")
 * // → "flex flex-col py-8"
 */
export function removeClass(className: string, propKey: string): string {
  if (!className || !className.trim()) return "";

  return className
    .trim()
    .split(/\s+/)
    .filter(cls => {
      const { base } = splitClassVariants(cls);
      return !classPropKeyMatches(base, propKey);
    })
    .join(" ");
}

// ─── Get ────────────────────────────────────────────────────────────────────

/**
 * First class token whose utility stem matches `propKey` (any supported variant prefix chain).
 * Returns the full token including variants.
 *
 * @example
 * getClass("flex flex-col gap-4 py-8", "gap")
 * // → "gap-4"
 *
 * getClass("flex flex-col gap-4 py-8", "gridCols")
 * // → undefined
 */
export function getClass(className: string, propKey: string): string | undefined {
  if (!className || !className.trim()) return undefined;

  for (const cls of className.trim().split(/\s+/)) {
    const { base } = splitClassVariants(cls);
    if (classPropKeyMatches(base, propKey)) return cls;
  }

  return undefined;
}

// ─── View-aware helpers (editor scope id → Tailwind class prefix) ──────────

/** Tailwind default min-widths — used to size the editor canvas for breakpoint previews. */
export const EDITOR_CANVAS_BREAKPOINT_PX = {
  mobile: 390,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

export type EditorCanvasBreakpointId = keyof typeof EDITOR_CANVAS_BREAKPOINT_PX;

export function isEditorCanvasBreakpointView(view: string): view is EditorCanvasBreakpointId {
  return Object.prototype.hasOwnProperty.call(EDITOR_CANVAS_BREAKPOINT_PX, view);
}

/**
 * Resolve canvas breakpoint pixel widths for the active site theme.
 * `mobile` (390) is always hardcoded — it's a preview convenience, not a Tailwind layer.
 * `sm`/`md`/`lg`/`xl`/`2xl` come from `theme.breakpoints` if set, else defaults.
 */
export function getCanvasBreakpointPx(theme?: {
  breakpoints?: Record<string, number>;
}): Record<EditorCanvasBreakpointId, number> {
  const bp = theme?.breakpoints;
  return {
    mobile: 390,
    sm: bp?.sm ?? EDITOR_CANVAS_BREAKPOINT_PX.sm,
    md: bp?.md ?? EDITOR_CANVAS_BREAKPOINT_PX.md,
    lg: bp?.lg ?? EDITOR_CANVAS_BREAKPOINT_PX.lg,
    xl: bp?.xl ?? EDITOR_CANVAS_BREAKPOINT_PX.xl,
    "2xl": bp?.["2xl"] ?? EDITOR_CANVAS_BREAKPOINT_PX["2xl"],
  };
}

/** Ordered scope IDs for toolbar “apply to layer” toggles (base + each min-width). */
export const VIEW_BREAKPOINT_SCOPE_KEYS = ["mobile", "sm", "desktop", "lg", "xl", "2xl"] as const;

export type ViewBreakpointScopeKey = (typeof VIEW_BREAKPOINT_SCOPE_KEYS)[number];

const VIEW_PREFIX_MAP: Record<string, string> = {
  mobile: "",
  sm: "sm:",
  md: "md:",
  /** Toolbar scope id for the `md:` layer (not the full-width canvas ViewAtom — that uses base via `mobile`). */
  desktop: "md:",
  tablet: "sm:",
  lg: "lg:",
  xl: "xl:",
  "2xl": "2xl:",
  hover: "hover:",
};

/** Prefix written before the utility (e.g. `md:` + `gap-4` → `md:gap-4`). */
export function getViewClassPrefix(view: string): string {
  return VIEW_PREFIX_MAP[view] ?? "";
}

/**
 * Variant chain for the active editor scope (breakpoint + optional `dark` + optional `hover`).
 * v1 order (matches twMerge-friendly stacking): `responsive → dark → hover`
 * (e.g. `md:dark:gap-4`, `dark:hover:text-white` when editing hover colors with dark scope on).
 */
export function expectedVariantChain(view: string, classDark: boolean): ParsedVariantSeg[] {
  const chain: ParsedVariantSeg[] = [];
  if (view !== "hover") {
    const p = getViewClassPrefix(view);
    if (p === "sm:") chain.push("sm");
    else if (p === "md:") chain.push("md");
    else if (p === "lg:") chain.push("lg");
    else if (p === "xl:") chain.push("xl");
    else if (p === "2xl:") chain.push("2xl");
  }
  if (classDark) chain.push("dark");
  if (view === "hover") chain.push("hover");
  return chain;
}

/** Full Tailwind variant prefix for writes (`md:dark:` + `gap-4` → `md:dark:gap-4`). */
export function buildVariantPrefix(view: string, classDark = false): string {
  return variantChainToPrefix(expectedVariantChain(view, classDark));
}

/**
 * Editor canvas (ViewAtom) → key for `getViewClassPrefix` / className writes.
 * Full-width canvas id is `desktop` but targets the **base** layer; scope id `desktop` (md row) stays `md` via {@link getViewClassPrefix}.
 */
export function editorCanvasViewToClassPrefixKey(canvasView: string | undefined | null): string {
  const v = canvasView || "desktop";
  if (v === "desktop") return "mobile";
  return v;
}

/**
 * Read a single prop value from a className string for a specific view/breakpoint.
 *
 * Returns the base class (without variant prefix chain) so the UI shows "gap-4"
 * even when stored as "md:dark:gap-4".
 *
 * @example
 * getClassForView("flex md:gap-8 gap-4", "gap", "desktop")  // → "gap-8" (toolbar md scope)
 * getClassForView("flex md:gap-8 gap-4", "gap", "md")       // → "gap-8"
 * getClassForView("flex md:gap-8 gap-4", "gap", "mobile")   // → "gap-4"
 * getClassForView("flex md:gap-8 gap-4", "display", "mobile") // → "flex"
 */
export function getClassForView(
  className: string,
  propKey: string,
  view: string,
  options?: ClassScopeOptions
): string | undefined {
  if (!className || !className.trim()) return undefined;

  const classDark = options?.classDark ?? false;
  const expected = expectedVariantChain(view, classDark);

  for (const cls of className.trim().split(/\s+/)) {
    const { segments, base } = splitClassVariants(cls);
    const norm = normalizeVariantSegments(segments);
    if (!chainsEqual(norm, expected)) continue;
    if (!classPropKeyMatches(base, propKey)) continue;
    return base;
  }

  return undefined;
}

/**
 * Remove classes matching a prop key for a specific view/breakpoint only.
 *
 * Unlike `removeClass`, this preserves classes at other breakpoints.
 *
 * @example
 * removeClassForView("gap-4 md:gap-8", "gap", "desktop")  // → "gap-4"
 * removeClassForView("gap-4 md:gap-8", "gap", "md")       // → "gap-4"
 * removeClassForView("gap-4 md:gap-8", "gap", "mobile")   // → "md:gap-8"
 */
export function removeClassForView(
  className: string,
  propKey: string,
  view: string,
  options?: ClassScopeOptions
): string {
  if (!className || !className.trim()) return "";

  const classDark = options?.classDark ?? false;
  const expected = expectedVariantChain(view, classDark);

  return className
    .trim()
    .split(/\s+/)
    .filter(cls => {
      const { segments, base } = splitClassVariants(cls);
      const norm = normalizeVariantSegments(segments);
      if (!chainsEqual(norm, expected)) return true;
      return !classPropKeyMatches(base, propKey);
    })
    .join(" ");
}
