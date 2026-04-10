/**
 * Map ring / outline utilities to toolbar prop keys (non-exact / non-reverse-index).
 * Keeps `ring-offset-*` width vs color distinct and avoids greedy `ring-` prefix issues.
 */

/** Arbitrary `-[…]` / `(--*)` tails that are colors (ColorInput / palette), not lengths. */
function bracketInnerLooksLikeColor(inner: string): boolean {
  const s = inner.trim();
  if (/^#|^rgb|^hsl|^hwb|^lab/i.test(s)) return true;
  if (/^var\(/i.test(s)) return true;
  if (/^currentColor$|^inherit$|^transparent$/i.test(s)) return true;
  return false;
}

export function isRingOffsetWidthBase(base: string): boolean {
  if (!base.startsWith("ring-offset")) return false;
  if (/^ring-offset-(0|1|2|4|8)$/.test(base)) return true;
  if (base === "ring-offset") return true;
  if (!base.startsWith("ring-offset-")) return false;
  if (/^ring-offset-\(--/.test(base)) return false;
  if (/^ring-offset-\[/.test(base)) {
    const m = base.match(/^ring-offset-\[([^\]]+)\]/);
    const inner = m ? m[1].trim() : "";
    if (bracketInnerLooksLikeColor(inner)) return false;
    return true;
  }
  return false;
}

/**
 * @returns prop key or `undefined` if this is not a ring/outline utility.
 */
export function ringOutlineClassKey(cls: string): string | undefined {
  if (cls.startsWith("ring-offset")) {
    return isRingOffsetWidthBase(cls) ? "ringOffsetWidth" : "ringOffsetColor";
  }

  if (cls.startsWith("ring")) {
    if (cls === "ring" || cls === "ring-inset") return "ringWidth";
    if (/^ring-(0|1|2|4|8)$/.test(cls)) return "ringWidth";
    if (/^ring-\[/.test(cls)) {
      const m = cls.match(/^ring-\[([^\]]+)\]/);
      const inner = m ? m[1].trim() : "";
      return bracketInnerLooksLikeColor(inner) ? "ringColor" : "ringWidth";
    }
    if (/^ring-\(--/.test(cls)) return "ringColor";
    return "ringColor";
  }

  if (cls.startsWith("outline-offset")) {
    return "outlineOffset";
  }

  if (cls.startsWith("outline")) {
    const outlineStyleClasses = new Set([
      "outline-none",
      "outline",
      "outline-dashed",
      "outline-dotted",
      "outline-double",
    ]);
    if (outlineStyleClasses.has(cls)) return "outlineStyle";
    if (cls === "outline-hidden") return "outlineWidth";
    if (/^outline-(0|1|2|4|8)$/.test(cls)) return "outlineWidth";
    if (/^outline-\[/.test(cls)) {
      const m = cls.match(/^outline-\[([^\]]+)\]/);
      const inner = m ? m[1].trim() : "";
      if (bracketInnerLooksLikeColor(inner)) return "outlineColor";
      return "outlineWidth";
    }
    if (/^outline-\(--/.test(cls)) return "outlineColor";
    return "outlineColor";
  }

  return undefined;
}
