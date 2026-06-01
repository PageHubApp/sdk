import { oklchToHex } from "../contentColor";

/**
 * Convert hex to RGBA string
 */
export const hexToRGBA = (hex: string, alpha: number = 1): string => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * Apply opacity multiplier to a resolved CSS color string (hex, rgb/rgba, oklch).
 */
export const applyOpacityToCssColor = (resolved: string, opacityMod: number): string => {
  const t = resolved.trim();
  if (opacityMod >= 1 - 1e-6) return t;
  if (t === "transparent") return "rgba(0,0,0,0)";

  if (t.startsWith("#")) {
    const hex7 = t.slice(0, 7);
    if (/^#[0-9A-Fa-f]{6}$/i.test(hex7)) {
      return hexToRGBA(hex7, opacityMod);
    }
    const raw = t.replace("#", "");
    if (raw.length === 3) {
      const exp = raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2];
      return hexToRGBA(`#${exp}`, opacityMod);
    }
    if (raw.length === 8 && /^[0-9A-Fa-f]{8}$/i.test(raw)) {
      const existing = parseInt(raw.slice(6, 8), 16) / 255;
      return hexToRGBA(`#${raw.slice(0, 6)}`, existing * opacityMod);
    }
    return t;
  }

  const rgbaM = t.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i
  );
  if (rgbaM) {
    const r = Math.round(parseFloat(rgbaM[1]));
    const g = Math.round(parseFloat(rgbaM[2]));
    const b = Math.round(parseFloat(rgbaM[3]));
    const a = rgbaM[4] != null ? parseFloat(rgbaM[4]) : 1;
    return `rgba(${r},${g},${b},${a * opacityMod})`;
  }

  if (t.startsWith("oklch(")) {
    try {
      return hexToRGBA(oklchToHex(t), opacityMod);
    } catch {
      return t;
    }
  }

  return t;
};
