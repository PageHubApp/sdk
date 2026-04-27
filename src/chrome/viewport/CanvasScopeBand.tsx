/**
 * CanvasScopeBand — Plasmic-style colored band over the canvas reminding the
 * user "you are NOT at base, your edits write `<bp>:` classes".
 *
 * Quiet states:
 *  - `mobile`  → no band (mobile IS base, writes go straight to base)
 *  - `desktop` → no band (fluid full-width writes to base too)
 *  - `tablet`  → no band (legacy alias)
 *
 * All other canvas widths render a thin colored bar above the viewport with
 * the bp letter. Pointer events disabled so it never eats clicks.
 */
import { useAtomValue } from "@zedux/react";
import { ViewAtom } from "./atoms";

const BAND_COLOR: Record<string, string> = {
  mobile: "transparent",
  sm: "#0ea5e9",   // sky-500
  md: "#10b981",   // emerald-500
  lg: "#8b5cf6",   // violet-500
  xl: "#ec4899",   // pink-500
  "2xl": "#f43f5e", // rose-500
};

export function CanvasScopeBand() {
  const view = useAtomValue(ViewAtom);

  // Quiet states — nothing to surface.
  if (view === "desktop" || view === "tablet" || view === "mobile") return null;

  const color = BAND_COLOR[view];
  if (!color || color === "transparent") return null;

  const label =
    view === "2xl" ? "2XL" : view.toUpperCase();

  return (
    <div
      role="status"
      aria-label={`Editing ${label} layer — class writes target ${view}: prefix`}
      className="canvas-scope-band pointer-events-none absolute top-0 right-0 left-0 z-30 flex h-[22px] items-center justify-center text-[10px] font-semibold tracking-[0.08em] uppercase select-none"
      style={{ backgroundColor: color, color: "white" }}
    >
      Editing {label} · classes write as {view}:
    </div>
  );
}
