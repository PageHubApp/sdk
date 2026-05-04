/**
 * CDN Configuration Utility
 * Cloudflare Images delivery URLs — shared between SDK standalone and app.
 *
 * When running inside the app (via tsconfig path to this module), the app sets env vars via
 * process.env.NEXT_PUBLIC_*. When running standalone SDK, Vite env vars are used.
 */

/**
 * Resolve env var with Vite → Next.js → fallback priority.
 * Next.js requires literal `process.env.NEXT_PUBLIC_*` strings for client-side
 * inlining, so we map each key explicitly below instead of using dynamic access.
 */
const NEXT_PUBLIC_ENV: Record<string, string | undefined> = {
  VITE_CDN_BASE_URL: process.env.NEXT_PUBLIC_CDN_BASE_URL,
  VITE_CDN_ACCOUNT_HASH: process.env.NEXT_PUBLIC_CDN_ACCOUNT_HASH,
  VITE_CDN_VARIANT: process.env.NEXT_PUBLIC_CDN_VARIANT,
};

const _env = (key: string, fallback?: string): string | undefined => {
  // Vite env (SDK standalone build)
  try {
    const val = (import.meta as any).env?.[key];
    if (val) return val;
  } catch {}
  // Next.js / Node env — literal references for client-side inlining
  const nextVal = NEXT_PUBLIC_ENV[key];
  if (nextVal) return nextVal;
  return fallback;
};

/** Mutable CDN config — set via configureCdn() or env vars */
let cdnConfig = {
  baseUrl: _env("VITE_CDN_BASE_URL") ?? "https://imagedelivery.net",
  accountHash: _env("VITE_CDN_ACCOUNT_HASH") ?? "",
  variant: _env("VITE_CDN_VARIANT", "public")!,
};

/**
 * Configure CDN settings at runtime (called by PageHub.init).
 * Values provided here override environment variables.
 */
export function configureCdn(opts: { accountHash?: string; baseUrl?: string; variant?: string }) {
  if (opts.accountHash) cdnConfig.accountHash = opts.accountHash;
  if (opts.baseUrl) cdnConfig.baseUrl = opts.baseUrl;
  if (opts.variant) cdnConfig.variant = opts.variant;
}

/**
 * Get the full CDN URL for a media item
 */
export function getCdnUrl(
  mediaId: string,
  options: { width?: number; height?: number; fit?: string; format?: string; quality?: number } = {}
): string {
  if (!mediaId) return "";

  if (!cdnConfig.accountHash) return "";

  const baseUrl = `${cdnConfig.baseUrl}/${cdnConfig.accountHash}/${mediaId}/${cdnConfig.variant}`;

  if (Object.keys(options).length === 0) return baseUrl;

  const params = new URLSearchParams();
  if (options.width != null) params.append("width", String(options.width));
  if (options.height != null) params.append("height", String(options.height));
  if (options.fit) params.append("fit", options.fit);
  if (options.format) params.append("format", options.format);
  if (options.quality != null) params.append("quality", String(options.quality));

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Generate srcset attribute for responsive images
 */
export function generateSrcSet(
  mediaId: string,
  widths: number[] = [320, 640, 960, 1280, 1920],
  options: { fit?: string; format?: string; quality?: number } = {}
): string {
  if (!mediaId) return "";

  return widths
    .map(width => {
      const url = getCdnUrl(mediaId, { ...options, width });
      return `${url} ${width}w`;
    })
    .join(", ");
}

/**
 * Infer a pixel-based `sizes` value from a Tailwind className when the image
 * sits in a fixed-width slot (e.g. `w-64`, `max-w-md`). Returns the smallest
 * applicable width in CSS pixels so the browser can pick the correct srcset
 * candidate; returns null when the layout is fluid/unknown.
 */
const TW_MAX_W_PX: Record<string, number> = {
  xs: 320, sm: 384, md: 448, lg: 512, xl: 576,
  "2xl": 672, "3xl": 768, "4xl": 896, "5xl": 1024,
  "6xl": 1152, "7xl": 1280,
};
export function inferFixedSizesFromClassName(
  className: string | undefined,
  parentClassName?: string | undefined
): string | null {
  const sources = [className, parentClassName].filter(Boolean) as string[];
  if (sources.length === 0) return null;
  let smallest: number | null = null;
  for (const src of sources) {
    for (const t of src.split(/\s+/).filter(Boolean)) {
      const bare = t.replace(/^(sm:|md:|lg:|xl:|2xl:|hover:|focus:|group-\w+:)+/, "");
      let px: number | null = null;
      const w = bare.match(/^w-(\d+(?:\.\d+)?)$/);
      if (w) px = parseFloat(w[1]) * 4;
      const mw = bare.match(/^max-w-(.+)$/);
      if (mw && TW_MAX_W_PX[mw[1]] !== undefined) px = TW_MAX_W_PX[mw[1]];
      if (px && (smallest === null || px < smallest)) smallest = px;
    }
  }
  return smallest ? `${smallest}px` : null;
}

/**
 * Generate sizes attribute for responsive images
 */
export function generateSizes(breakpoints: Record<string, string> = {}): string {
  const entries = Object.entries(breakpoints);
  const defaultIndex = entries.findIndex(([key]) => key === "default");

  const mediaQueries = entries.filter(([key]) => key !== "default");
  const defaultSize = defaultIndex !== -1 ? entries[defaultIndex][1] : "100vw";

  const sizesStr = mediaQueries.map(([query, size]) => `${query} ${size}`).join(", ");

  return sizesStr ? `${sizesStr}, ${defaultSize}` : defaultSize;
}
