/**
 * CanvasScopeBand — colored band over the canvas telling the user which
 * breakpoint scope their class writes will target.
 *
 *  - Multi-scope armed (`MultiScopeAtom` non-empty) → that set WINS over the
 *    canvas view, because `getEffectiveViews` routes writes to it. The band
 *    has to say so: it is a sticky editor-wide flag with no other always-on
 *    indicator, so without this branch the band reports "Base" while every
 *    write lands on `xl:` (or wherever the flag points).
 *  - Base views (`mobile` / `tablet` / `desktop`) → neutral "Editing Base"
 *    band so users know writes apply to all sizes (cascade source).
 *  - `sm` / `md` / `lg` / `xl` / `2xl` → colored band with the breakpoint
 *    letter, the activation width, and an "overrides Base" hint.
 *
 * Pointer events disabled so it never eats clicks — the multi-scope Clear
 * button re-enables them on itself only.
 */
import { useAtomState, useAtomValue } from "@zedux/react";
import { MultiScopeAtom } from "../../toolbar/breakpoint-chip/atoms";
import { AppliedBreakpointsAtom, ViewAtom } from "../state/atoms";

const BAND_COLOR: Record<string, string> = {
  base: "#64748b", // slate-500 — neutral, distinct from breakpoint hues
  sm: "#0ea5e9", // sky-500
  md: "#10b981", // emerald-500
  lg: "#8b5cf6", // violet-500
  xl: "#ec4899", // pink-500
  "2xl": "#f43f5e", // rose-500
  /** Multi-scope spanning >1 breakpoint — amber, distinct from every bp hue. */
  multi: "#f59e0b", // amber-500
};

type BpKey = "sm" | "md" | "lg" | "xl" | "2xl";
const BREAKPOINT_KEYS: readonly BpKey[] = ["sm", "md", "lg", "xl", "2xl"];

export function CanvasScopeBand() {
  const view = useAtomValue(ViewAtom);
  const applied = useAtomValue(AppliedBreakpointsAtom);
  const [multiScope, setMultiScope] = useAtomState(MultiScopeAtom);

  const isBreakpoint = BREAKPOINT_KEYS.includes(view as BpKey);

  // Multi-scope wins over the canvas view in `getEffectiveViews`, so it wins here.
  if (multiScope.size > 0) {
    const targets = BREAKPOINT_KEYS.filter(bp => multiScope.has(bp));
    const labels = targets.map(bp => (bp === "2xl" ? "2XL" : bp.toUpperCase()));
    const color = targets.length === 1 ? BAND_COLOR[targets[0]] : BAND_COLOR.multi;
    const summary = labels.join(" + ");

    return (
      <div
        role="status"
        aria-label={`Multi-scope editing — writes target ${summary}, not the canvas view. Overrides Base at those widths.`}
        className="canvas-scope-band pointer-events-none relative z-30 flex h-[22px] w-full flex-shrink-0 items-center justify-center gap-2 text-[10px] font-semibold tracking-[0.08em] uppercase select-none"
        style={{ backgroundColor: color, color: "white" }}
      >
        <span>Editing {summary}</span>
        <span className="opacity-70">·</span>
        <span className="font-mono tracking-normal normal-case">
          multi-scope — ignores canvas view
        </span>
        <button
          type="button"
          onClick={() => setMultiScope(new Set())}
          className="pointer-events-auto ml-1 rounded bg-white/20 px-1.5 py-0.5 text-[9px] tracking-normal normal-case transition-colors hover:bg-white/30"
        >
          Clear
        </button>
      </div>
    );
  }

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
        <span className="tracking-normal normal-case opacity-90">applies to all sizes</span>
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
      <span className="font-mono tracking-normal normal-case">{sizeText}</span>
      <span className="opacity-70">·</span>
      <span className="tracking-normal normal-case opacity-90">overrides Base</span>
    </div>
  );
}
