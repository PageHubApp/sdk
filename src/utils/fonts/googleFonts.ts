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

// Popular fonts to show first (top 50 most used)
const popularFonts = [
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Raleway",
  "PT Sans",
  "Merriweather",
  "Poppins",
  "Nunito",
  "Roboto Condensed",
  "Ubuntu",
  "Playfair Display",
  "Mukta",
  "Noto Sans",
  "Rubik",
  "Work Sans",
  "Inter",
  "Fira Sans",
  "Source Sans Pro",
  "Noto Serif",
  "Quicksand",
  "Karla",
  "Titillium Web",
  "Libre Baskerville",
  "Bitter",
  "Hind",
  "Cabin",
  "Dosis",
  "Crimson Text",
  "Inconsolata",
  "Oxygen",
  "Droid Sans",
  "Libre Franklin",
  "Josefin Sans",
  "Barlow",
  "EB Garamond",
  "PT Serif",
  "Abel",
  "Arimo",
  "Heebo",
  "DM Sans",
  "Mulish",
  "Manrope",
  "Nanum Gothic",
  "Archivo",
  "Exo 2",
  "Lora",
  "IBM Plex Sans",
  "Comfortaa",
];

// Fun/Display fonts to feature
const funkyFonts = [
  "Pacifico",
  "Lobster",
  "Righteous",
  "Permanent Marker",
  "Bebas Neue",
  "Abril Fatface",
  "Fredoka One",
  "Staatliches",
  "Russo One",
  "Orbitron",
  "Press Start 2P",
  "Indie Flower",
  "Architects Daughter",
  "Shadows Into Light",
  "Caveat",
  "Dancing Script",
  "Great Vibes",
  "Satisfy",
  "Tangerine",
  "Kaushan Script",
];

// Cache for Google Fonts API response
let fontsCache: GoogleFont[] | null = null;
let fetchPromise: Promise<GoogleFont[]> | null = null;

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
      const fromVite = (() => { try { return (import.meta as any).env?.VITE_GOOGLE_FONTS_API_KEY; } catch { return undefined; } })();
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
  // Additional comprehensive font list (serif, sans-serif, display, etc.)
  const additionalFonts = [
    // Serif fonts
    "Crimson Pro",
    "Libre Baskerville",
    "Playfair Display",
    "Merriweather",
    "Lora",
    "PT Serif",
    "Vollkorn",
    "Cormorant",
    "Spectral",
    "Cardo",
    "Alegreya",
    "Noto Serif",
    "Source Serif Pro",
    "Tinos",
    "Gelasio",
    "Domine",
    "Arvo",
    "Bitter",
    "Neuton",
    "Old Standard TT",
    "Crimson Text",
    "Gentium Book Basic",
    "Coustard",
    "Alice",
    "Amiri",
    // Important: Goudy Bookletter 1911
    "Goudy Bookletter 1911",

    // Sans-serif fonts
    "Inter",
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Poppins",
    "Nunito",
    "Raleway",
    "Ubuntu",
    "Work Sans",
    "Rubik",
    "Source Sans Pro",
    "Mukta",
    "PT Sans",
    "Oswald",
    "Fira Sans",
    "Hind",
    "Cabin",
    "Karla",
    "Titillium Web",
    "Quicksand",
    "Oxygen",
    "Dosis",
    "Barlow",
    "Manrope",
    "DM Sans",
    "Mulish",
    "Heebo",
    "Exo 2",
    "IBM Plex Sans",
    "Comfortaa",
    "Abel",
    "Archivo",
    "Noto Sans",
    "Red Hat Display",
    "Jost",
    "Asap",
    "Catamaran",
    "Public Sans",
    "Space Grotesk",

    // Display fonts
    "Bebas Neue",
    "Anton",
    "Righteous",
    "Staatliches",
    "Monoton",
    "Abril Fatface",
    "Fredoka One",
    "Audiowide",
    "Bungee",
    "Yellowtail",
    "Alfa Slab One",
    "Secular One",
    "Black Ops One",
    "Sigmar One",
    "Bowlby One SC",
    "Poiret One",
    "Titan One",
    "Creepster",
    "Fugaz One",

    // Handwriting & Script fonts
    "Pacifico",
    "Lobster",
    "Dancing Script",
    "Great Vibes",
    "Satisfy",
    "Kaushan Script",
    "Tangerine",
    "Allura",
    "Cookie",
    "Sacramento",
    "Indie Flower",
    "Shadows Into Light",
    "Caveat",
    "Architects Daughter",
    "Patrick Hand",
    "Amatic SC",
    "Courgette",
    "Kalam",
    "Handlee",

    // Monospace fonts
    "Roboto Mono",
    "Source Code Pro",
    "JetBrains Mono",
    "Fira Code",
    "Inconsolata",
    "Space Mono",
    "IBM Plex Mono",
    "Courier Prime",
    "Anonymous Pro",
    "Overpass Mono",
    "Ubuntu Mono",
    "PT Mono",

    // More useful fonts
    "Roboto Condensed",
    "Libre Franklin",
    "Josefin Sans",
    "Nanum Gothic",
    "PT Sans Narrow",
    "Varela Round",
    "Lexend",
    "Merriweather Sans",
    "Encode Sans",
    "Sora",
    "Outfit",
    "Plus Jakarta Sans",
    "Epilogue",
    "Urbanist",
    "Figtree",
    "Albert Sans",
    "Bricolage Grotesque",
  ];

  // Combine all unique fonts
  const allFonts = [...new Set([...popularFonts, ...funkyFonts, ...additionalFonts])];

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

  // Sort fonts into categories
  const popular = allFonts.filter(f => popularFonts.includes(f.family));
  const funky = allFonts.filter(f => funkyFonts.includes(f.family));
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
  fontsCache = null;
  fetchPromise = null;
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
  return popularFonts;
};

/**
 * Get funky/display fonts as simple array
 */
export const getFunkyFonts = (): string[] => {
  return funkyFonts;
};
