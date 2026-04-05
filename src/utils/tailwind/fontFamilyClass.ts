/**
 * Font family on nodes is stored only as Tailwind classes:
 * - Design tokens: `font-(--heading-font-family)`
 * - Google Fonts: `font-['Playfair_Display']` (spaces in name → underscores)
 */

const VARIANT_PREFIX_RE = /^(sm:|md:|lg:|xl:|2xl:|dark:|hover:)/;

/** Strip responsive/dark/hover prefixes to the bare utility stem. */
export function tailwindTokenBase(classToken: string): string {
  let rest = classToken;
  while (true) {
    const m = rest.match(VARIANT_PREFIX_RE);
    if (!m) break;
    rest = rest.slice(m[0].length);
  }
  return rest;
}

/** Build the canonical arbitrary-font utility for a Google Font family name. */
export function googleFontNameToClass(family: string): string {
  const trimmed = (family || "").trim();
  if (!trimmed) return "";
  const normalized = trimmed.replace(/\s+/g, "_");
  const escaped = normalized.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `font-['${escaped}']`;
}

/** Parse `font-['Some_Font']` → display name (underscores → spaces). */
export function parseGoogleFontFromArbitraryClass(base: string): string | null {
  if (!base.startsWith("font-[") || !base.endsWith("]")) return null;
  const inner = base.slice(6, -1).trim();
  const m = inner.match(/^(['"])([\s\S]*?)\1$/);
  if (m) {
    const raw = m[2].replace(/\\'/g, "'").replace(/\\\\/g, "\\");
    return raw.replace(/_/g, " ");
  }
  // Legacy: `font-[Outfit]` or `font-[Work_Sans]` (no quotes)
  if (/^[A-Za-z0-9_\s-]+$/.test(inner) && /[A-Za-z]/.test(inner)) {
    return inner.replace(/_/g, " ").trim();
  }
  return null;
}

/**
 * For a utility stem starting with `font-`, return `fontFamily` or `fontWeight` when unambiguous.
 * Otherwise undefined so normal prefix / index matching applies.
 */
export function fontUtilityStemToKey(base: string): string | undefined {
  if (!base.startsWith("font-")) return undefined;

  if (/^font-\(--[^)]+\)$/.test(base)) {
    return "fontFamily";
  }

  if (base.startsWith("font-[") && base.endsWith("]")) {
    const inner = base.slice(6, -1).trim();
    if (/^['"`]/.test(inner) || /^family-name\s*:/.test(inner)) {
      return "fontFamily";
    }
    if (/^\d{1,3}$/.test(inner)) {
      return "fontWeight";
    }
    if (/^[A-Za-z0-9_\s-]+$/.test(inner) && /[A-Za-z]/.test(inner)) {
      return "fontFamily";
    }
    return undefined;
  }

  return undefined;
}

/** First font-family utility token in a class string (any variant prefix). */
export function findFontFamilyClassToken(className: string): string | undefined {
  if (!className || typeof className !== "string") return undefined;
  for (const cls of className.trim().split(/\s+/)) {
    if (!cls) continue;
    const base = tailwindTokenBase(cls);
    const k = fontUtilityStemToKey(base);
    if (k === "fontFamily") return cls;
  }
  return undefined;
}
