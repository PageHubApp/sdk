/**
 * Map ring / outline utilities to toolbar prop keys (non-exact / non-reverse-index).
 * Keeps `ring-offset-*` width vs color distinct and avoids greedy `ring-` prefix issues.
 */

export function isRingOffsetWidthBase(base: string): boolean {
  if (!base.startsWith("ring-offset")) return false;
  if (/^ring-offset-(0|1|2|4|8)$/.test(base)) return true;
  if (base === "ring-offset") return true;
  if (!base.startsWith("ring-offset-")) return false;
  if (/^ring-offset-\(--/.test(base)) return false;
  if (/^ring-offset-\[/.test(base)) {
    const m = base.match(/^ring-offset-\[([^\]]+)\]/);
    const inner = m ? m[1].trim() : "";
    if (/^#|^rgb|^hsl|^hwb|^lab/i.test(inner)) return false;
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
    if (/^ring-\[/.test(cls)) return "ringWidth";
    if (/^ring-\(--/.test(cls)) return "ringColor";
    return "ringColor";
  }

  if (cls.startsWith("outline-offset")) {
    return "outlineOffset";
  }

  if (cls.startsWith("outline")) {
    if (cls === "outline" || cls === "outline-none") return "outlineWidth";
    if (/^outline-(dashed|dotted|double|hidden)$/.test(cls)) return "outlineWidth";
    if (/^outline-(0|1|2|4|8)$/.test(cls)) return "outlineWidth";
    if (/^outline-\[/.test(cls)) {
      const m = cls.match(/^outline-\[([^\]]+)\]/);
      const inner = m ? m[1].trim() : "";
      if (/^#|^rgb|^hsl|^hwb|^lab/i.test(inner)) return "outlineColor";
      if (/^currentColor$|^inherit$|^transparent$/i.test(inner)) return "outlineColor";
      return "outlineWidth";
    }
    if (/^outline-\(--/.test(cls)) return "outlineColor";
    return "outlineColor";
  }

  return undefined;
}
