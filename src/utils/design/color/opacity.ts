/**
 * Tailwind v4 opacity-modifier parsing & formatting — pure.
 */

/**
 * Parse Tailwind v4 arbitrary opacity bracket content → alpha 0–1
 * e.g. "50%" → 0.5, "0.5" → 0.5, ".35" → 0.35
 */
export const parseArbitraryOpacityInner = (inner: string): number | null => {
  const s = inner.trim();
  if (!s) return null;
  if (s.endsWith("%")) {
    const n = parseFloat(s.slice(0, -1));
    if (Number.isNaN(n) || n < 0 || n > 100) return null;
    return n / 100;
  }
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  if (n > 1 && n <= 100) return n / 100;
  if (n >= 0 && n <= 1) return n;
  return null;
};

/**
 * Split a color utility tail into base + optional opacity (Tailwind v4).
 * e.g. "primary-content/50" → base + 0.5, "blue-500/[50%]" → base + 0.5,
 * "[var(--primary)]/[0.35]" → base + 0.35
 */
export const splitOpacitySuffix = (tail: string): { base: string; opacity?: number } => {
  if (!tail || !tail.includes("/")) {
    return { base: tail };
  }

  const arbitrary = tail.match(/^(.+)\/(\[[^\]]+\])$/);
  if (arbitrary) {
    const inner = arbitrary[2].slice(1, -1);
    const opacity = parseArbitraryOpacityInner(inner);
    if (opacity != null) {
      return { base: arbitrary[1], opacity };
    }
    return { base: tail };
  }

  const integer = tail.match(/^(.+)\/(\d{1,3})$/);
  if (integer) {
    const pct = parseInt(integer[2], 10);
    if (pct >= 0 && pct <= 100) {
      return { base: integer[1], opacity: pct / 100 };
    }
  }

  return { base: tail };
};

/**
 * Append Tailwind v4 opacity modifier (arbitrary) for storage, e.g. "/[50%]"
 */
export const formatTailwindOpacityModifier = (alpha: number): string => {
  if (alpha >= 1 - 1e-6) return "";
  if (alpha <= 0) return "/[0%]";
  const pct = Math.round(alpha * 100);
  return `/[${pct}%]`;
};
