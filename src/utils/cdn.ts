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
  baseUrl: _env("VITE_CDN_BASE_URL") ?? "",
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
