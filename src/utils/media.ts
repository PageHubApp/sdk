/**
 * Media management utilities — CRUD for pageMedia on ROOT_NODE
 */

import { ROOT_NODE } from "@craftjs/core";
import { getCdnUrl, generateSrcSet, generateSizes } from "./cdn";

// ─── Internal helpers ───

/** Bare Cloudflare-style image id when backgroundImageType was not persisted */
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
  const breakpoints = [320, 640, 960, 1280, 1920, 2560, 3840];
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
    console.error("Failed to register media with Background:", e);
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
    console.error("Failed to unregister media from Background:", e);
  }
};

export const getPageMedia = (query: any) => {
  try {
    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return [];
    return backgroundNode.data.props.pageMedia || [];
  } catch (e) {
    console.error("Failed to get page media:", e);
    return [];
  }
};

export const getMediaContent = (query: any, mediaId: string): string | null => {
  try {
    if (!mediaId) return null;
    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return null;

    const pageMedia = backgroundNode.data.props.pageMedia || [];
    const media = pageMedia.find((m: any) => m.id === mediaId);
    if (!media) return null;

    if (media.type === "url") return media.metadata?.url || null;
    if (media.type === "svg") {
      const svgContent = media.metadata?.svg || "";
      return `data:image/svg+xml;base64,${btoa(svgContent)}`;
    }

    const cdnId = media.cdnId || media.id;
    return getCdnUrl(cdnId, { width: calculateOptimalBackgroundSize(), format: "auto" });
  } catch (e) {
    console.error("Failed to get media content:", e);
    return null;
  }
};

export const getResponsiveImageAttrs = (query: any, mediaId: string) => {
  try {
    if (!mediaId) return { src: null, srcset: null, sizes: null };
    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return { src: null, srcset: null, sizes: null };

    const pageMedia = backgroundNode.data.props.pageMedia || [];
    const media = pageMedia.find((m: any) => m.id === mediaId);

    if (!media || media.type === "url" || media.type === "svg") {
      return { src: getMediaContent(query, mediaId), srcset: null, sizes: null };
    }

    const cdnId = media.cdnId || media.id;
    return {
      src: getCdnUrl(cdnId, { width: 1280, format: "auto" }),
      srcset: generateSrcSet(cdnId, [320, 640, 960, 1280, 1920, 2560], { format: "auto" }),
      sizes: generateSizes({
        "(max-width: 640px)": "100vw",
        "(max-width: 1024px)": "50vw",
        default: "33vw",
      }),
    };
  } catch (e) {
    console.error("Failed to get responsive image attrs:", e);
    return { src: getMediaContent(query, mediaId), srcset: null, sizes: null };
  }
};

export const getMediaById = (query: any, mediaId: string): any | null => {
  try {
    if (!mediaId) return null;
    const backgroundNode = query.node(ROOT_NODE).get();
    if (!backgroundNode) return null;
    const pageMedia = backgroundNode.data.props.pageMedia || [];
    return pageMedia.find((m: any) => m.id === mediaId) || null;
  } catch (e) {
    console.error("Failed to get media by ID:", e);
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
    console.error("Failed to update media metadata:", e);
  }
};

export const syncPageMedia = (query: any, actions: any) => {
  try {
    const nodes = query.getSerializedNodes();
    const usedMediaIds = new Set<string>();

    const mediaProps = [
      "ico", "image", "videoId", "backgroundImage", "src",
      "imageDesktop", "imageTablet", "imageMobile",
    ];

    Object.keys(nodes).forEach(nodeId => {
      const props = nodes[nodeId].props;
      mediaProps.forEach(propKey => {
        if (props[propKey] && typeof props[propKey] === "string") {
          usedMediaIds.add(props[propKey]);
        }
      });
    });

    actions.setProp(ROOT_NODE, (props: any) => {
      if (!props.pageMedia) return;
      props.pageMedia = props.pageMedia.filter((m: any) => usedMediaIds.has(m.id));
    });

    return Array.from(usedMediaIds);
  } catch (e) {
    console.error("Failed to sync page media:", e);
    return [];
  }
};
