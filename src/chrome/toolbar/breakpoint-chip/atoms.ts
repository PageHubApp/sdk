import { atom } from "@zedux/react";
import { BP_KEYS, type BpKey } from "../../../utils/breakpointRewrite";

/**
 * Power-user multi-scope writes. When non-empty, class writes target every
 * breakpoint in this set (Alt-click cells in the chip popover toggles entries).
 * Empty by default → falls back to canvas-derived single-scope (the rule
 * "scope = canvas view" is the silent default).
 */
export const MultiScopeAtom = atom<Set<BpKey>>(
  "chip-multi-scope",
  () => new Set<BpKey>()
);

/** Anchor for the currently-open chip popover. Null = nothing open. */
export type ChipPopoverState = {
  nodeId: string;
  propKey: string;
  propType: string;
  index?: any;
  propItemKey?: string | null;
  /** When set: pulse the cell for that bp inside the popover (Show source command). */
  pulseBp?: BpKey | "mobile" | null;
} | null;

export const ChipPopoverAtom = atom<ChipPopoverState>(
  "chip-popover",
  null as ChipPopoverState
);

/** Local helper: ordered breakpoint list including base, used by the chip + popover. */
export const CHIP_BP_ORDER = ["mobile", ...BP_KEYS] as const;
export type ChipBp = (typeof CHIP_BP_ORDER)[number];

/** Single-letter identifier rendered next to the dot (matches Webflow style). */
export const CHIP_BP_LETTER: Record<ChipBp, string> = {
  mobile: "b",
  sm: "s",
  md: "m",
  lg: "l",
  xl: "x",
  "2xl": "2",
};

/** Display label inside cells / tooltip. */
export const CHIP_BP_LABEL: Record<ChipBp, string> = {
  mobile: "base",
  sm: "sm",
  md: "md",
  lg: "lg",
  xl: "xl",
  "2xl": "2xl",
};

/**
 * Map editor canvas `ViewAtom` value (which includes 'desktop' fluid + 'tablet'
 * legacy) to the chip's BP scope. Mirrors ViewportShell's canvas->scope table
 * (see Phase 2 plan) so the chip's "active bp" lights up correctly.
 *
 * `desktop` (fluid full-width) → null (writes go to base/mobile, no chip flash).
 */
export function canvasViewToChipBp(view: string | undefined | null): ChipBp | null {
  if (!view) return "mobile";
  if (view === "mobile") return "mobile";
  if (view === "sm") return "sm";
  if (view === "md") return "md";
  if (view === "lg") return "lg";
  if (view === "xl") return "xl";
  if (view === "2xl") return "2xl";
  // 'desktop' fluid + 'tablet' legacy → no active bp highlight.
  return null;
}
