/**
 * CanvasScopeBand — colored band over the canvas telling the user which
 * breakpoint scope their class writes will target.
 *
 *  - Base views (`mobile` / `tablet` / `desktop`) → neutral "Editing Base"
 *    band so users know writes apply to all sizes (cascade source).
 *  - `sm` / `md` / `lg` / `xl` / `2xl` → colored band with the breakpoint
 *    letter, the activation width, and an "overrides Base" hint.
 *
 * Pointer events disabled so it never eats clicks.
 */
import { useAtomValue } from "@zedux/react";
import { AppliedBreakpointsAtom, ViewAtom } from "./atoms";

const BAND_COLOR: Record<string, string> = {
  base: "#64748b",  // slate-500 — neutral, distinct from breakpoint hues
  sm: "#0ea5e9",   // sky-500
  md: "#10b981",   // emerald-500
  lg: "#8b5cf6",   // violet-500
  xl: "#ec4899",   // pink-500
  "2xl": "#f43f5e", // rose-500
};

type BpKey = "sm" | "md" | "lg" | "xl" | "2xl";
const BREAKPOINT_KEYS: readonly BpKey[] = ["sm", "md", "lg", "xl", "2xl"];

export function CanvasScopeBand() {
  const view = useAtomValue(ViewAtom);
  const applied = useAtomValue(AppliedBreakpointsAtom);

  const isBreakpoint = BREAKPOINT_KEYS.includes(view as BpKey);

  if (!isBreakpoint) {
    return (
      <div
        role="status"
        aria-label="Editing Base — applies to all sizes. Override per breakpoint with S, M, L, XL, or 2XL."
        className="canvas-scope-band pointer-events-none relative z-30 flex h-[22px] w-full flex-shrink-0 items-center justify-center gap-2 text-[10px] font-semibold tracking-[0.08em] uppercase select-none"
        style={{ backgroundColor: BAND_COLOR.base, color: "white" }}
      >
        <span>Editing Base</span>
        <span className="opacity-70">·</span>
        <span className="normal-case tracking-normal opacity-90">applies to all sizes</span>
      </div>
    );
  }

  const color = BAND_COLOR[view];
  if (!color) return null;

  const label = view === "2xl" ? "2XL" : view.toUpperCase();
  const px = applied[view as BpKey];
  const sizeText = px ? `${px}px and up` : `${view}: layer`;

  return (
    <div
      role="status"
      aria-label={`Editing ${label} breakpoint — ${sizeText}. Overrides Base from this width and up.`}
      className="canvas-scope-band pointer-events-none relative z-30 flex h-[22px] w-full flex-shrink-0 items-center justify-center gap-2 text-[10px] font-semibold tracking-[0.08em] uppercase select-none"
      style={{ backgroundColor: color, color: "white" }}
    >
      <span>Editing {label} breakpoint</span>
      <span className="opacity-70">·</span>
      <span className="font-mono normal-case tracking-normal">{sizeText}</span>
      <span className="opacity-70">·</span>
      <span className="normal-case tracking-normal opacity-90">overrides Base</span>
    </div>
  );
}
