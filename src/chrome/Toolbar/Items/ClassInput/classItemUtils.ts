/**
 * Pure utility functions and constants for the class name input.
 */

import {
  normalizeVariantSegments,
  splitClassVariants,
  VIEW_BREAKPOINT_SCOPE_KEYS,
} from "../../../../utils/tailwind/className";
import { classNameToVar, isValidTailwindClass } from "utils/tailwind";

// ─── Helpers ───

export const isMappedOrValidTailwind = (classValue: string) =>
  Boolean(classNameToVar(classValue)) || isValidTailwindClass(classValue);

const V1_VARIANT_SEGS = new Set(["sm", "md", "lg", "xl", "2xl", "dark", "hover"]);

/** Token uses only v1 variants and a single utility stem without extra `:`. */
export const isBreakpointUtilityToken = (cls: string) => {
  if (!cls || typeof cls !== "string") return false;
  const { segments, base } = splitClassVariants(cls);
  for (const s of segments) {
    if (!V1_VARIANT_SEGS.has(s)) return false;
  }
  return !base.includes(":");
};

// ─── Breakpoint bucket logic ───

export function breakpointBucketForClassToken(
  cls: string
): "mobile" | "sm" | "desktop" | "lg" | "xl" | "2xl" | "other" {
  const { segments } = splitClassVariants(cls);
  const norm = normalizeVariantSegments(segments);
  if (norm.includes("hover")) return "other";
  const r = norm.find(s => s === "sm" || s === "md" || s === "lg" || s === "xl" || s === "2xl");
  if (r === "sm") return "sm";
  if (r === "md") return "desktop";
  if (r === "lg") return "lg";
  if (r === "xl") return "xl";
  if (r === "2xl") return "2xl";
  return "mobile";
}

export function parseClassNameIntoBreakpointBuckets(classNameStr: string, excludeList: string[]) {
  const buckets: Record<string, string[]> = {
    mobile: [], sm: [], desktop: [], lg: [], xl: [], "2xl": [], other: [],
  };

  const tokens = (classNameStr || "").split(/\s+/).filter(Boolean);
  for (const cls of tokens) {
    if (excludeList?.includes(cls)) continue;
    const bucket = breakpointBucketForClassToken(cls);
    buckets[bucket].push(cls);
  }

  return buckets;
}

// ─── View scope helpers ───


/** Single Tailwind layer for unprefixed class writes. */
export function canvasViewToClassScopeKey(canvasView: string | undefined): string {
  const v = canvasView || "desktop";
  if (v === "mobile") return "mobile";
  if (v === "sm" || v === "tablet") return "sm";
  if (v === "desktop") return "mobile";
  if (v === "md") return "desktop";
  if (v === "lg") return "lg";
  if (v === "xl") return "xl";
  if (v === "2xl") return "2xl";
  return "mobile";
}

// ─── Constants ───

export const APPLY_SCOPE_DISPLAY: Record<string, string> = {
  mobile: "base", sm: "sm", md: "md", desktop: "md", lg: "lg", xl: "xl", "2xl": "2xl",
};

/** Full-width scope row: selected matches sidebar section headers (border + bg). */
export const BP_SCOPE_ROW_SELECTED =
  "border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm";
export const BP_SCOPE_ROW_IDLE =
  "border border-transparent text-neutral-content hover:border-sidebar-border hover:bg-sidebar-accent/80";

const BP_DROP_VALID = "border-2 border-dashed border-base-content/35 bg-base-content/10";

export const CLASS_BREAKPOINT_BUCKETS = [
  {
    id: "mobile", label: "Base", hint: "default", icon: "mobile" as const,
    dropValid: BP_DROP_VALID,
    dropInvalid: "border-2 border-dashed border-error bg-error/10",
    borderIdle: "border-base-300",
  },
  {
    id: "sm", label: "SM", hint: "640px+", icon: "badge" as const,
    dropValid: BP_DROP_VALID,
    dropInvalid: "border-2 border-dashed border-error bg-error/10",
    borderIdle: "border-base-300",
  },
  {
    id: "desktop", label: "MD", hint: "768px+", icon: "desktop" as const,
    dropValid: BP_DROP_VALID,
    dropInvalid: "border-2 border-dashed border-error bg-error/10",
    borderIdle: "border-base-300",
  },
  {
    id: "lg", label: "LG", hint: "1024px+", icon: "badge" as const,
    dropValid: BP_DROP_VALID,
    dropInvalid: "border-2 border-dashed border-error bg-error/10",
    borderIdle: "border-base-300",
  },
  {
    id: "xl", label: "XL", hint: "1280px+", icon: "badge" as const,
    dropValid: BP_DROP_VALID,
    dropInvalid: "border-2 border-dashed border-error bg-error/10",
    borderIdle: "border-base-300",
  },
  {
    id: "2xl", label: "2XL", hint: "1536px+", icon: "badge" as const,
    dropValid: BP_DROP_VALID,
    dropInvalid: "border-2 border-dashed border-error bg-error/10",
    borderIdle: "border-base-300",
  },
];

const NEUTRAL_CLASS_CARD = "bg-base-200 text-base-content border border-base-300/60";

export const CARD_BG_BY_BUCKET: Record<string, string> = {
  mobile: NEUTRAL_CLASS_CARD,
  sm: NEUTRAL_CLASS_CARD,
  desktop: NEUTRAL_CLASS_CARD,
  lg: NEUTRAL_CLASS_CARD,
  xl: NEUTRAL_CLASS_CARD,
  "2xl": NEUTRAL_CLASS_CARD,
};

export const CONFLICT_GROUPS: Record<string, string[]> = {
  flex: ["flex-row", "flex-row-reverse", "flex-col", "flex-col-reverse"],
  justify: ["justify-start", "justify-end", "justify-center", "justify-between", "justify-around", "justify-evenly"],
  items: ["items-start", "items-end", "items-center", "items-baseline", "items-stretch"],
  text: ["text-left", "text-center", "text-right", "text-justify"],
  float: ["float-left", "float-right", "float-none"],
  clear: ["clear-left", "clear-right", "clear-both", "clear-none"],
  display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
  position: ["static", "fixed", "absolute", "relative", "sticky"],
  overflow: ["overflow-auto", "overflow-hidden", "overflow-clip", "overflow-visible", "overflow-scroll"],
  whitespace: ["whitespace-normal", "whitespace-nowrap", "whitespace-pre", "whitespace-pre-line", "whitespace-pre-wrap", "whitespace-break-spaces"],
};

export const BREAKPOINT_PREFIXES = ["sm:", "md:", "lg:", "xl:", "2xl:"];
