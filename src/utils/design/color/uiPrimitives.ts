import type { CSSProperties } from "react";

/** Checkerboard behind transparent / “no color” swatches (TokenPicker, toolbar ColorInput). */
export const TRANSPARENT_CHECKER_BG: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, var(--color-base-300, #d4d4d8) 25%, transparent 25%, transparent 75%, var(--color-base-300, #d4d4d8) 75%), linear-gradient(45deg, var(--color-base-300, #d4d4d8) 25%, transparent 25%, transparent 75%, var(--color-base-300, #d4d4d8) 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 4px 4px",
};

/** True when a resolved CSS color string should show the checkerboard underlay (transparent or alpha under 1). */
export function cssColorShowsTransparency(css: string): boolean {
  const t = css.trim().toLowerCase();
  if (t === "transparent") return true;
  const rgba = t.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i);
  if (rgba && parseFloat(rgba[4]) < 1 - 1e-5) return true;
  return false;
}
