/**
 * Google Fonts Integration
 *
 * Fetches and manages the full Google Fonts library (~1500 fonts)
 * with lazy loading and smart caching
 */

export interface GoogleFont {
  family: string;
  variants: string[];
  subsets: string[];
  category: "sans-serif" | "serif" | "display" | "handwriting" | "monospace";
  kind?: string;
  version?: string;
}

export interface GoogleFontsResponse {
  kind: string;
  items: GoogleFont[];
}

import {
  CURATED_GOOGLE_FONT_FAMILIES,
  DEFAULT_CURATED_GOOGLE_FONT_FAMILIES,
  type CuratedGoogleFontFamilies,
} from "./curatedGoogleFontFamilies";

export {
  CURATED_GOOGLE_FONT_FAMILIES,
  DEFAULT_CURATED_GOOGLE_FONT_FAMILIES,
  type CuratedGoogleFontFamilies,
};

// Cache for Google Fonts API response
let fontsCache: GoogleFont[] | null = null;
let fetchPromise: Promise<GoogleFont[]> | null = null;

function wipeFontsRequestCache(): void {
  fontsCache = null;
  fetchPromise = null;
}

/** Host override; `null` uses {@link DEFAULT_CURATED_GOOGLE_FONT_FAMILIES}. */
let curatedFamiliesOverride: CuratedGoogleFontFamilies | null = null;

function getActiveCuratedFamilies(): CuratedGoogleFontFamilies {
  return curatedFamiliesOverride ?? DEFAULT_CURATED_GOOGLE_FONT_FAMILIES;
}

/** Active popular / funky / extended lists (override or default). */
export function getCuratedGoogleFontFamilies(): Readonly<CuratedGoogleFontFamilies> {
  return getActiveCuratedFamilies();
}

/**
 * Imperative override for curated font buckets (picker order, funky rail, API-less fallback).
 * Prefer `PageHubConfig.curatedGoogleFontFamilies` when using `PageHubProvider` / `PageHub.init`.
 * Clears the in-memory Google Fonts cache so the next `extended` union applies on the next fetch.
 */
export function setCuratedGoogleFontFamilies(next: CuratedGoogleFontFamilies): void {
  curatedFamiliesOverride = next;
  wipeFontsRequestCache();
}

/** Restore stock {@link DEFAULT_CURATED_GOOGLE_FONT_FAMILIES} and clear the font cache. */
export function resetCuratedGoogleFontFamilies(): void {
  curatedFamiliesOverride = null;
  wipeFontsRequestCache();
}

function curatedFamilyNamesUnique(): string[] {
  const { popular, funky, extended } = getActiveCuratedFamilies();
  return [...new Set([...popular, ...funky, ...extended])];
}

/**
 * Fetch all Google Fonts from the API
 * Uses caching to avoid repeated requests
 *
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/apis/credentials
 * 2. Create a new API key or use existing
 * 3. Enable "Google Fonts Developer API" in your project
 * 4. Add to .env.local: NEXT_PUBLIC_GOOGLE_FONTS_API_KEY=your_key_here
 */
export const fetchGoogleFonts = async (apiKey?: string): Promise<GoogleFont[]> => {
  // Return cached fonts if available
  if (fontsCache) {
    return fontsCache;
  }

  // Return in-flight request if one exists
  if (fetchPromise) {
    return fetchPromise;
  }

  // Create new fetch promise
  fetchPromise = (async () => {
    try {
      const fromVite = (() => {
        try {
          return (import.meta as any).env?.VITE_GOOGLE_FONTS_API_KEY;
        } catch {
          return undefined;
        }
      })();
      const fromNext =
        typeof process !== "undefined" ? process.env.NEXT_PUBLIC_GOOGLE_FONTS_API_KEY : undefined;
      const key = apiKey || fromVite || fromNext;

      if (!key) {
        console.warn(
          "No Google Fonts API key found. Using fallback font list.\n" +
            "For the full Google Fonts catalog, set NEXT_PUBLIC_GOOGLE_FONTS_API_KEY (Next.js) or VITE_GOOGLE_FONTS_API_KEY (Vite).\n" +
            "Get a key at: https://console.cloud.google.com/apis/credentials"
        );
        return getFallbackFonts();
      }

      // Google Fonts API endpoint
      const url = `https://www.googleapis.com/webfonts/v1/webfonts?key=${key}&sort=popularity`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("Failed to fetch Google Fonts from API:", errorData);
        console.warn("Using fallback font list");
        return getFallbackFonts();
      }

      const data: GoogleFontsResponse = await response.json();
      fontsCache = data.items;

      return fontsCache;
    } catch (error) {
      console.error("Error fetching Google Fonts:", error);
      return getFallbackFonts();
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
};

/**
 * Get a comprehensive fallback font list if API fails or no API key
 * Includes 200+ popular and useful Google Fonts
 */
const getFallbackFonts = (): GoogleFont[] => {
  const allFonts = curatedFamilyNamesUnique();

  return allFonts.map(family => ({
    family,
    variants: ["regular", "700"],
    subsets: ["latin"],
    category: "sans-serif" as const,
  }));
};

/**
 * Get organized font categories
 */
export const getOrganizedFonts = async (apiKey?: string) => {
  const allFonts = await fetchGoogleFonts(apiKey);
  const curated = getActiveCuratedFamilies();
  const popularSet = new Set<string>(curated.popular);
  const funkySet = new Set<string>(curated.funky);

  // Sort fonts into categories
  const popular = allFonts.filter(f => popularSet.has(f.family));
  const funky = allFonts.filter(f => funkySet.has(f.family));
  const serif = allFonts.filter(
    f => f.category === "serif" && !popular.includes(f) && !funky.includes(f)
  );
  const sansSerif = allFonts.filter(
    f => f.category === "sans-serif" && !popular.includes(f) && !funky.includes(f)
  );
  const display = allFonts.filter(f => f.category === "display" && !funky.includes(f));
  const handwriting = allFonts.filter(f => f.category === "handwriting");
  const monospace = allFonts.filter(f => f.category === "monospace");

  return {
    popular,
    funky,
    serif,
    sansSerif,
    display,
    handwriting,
    monospace,
    all: allFonts,
  };
};

/**
 * Search fonts by name
 */
export const searchFonts = async (query: string, apiKey?: string): Promise<GoogleFont[]> => {
  const allFonts = await fetchGoogleFonts(apiKey);
  const lowerQuery = query.toLowerCase();

  // Exact matches first
  const exactMatches = allFonts.filter(f => f.family.toLowerCase() === lowerQuery);

  // Starts with query
  const startsWith = allFonts.filter(
    f => f.family.toLowerCase().startsWith(lowerQuery) && !exactMatches.includes(f)
  );

  // Contains query
  const contains = allFonts.filter(
    f =>
      f.family.toLowerCase().includes(lowerQuery) &&
      !exactMatches.includes(f) &&
      !startsWith.includes(f)
  );

  return [...exactMatches, ...startsWith, ...contains].slice(0, 50); // Limit to 50 results
};

/**
 * Load a Google Font dynamically
 * Only loads when actually needed
 */
export const loadGoogleFont = (
  family: string,
  weights: string[] = ["400", "700"],
  display: "swap" | "block" | "fallback" | "optional" = "swap"
): void => {
  if (typeof window === "undefined") return;

  const normalizedFamily = family.replace(/ +/g, "+");
  const weightStr = weights.join(";");

  const href = `https://fonts.googleapis.com/css2?family=${normalizedFamily}:wght@${weightStr}&display=${display}`;

  // Check if already loaded
  const existingLinks = Array.from(
    document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]')
  );

  if (existingLinks.some(link => (link as HTMLLinkElement).href === href)) {
    return;
  }

  // Create and append link element
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.media = "all";

  document.head.appendChild(link);
};

/**
 * Preload multiple fonts efficiently
 * Batches requests to reduce overhead
 */
export const preloadFonts = (
  fonts: Array<{ family: string; weights?: string[] }>,
  display: "swap" | "block" | "fallback" | "optional" = "swap"
): void => {
  if (typeof window === "undefined" || fonts.length === 0) return;

  // Build combined URL for all fonts
  const familyParams = fonts
    .map(font => {
      const normalizedFamily = font.family.replace(/ +/g, "+");
      const weights = font.weights || ["400", "700"];
      return `family=${normalizedFamily}:wght@${weights.join(";")}`;
    })
    .join("&");

  const href = `https://fonts.googleapis.com/css2?${familyParams}&display=${display}`;

  // Check if already loaded
  const existingLinks = Array.from(
    document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]')
  );

  if (existingLinks.some(link => (link as HTMLLinkElement).href.includes(familyParams))) {
    return;
  }

  // Preload pattern for better performance
  const preloadLink = document.createElement("link");
  preloadLink.rel = "preload";
  preloadLink.as = "style";
  preloadLink.href = href;

  // Convert to stylesheet after loading
  preloadLink.onload = function () {
    (this as HTMLLinkElement).onload = null;
    (this as HTMLLinkElement).rel = "stylesheet";
    (this as HTMLLinkElement).media = "all";
  };

  document.head.appendChild(preloadLink);
};

/**
 * Clear the font cache (useful for refreshing)
 */
export const clearFontCache = () => {
  wipeFontsRequestCache();
};

/**
 * Get font families as simple string array (for backward compatibility)
 */
export const getFontFamilies = async (apiKey?: string): Promise<string[]> => {
  const fonts = await fetchGoogleFonts(apiKey);
  return fonts.map(f => f.family);
};

/**
 * Get popular fonts as simple array
 */
export const getPopularFonts = (): string[] => {
  return [...getActiveCuratedFamilies().popular];
};

/**
 * Get funky/display fonts as simple array
 */
export const getFunkyFonts = (): string[] => {
  return [...getActiveCuratedFamilies().funky];
};
