/**
 * Google Font collection, batched loading, and className-based preloading
 */

import { resolveCSSVariable } from "./design/colorSystem";
import {
  findFontFamilyClassToken,
  parseGoogleFontFromArbitraryClass,
  tailwindTokenBase,
} from "./tailwind/fontFamilyClass";

// ─── Font collection (batched loading) ───

const fontCollection = new Map<string, Set<string>>();
let isLoadingFonts = false;
let fontFlushMicrotaskQueued = false;

export const collectFont = (fontFamily: string, fontWeight: string) => {
  if (!fontFamily || fontFamily.startsWith("style:")) return;
  if (fontFamily.includes("var(") || fontFamily.includes("--")) return;

  if (!fontCollection.has(fontFamily)) {
    fontCollection.set(fontFamily, new Set());
  }
  fontCollection.get(fontFamily)!.add(fontWeight);
};

export const generateCombinedFontURL = () => {
  if (fontCollection.size === 0) return null;

  const fontParams = Array.from(fontCollection.entries())
    .map(([fontFamily, weights]) => {
      const weightStr = Array.from(weights).join(";");
      return `family=${encodeURIComponent(fontFamily)}:wght@${weightStr}`;
    })
    .join("&");

  return `https://fonts.googleapis.com/css2?${fontParams}&display=swap`;
};

export const clearFontCollection = () => {
  fontCollection.clear();
};

function finishFontBatch(totalFonts: number, loadedCountRef: { n: number }) {
  loadedCountRef.n++;
  if (loadedCountRef.n >= totalFonts) {
    isLoadingFonts = false;
    if (fontCollection.size > 0) {
      loadCombinedFonts();
    }
  }
}

/**
 * After `collectFont` calls, schedules a single microtask flush so one render
 * pass batches families. If a network batch is already in flight, new collects
 * stay in the map and flush again when that batch completes.
 */
export const loadCombinedFonts = () => {
  if (typeof window === "undefined") return;
  if (fontFlushMicrotaskQueued) return;
  fontFlushMicrotaskQueued = true;
  queueMicrotask(() => {
    fontFlushMicrotaskQueued = false;
    runLoadCombinedFontsFlush();
  });
};

function runLoadCombinedFontsFlush() {
  if (isLoadingFonts || fontCollection.size === 0) return;

  isLoadingFonts = true;
  const entries = Array.from(fontCollection.entries());
  clearFontCollection();

  const totalFonts = entries.length;
  const loadedCountRef = { n: 0 };
  const onOneDone = () => finishFontBatch(totalFonts, loadedCountRef);

  entries.forEach(([fontFamily, weights]) => {
    const weightStr = Array.from(weights).join(";");
    const encodedFamily = encodeURIComponent(fontFamily);
    const fontURL = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weightStr}&display=swap`;
    const fallbackURL = `https://fonts.googleapis.com/css2?family=${encodedFamily}&display=swap`;

    const existingLink = document.querySelector(
      `link[href="${fontURL}"], link[href="${fallbackURL}"]`
    );
    if (existingLink) {
      onOneDone();
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fontURL;

    link.onload = onOneDone;
    link.onerror = () => {
      const fallbackLink = document.createElement("link");
      fallbackLink.rel = "stylesheet";
      fallbackLink.href = fallbackURL;
      fallbackLink.onload = onOneDone;
      fallbackLink.onerror = onOneDone;
      document.head.appendChild(fallbackLink);
    };

    document.head.appendChild(link);
  });
}

// ─── className-based font preloading ───

const FONT_WEIGHT_CLASS_TO_NUM: Record<string, string> = {
  "font-thin": "100",
  "font-extralight": "200",
  "font-light": "300",
  "font-normal": "400",
  "font-medium": "500",
  "font-semibold": "600",
  "font-bold": "700",
  "font-extrabold": "800",
  "font-black": "900",
};

function flattenNodeClassName(props: { className?: unknown }): string {
  const c = props?.className;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.filter(Boolean).join(" ");
  return "";
}

/** Editor: preload Google fonts from `className` (`font-(--*)` or `font-['Name']` + weight utilities). */
export const getFontFromComp = (props: { className?: unknown }) => {
  const cn = flattenNodeClassName(props);
  if (!cn.trim()) return;

  const token = findFontFamilyClassToken(cn);
  if (!token) return;

  const base = tailwindTokenBase(token);
  let fontName: string | null = null;

  if (/^font-\(--/.test(base)) {
    const resolved = resolveCSSVariable(base, null);
    if (resolved && typeof resolved === "string" && !resolved.includes("var(")) {
      fontName = resolved
        .split(",")[0]
        .trim()
        .replace(/^['"]|['"]$/g, "");
    }
  } else {
    fontName = parseGoogleFontFromArbitraryClass(base);
  }

  if (!fontName) return;

  const numericWeights = new Set<string>();
  for (const part of cn.split(/\s+/)) {
    const b = tailwindTokenBase(part);
    const n = FONT_WEIGHT_CLASS_TO_NUM[b];
    if (n) numericWeights.add(n);
  }

  if (numericWeights.size === 0) numericWeights.add("400");
  numericWeights.forEach(w => collectFont(fontName!, w));
};
