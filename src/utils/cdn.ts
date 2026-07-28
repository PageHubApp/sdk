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

  const namedVariantUrl = `${cdnConfig.baseUrl}/${cdnConfig.accountHash}/${mediaId}/${cdnConfig.variant}`;

  if (Object.keys(options).length === 0) return namedVariantUrl;

  const parts: string[] = [];
  if (options.width != null) parts.push(`w=${options.width}`);
  if (options.height != null) parts.push(`h=${options.height}`);
  if (options.fit) parts.push(`fit=${options.fit}`);
  if (options.format) parts.push(`format=${options.format}`);
  if (options.quality != null) parts.push(`quality=${options.quality}`);

  return parts.length
    ? `${cdnConfig.baseUrl}/${cdnConfig.accountHash}/${mediaId}/${parts.join(",")}`
    : namedVariantUrl;
}

/**
 * Generate srcset attribute for responsive images
 */
export function generateSrcSet(
  mediaId: string,
  widths: number[] = [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
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

/** Canonical responsive candidate widths — the ONE list every render path uses. */
export const IMAGE_RESPONSIVE_WIDTHS = [
  320, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840,
];

// ─── Responsive `sizes` derivation ───────────────────────────────────────────
//
// The `sizes` attribute is the linchpin of responsive delivery: `srcset` gives
// the browser candidates, `sizes` tells it the CSS display width so it picks
// the right one. A wrong `sizes` mis-picks in EITHER direction — an oversized
// variant for a tiny logo, or an upscaled/blurry variant for a full-bleed hero.
//
// The old matcher only understood `w-<n>` / `max-w-<key>` and returned `null`
// (→ a 100vw/50vw/33vw fallback) for the two commonest layouts: a height-capped
// logo (`h-10 w-auto`) and a full-bleed hero (`w-full inset-0`). `deriveImageSizes`
// handles those plus fractional widths, grid-column context, and per-breakpoint
// overrides — and defaults to `100vw` (safe over-fetch) instead of `33vw` (blur)
// when the layout is genuinely unknown.

const TW_MAX_W_PX: Record<string, number> = {
  xs: 320, sm: 384, md: 448, lg: 512, xl: 576,
  "2xl": 672, "3xl": 768, "4xl": 896, "5xl": 1024,
  "6xl": 1152, "7xl": 1280,
};

/** Tailwind fractional widths → percent of the containing block. */
const FRACTION_PCT: Record<string, number> = {
  "1/2": 50, "1/3": 33, "2/3": 67, "1/4": 25, "2/4": 50, "3/4": 75,
  "1/5": 20, "2/5": 40, "3/5": 60, "4/5": 80,
  "1/6": 17, "5/6": 83, "1/12": 8, full: 100, screen: 100,
};

/** Min-width (px) for each Tailwind breakpoint tier. `base` has no query. */
const BP_MIN: Record<string, number> = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 };
const TIERS = ["base", "sm", "md", "lg", "xl", "2xl"] as const;
type Tier = (typeof TIERS)[number];

type Len = { kind: "vw"; value: number } | { kind: "px"; value: number };

/** Parse an arbitrary Tailwind length value (`500px`, `20rem`, `50vw`, `40%`). */
function parseArbitraryLen(raw: string): Len | null {
  const s = raw.trim();
  let m = s.match(/^(\d+(?:\.\d+)?)px$/);
  if (m) return { kind: "px", value: parseFloat(m[1]) };
  m = s.match(/^(\d+(?:\.\d+)?)rem$/);
  if (m) return { kind: "px", value: parseFloat(m[1]) * 16 };
  m = s.match(/^(\d+(?:\.\d+)?)(?:vw|%)$/);
  if (m) return { kind: "vw", value: parseFloat(m[1]) };
  return null;
}

/** Split a class token into its breakpoint tier + bare utility (ignoring state variants). */
function tierAndBare(token: string): { tier: Tier; bare: string } {
  const parts = token.split(":");
  const bare = parts[parts.length - 1];
  let tier: Tier = "base";
  for (const p of parts.slice(0, -1)) {
    if (p in BP_MIN) tier = p as Tier;
  }
  return { tier, bare };
}

/** Width signal from a bare `w-*` utility, or null if it isn't one. */
function widthLen(bare: string): Len | null {
  const frac = bare.match(/^w-(\d+\/\d+|full|screen)$/);
  if (frac && FRACTION_PCT[frac[1]] != null) return { kind: "vw", value: FRACTION_PCT[frac[1]] };
  const wn = bare.match(/^w-(\d+(?:\.\d+)?)$/);
  if (wn) return { kind: "px", value: parseFloat(wn[1]) * 4 };
  const arb = bare.match(/^w-\[(.+)\]$/);
  if (arb) return parseArbitraryLen(arb[1]);
  return null;
}

/** max-width cap in px from a bare `max-w-*` utility, or null (no usable cap). */
function maxWidthPx(bare: string): number | null {
  const m = bare.match(/^max-w-\[(.+)\]$/);
  if (m) {
    const len = parseArbitraryLen(m[1]);
    return len?.kind === "px" ? len.value : null;
  }
  const key = bare.match(/^max-w-(.+)$/)?.[1];
  return key != null && TW_MAX_W_PX[key] != null ? TW_MAX_W_PX[key] : null;
}

/** Fixed height in px from a bare `h-<n>` / `h-[..px]` utility (for logo capping). */
function heightPx(bare: string): number | null {
  const hn = bare.match(/^h-(\d+(?:\.\d+)?)$/);
  if (hn) return parseFloat(hn[1]) * 4;
  const arb = bare.match(/^h-\[(.+)\]$/);
  const len = arb ? parseArbitraryLen(arb[1]) : null;
  return len?.kind === "px" ? len.value : null;
}

/** Fill missing tiers from the next-lower tier (Tailwind mobile-first inheritance). */
function inherit<T>(byTier: Partial<Record<Tier, T>>): Record<Tier, T | undefined> {
  const out = {} as Record<Tier, T | undefined>;
  let last: T | undefined;
  for (const t of TIERS) {
    if (byTier[t] !== undefined) last = byTier[t];
    out[t] = last;
  }
  return out;
}

/** Format a resolved per-tier length, applying an optional px cap. */
function fmt(len: Len, capPx: number | null): string {
  if (len.kind === "px") {
    const v = capPx != null ? Math.min(len.value, capPx) : len.value;
    return `${Math.round(v)}px`;
  }
  return capPx != null ? `min(${Math.round(len.value)}vw, ${Math.round(capPx)}px)` : `${Math.round(len.value)}vw`;
}

/**
 * Derive a full responsive `sizes` string from an image's own className and its
 * immediate parent's className. Always returns a value (never null) — the safe
 * default is `100vw` (over-fetch, never blur). Precedence per breakpoint:
 * explicit width → grid-column context → height-capped logo → 100vw; then any
 * `max-w-*` clamps the result via CSS `min()`.
 */
export function deriveImageSizes(
  className?: string | undefined,
  parentClassName?: string | undefined
): string {
  const own = (className || "").split(/\s+/).filter(Boolean);
  const parent = (parentClassName || "").split(/\s+/).filter(Boolean);

  const widthByTier: Partial<Record<Tier, Len>> = {};
  const maxWByTier: Partial<Record<Tier, number>> = {};
  const heightByTier: Partial<Record<Tier, number>> = {};
  const gridColsByTier: Partial<Record<Tier, number>> = {};
  let hasWAuto = false;
  let fullBleed = false;

  for (const tok of own) {
    const { tier, bare } = tierAndBare(tok);
    if (bare === "w-auto") hasWAuto = true;
    if (bare === "w-full" || bare === "w-screen" || bare === "h-full" || bare === "inset-0") {
      fullBleed = true;
    }
    const wl = widthLen(bare);
    if (wl) widthByTier[tier] = wl;
    const mw = maxWidthPx(bare);
    if (mw != null) maxWByTier[tier] = mw;
    const hp = heightPx(bare);
    if (hp != null) heightByTier[tier] = hp;
  }
  for (const tok of parent) {
    const { tier, bare } = tierAndBare(tok);
    const m = bare.match(/^grid-cols-(\d+)$/);
    if (m) gridColsByTier[tier] = parseInt(m[1], 10);
  }

  const width = inherit(widthByTier);
  const maxW = inherit(maxWByTier);
  const height = inherit(heightByTier);
  const grid = inherit(gridColsByTier);

  // A height-constrained image with no width class (or `w-auto`) is a logo /
  // inline mark — cap the request at ~4× its rendered height instead of the
  // 100vw default (a 40px-tall logo should fetch the 320w variant, not 1080w).
  const sizeAt = (tier: Tier): string => {
    let len = width[tier];
    const cols = grid[tier];
    if (!len) {
      const h = height[tier];
      // Logo / inline mark: height-capped, no width class, not full-bleed, and
      // NOT a grid cell (a grid child fills its column — divide 100vw instead).
      const logo =
        h != null && !fullBleed && !cols && (hasWAuto || Object.keys(widthByTier).length === 0);
      if (logo) return fmt({ kind: "px", value: h! * 4 }, maxW[tier] ?? null);
      len = { kind: "vw", value: 100 };
    }
    // `w-full` / fractional widths are relative to the containing block — inside a
    // CSS grid that block is one column, so divide the vw by the column count.
    if (len.kind === "vw" && cols && cols > 1) {
      len = { kind: "vw", value: len.value / cols };
    }
    return fmt(len, maxW[tier] ?? null);
  };

  // Compute each tier, then emit `(min-width) value` largest→smallest, base last.
  const resolved: Record<Tier, string> = {} as any;
  for (const t of TIERS) resolved[t] = sizeAt(t);

  const base = resolved.base;
  const records: Array<{ tier: Tier; val: string }> = [];
  let last = base;
  for (const t of ["sm", "md", "lg", "xl", "2xl"] as Tier[]) {
    if (resolved[t] !== last) {
      records.push({ tier: t, val: resolved[t] });
      last = resolved[t];
    }
  }
  const media = records
    .reverse()
    .map(r => `(min-width: ${BP_MIN[r.tier]}px) ${r.val}`);
  return [...media, base].join(", ");
}

/** @deprecated Back-compat shim — use {@link deriveImageSizes}. Returns the base sizes value. */
export function inferFixedSizesFromClassName(
  className: string | undefined,
  parentClassName?: string | undefined
): string | null {
  const s = deriveImageSizes(className, parentClassName);
  return s || null;
}

export interface ResponsiveImageResult {
  src: string;
  srcSet?: string;
  sizes?: string;
}

/**
 * The single source of truth for a CDN image's `{ src, srcSet, sizes }`. Every
 * render path (React editor + walker, static `toHTML`, media-library `videoId`
 * path) and the app's SSR `<link rel=preload>` extractor calls this, so the
 * preload always matches the rendered `<img>` (no double-download, no drift).
 *
 * `sizesOverride` (author-supplied `props.sizes`) wins over derivation.
 */
export function resolveCdnResponsive(
  cdnId: string,
  opts: {
    className?: string;
    parentClassName?: string;
    quality?: number;
    sizesOverride?: string;
    baseWidth?: number;
  } = {}
): ResponsiveImageResult {
  if (!cdnId) return { src: "" };
  const { className, parentClassName, quality, sizesOverride, baseWidth = 1280 } = opts;
  const fmtOpts = { format: "auto", ...(quality !== undefined ? { quality } : {}) };
  return {
    src: getCdnUrl(cdnId, { width: baseWidth, ...fmtOpts }),
    srcSet: generateSrcSet(cdnId, IMAGE_RESPONSIVE_WIDTHS, fmtOpts),
    sizes: sizesOverride || deriveImageSizes(className, parentClassName),
  };
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
