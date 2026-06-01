import type { ColorType } from "./types";
import { paletteNameToShadcnVar } from "./paletteNames";
import { formatTailwindOpacityModifier } from "./opacity";

/**
 * Format a color value from the picker to storage format
 */
export const formatColorForStorage = (
  data: { type: ColorType; value: any },
  prefix: string = ""
): string => {
  if (!data || !data.value) return "";

  let val = data.value;

  if (data.type === "palette") {
    // Convert palette reference to CSS variable format
    const paletteName = data.value.replace("palette:", "");
    const varName = paletteNameToShadcnVar(paletteName);
    val = prefix ? `${prefix}-[var(--${varName})]` : `var(--${varName})`;
  } else if (data.type === "hex") {
    val = prefix ? `${prefix}-[${val}]` : val;
  } else if (data.type === "rgb") {
    // Handle RGB object from color picker — Tailwind v4: opaque rgb + /[pct%] when alpha < 1
    if (typeof val === "object" && val.r !== undefined) {
      const r = val.r;
      const g = val.g;
      const b = val.b;
      const a = val.a != null ? val.a : 1;
      if (prefix && a < 1 - 1e-6) {
        val = `${prefix}-[rgb(${r},${g},${b})]${formatTailwindOpacityModifier(a)}`;
      } else {
        val = `rgba(${r},${g},${b},${a})`;
        val = prefix ? `${prefix}-[${val}]` : val;
      }
    } else {
      val = prefix ? `${prefix}-[${val}]` : val;
    }
  } else {
    // Tailwind class
    val = prefix ? `${prefix}-${val}` : val;
  }

  return val;
};
