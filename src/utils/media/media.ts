/**
 * Media management utilities — CRUD for pageMedia on ROOT_NODE
 */

import { ROOT_NODE } from "../rootNode";
import { getCdnUrl, resolveCdnResponsive } from "../cdn";
import { sdkLog } from "../logger";

// ─── Internal helpers ───

/** Bare Cloudflare-style image id when background.imageType was not persisted */
export const looksLikeCdnImageId = (content: string): boolean => {
  if (!content || typeof content !== "string") return false;
  const s = content.trim();
  if (s.startsWith("http") || s.startsWith("/") || s.startsWith("data:")) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
};

/** Calculate optimal background image size based on viewport and device pixel ratio */
export const calculateOptimalBackgroundSize = (): number => {
  if (typeof window === "undefined") return 1920;
  const actualWidth = window.innerWidth * (window.devicePixelRatio || 1);
  const breakpoints = [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840];
  return breakpoints.find(size => size >= actualWidth) || 3840;
};

// ─── Page media CRUD ───

export const registerMediaWithBackground = (
  query: any,
  actions: any,
  mediaId: string,
  mediaType: string = "cdn",
  componentId?: string
) => {
  try {
    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return;

    actions.setProp(ROOT_NODE, (props: any) => {
      props.pageMedia = props.pageMedia || [];
      const exists = props.pageMedia.find((m: any) => m.id === mediaId);
      if (exists) {
        exists.componentId = componentId;
        exists.type = mediaType;
      } else {
        props.pageMedia.push({
          id: mediaId,
          type: mediaType,
          uploadedAt: Date.now(),
          componentId,
        });
      }
    });
  } catch (e) {
    sdkLog.error("Failed to register media with Background:", e);
  }
};

export const unregisterMediaFromBackground = (query: any, actions: any, mediaId: string) => {
  try {
    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return;

    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.pageMedia) return;
      props.pageMedia = props.pageMedia.filter((m: any) => m.id !== mediaId);
    });
  } catch (e) {
    sdkLog.error("Failed to unregister media from Background:", e);
  }
};

export const getPageMedia = (query: any) => {
  try {
    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return [];
    return backgroundNode.data.props.pageMedia || [];
  } catch (e) {
    sdkLog.error("Failed to get page media:", e);
    return [];
  }
};

/**
 * Get the resolved URL for a media id.
 * @param pageMedia - Array of media records (from `ROOT.props.pageMedia`).
 *   Editor call sites pass `query.node(ROOT_NODE).get()?.data?.props?.pageMedia`.
 *   Walker call sites read from `rootProps.pageMedia` directly.
 */
export const getMediaContent = (
  pageMedia: any[] | null | undefined,
  mediaId: string
): string | null => {
  try {
    if (!mediaId) return null;
    if (!pageMedia || !Array.isArray(pageMedia)) return null;

    const media = pageMedia.find((m: any) => m.id === mediaId);
    if (!media) return null;

    if (media.type === "url") return media.metadata?.url || null;
    if (media.type === "svg") {
      const svgContent = media.metadata?.svg || "";
      return `data:image/svg+xml;base64,${btoa(svgContent)}`;
    }
    // R2 objects (video/audio/pdf/etc) — no CDN variant transforms, just the
    // stored public URL. deliveryURL is written at upload time.
    if (media.type === "r2") return media.metadata?.deliveryURL || null;

    const cdnId = media.cdnId || media.id;
    return getCdnUrl(cdnId, { width: calculateOptimalBackgroundSize(), format: "auto" });
  } catch (e) {
    sdkLog.error("Failed to get media content:", e);
    return null;
  }
};

export const getResponsiveImageAttrs = (
  pageMedia: any[] | null | undefined,
  mediaId: string,
  opts: { className?: string; parentClassName?: string; sizes?: string } = {}
) => {
  try {
    if (!mediaId) return { src: null, srcset: null, sizes: null };
    if (!pageMedia || !Array.isArray(pageMedia))
      return { src: null, srcset: null, sizes: null };

    const media = pageMedia.find((m: any) => m.id === mediaId);

    if (!media || media.type === "url" || media.type === "svg" || media.type === "r2") {
      // No responsive variants for URL / SVG / R2 — just the raw src.
      return { src: getMediaContent(pageMedia, mediaId), srcset: null, sizes: null };
    }

    // CDN media → same shared resolver as `type:"cdn"` Image nodes, so a
    // media-library image gets className-aware `sizes` (not a hardcoded 33vw).
    const cdnId = media.cdnId || media.id;
    const r = resolveCdnResponsive(cdnId, {
      className: opts.className,
      parentClassName: opts.parentClassName,
      sizesOverride: opts.sizes,
    });
    return { src: r.src, srcset: r.srcSet, sizes: r.sizes };
  } catch (e) {
    sdkLog.error("Failed to get responsive image attrs:", e);
    return { src: getMediaContent(pageMedia, mediaId), srcset: null, sizes: null };
  }
};

// ─── Intrinsic size (CLS) ───

/**
 * Intrinsic pixel dimensions recorded for a media entry, or `null` when none
 * were captured.
 *
 * Two writers persist dimensions today and they use different shapes, so this
 * is the one place that normalizes them:
 *   - nested `metadata.dimensions.{width,height}` — the editor upload paths
 *     (`useMediaUpload`, `ImageUploadInput`, `useAiGeneration`) via
 *     `getImageDimensionsFromFile` / `...FromUrl`
 *   - flat `metadata.{width,height}` — `scripts/upload-media.mjs` (sharp)
 *
 * Anything non-finite, non-positive, or absent yields `null`. A guessed
 * dimension is worse than none: it would hand the browser a wrong aspect ratio
 * and distort the image.
 */
export const getMediaDimensions = (
  pageMedia: any[] | null | undefined,
  mediaId: string
): { width: number; height: number } | null => {
  if (!mediaId || !pageMedia || !Array.isArray(pageMedia)) return null;
  const meta = pageMedia.find((m: any) => m?.id === mediaId)?.metadata;
  if (!meta) return null;

  const px = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null;

  const width = px(meta.dimensions?.width) ?? px(meta.width);
  const height = px(meta.dimensions?.height) ?? px(meta.height);
  return width && height ? { width, height } : null;
};

/**
 * Does `className` declare an explicit CSS `width` at the base breakpoint (and
 * therefore at every breakpoint, via Tailwind's mobile-first inheritance)?
 *
 * Breakpoint- and state-prefixed tokens are ignored on purpose: a `md:w-1/2`
 * or `hover:w-full` leaves the width unconstrained at base, which is precisely
 * the case we must not emit into.
 */
const hasExplicitCssWidth = (className?: string): boolean =>
  (className || "")
    .split(/\s+/)
    .some(tok => tok.length > 0 && !tok.includes(":") && /^(?:w|size)-/.test(tok));

/**
 * The `width` / `height` attributes to stamp on a rendered `<img>`, or `null`
 * to stamp nothing.
 *
 * Why the attributes fix CLS: with Tailwind preflight's `img { max-width:100%;
 * height:auto }` in play (it ships via `@import "tailwindcss"` in the SSR
 * compiler, so every published route has it), `width`/`height` feed the UA's
 * `aspect-ratio: attr(width) / attr(height)` rule. The browser reserves the
 * right box before the bytes arrive while CSS still drives the displayed size.
 *
 * Why the width gate: the attributes are *presentational hints*, the
 * lowest-priority cascade origin. An author `width` declaration always beats
 * them, so they can only ever contribute the aspect ratio — the box is
 * unchanged. With no author width the `width` hint becomes the used width, and
 * that silently resizes the two layouts that depend on an auto width: a
 * height-capped logo (`h-10` alone, where the box grows from ratio-derived to
 * the full intrinsic pixel width) and an inset-positioned overlay (`absolute
 * inset-0`, where a non-auto width makes the browser drop `right`). Both are
 * real visual regressions, so those images get no attributes at all.
 */
export const getIntrinsicSizeAttrs = (
  pageMedia: any[] | null | undefined,
  mediaId: string,
  opts: { className?: string } = {}
): { width: number; height: number } | null => {
  if (!hasExplicitCssWidth(opts.className)) return null;
  return getMediaDimensions(pageMedia, mediaId);
};

export const getMediaById = (query: any, mediaId: string): any | null => {
  try {
    if (!mediaId) return null;
    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return null;
    const pageMedia = backgroundNode.data.props.pageMedia || [];
    return pageMedia.find((m: any) => m.id === mediaId) || null;
  } catch (e) {
    sdkLog.error("Failed to get media by ID:", e);
    return null;
  }
};

export const updateMediaMetadata = (
  query: any,
  actions: any,
  mediaId: string,
  metadata: { alt?: string; title?: string; description?: string }
) => {
  try {
    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.pageMedia) return;
      const mediaItem = props.pageMedia.find((m: any) => m.id === mediaId);
      if (mediaItem) {
        mediaItem.metadata = { ...mediaItem.metadata, ...metadata };
      }
    });
  } catch (e) {
    sdkLog.error("Failed to update media metadata:", e);
  }
};

export const syncPageMedia = (query: any, actions: any) => {
  try {
    const nodes = query.getSerializedNodes();
    const usedMediaIds = new Set<string>();

    const mediaProps = [
      "ico",
      "image",
      "videoId",
      "src",
      "imageDesktop",
      "imageTablet",
      "imageMobile",
    ];

    Object.keys(nodes).forEach(nodeId => {
      const props = nodes[nodeId].props;
      mediaProps.forEach(propKey => {
        if (props[propKey] && typeof props[propKey] === "string") {
          usedMediaIds.add(props[propKey]);
        }
      });
      // Nested: background.image (CDN media id for section/container backgrounds)
      const bgImage = props?.background?.image;
      if (bgImage && typeof bgImage === "string") usedMediaIds.add(bgImage);
    });

    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.pageMedia) return;
      props.pageMedia = props.pageMedia.filter((m: any) => usedMediaIds.has(m.id));
    });

    return Array.from(usedMediaIds);
  } catch (e) {
    sdkLog.error("Failed to sync page media:", e);
    return [];
  }
};
