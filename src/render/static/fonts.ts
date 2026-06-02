const TAILWIND_FONT_WEIGHT_CLASS =
  /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/i;

/** First loadable Google family from styleGuide.*Family (not Tailwind weight tokens like `font-bold`). */
export function styleGuideGoogleFontFamily(raw: string | undefined | null): string | null {
  if (raw == null || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  if (TAILWIND_FONT_WEIGHT_CLASS.test(t)) return null;
  const first = t.split(",")[0].trim();
  const stripped = first.replace(/^['"]+|['"]+$/g, "").trim();
  if (!stripped) return null;
  const generics = new Set([
    "sans-serif",
    "serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-sans-serif",
    "ui-serif",
    "ui-monospace",
  ]);
  if (generics.has(stripped.toLowerCase())) return null;
  if (stripped.includes("var(") || stripped.startsWith("--")) return null;
  return stripped;
}

/**
 * True when cached `preview.fontUrls` should be replaced (empty, or old renderer emitted
 * Tailwind weight classes as Google `family=` — e.g. `family=font-bold:wght@...`).
 */
export function cachedPreviewGoogleTextFontUrlsLookInvalid(
  urls: string[] | undefined | null
): boolean {
  if (!Array.isArray(urls) || urls.length === 0) return true;
  for (const raw of urls) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    try {
      const u = new URL(raw.trim());
      if (u.hostname !== "fonts.googleapis.com" || !u.pathname.includes("css2")) continue;
      const fam = u.searchParams.get("family") || "";
      if (fam.includes("Material Symbols Outlined")) continue;
      const base = fam.split(":")[0].replace(/\+/g, " ").trim();
      if (TAILWIND_FONT_WEIGHT_CLASS.test(base)) return true;
    } catch {
      continue;
    }
  }
  return false;
}
