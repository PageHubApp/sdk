/**
 * Helpers for HTML5 <video> vs iframe embeds (Video component).
 */

/** Treat as direct file when path (before query) ends with a known video extension. */
export function isDirectVideoFileUrl(raw: string | undefined | null): boolean {
  if (!raw || typeof raw !== "string") return false;
  const s = raw.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|$)/i.test(u.pathname);
  } catch {
    return /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|$)/i.test(s);
  }
}

type SerializedNodes = Record<string, { props?: Record<string, unknown> } | undefined>;

/**
 * Resolve public video URL for R2 uploads from ROOT.pageMedia (serialized Craft tree).
 * Matches editor behavior of getMediaContent for type "r2".
 */
export function resolveR2VideoSrcFromSerializedTree(
  nodes: SerializedNodes | undefined,
  mediaId: string | undefined | null
): string | null {
  if (!nodes || !mediaId) return null;
  const pageMedia = nodes["ROOT"]?.props?.pageMedia;
  if (!Array.isArray(pageMedia)) return null;
  const m = pageMedia.find(
    (x: { id?: string; type?: string; metadata?: { deliveryURL?: string } }) =>
      x?.id === mediaId && x?.type === "r2"
  );
  const url = m?.metadata?.deliveryURL;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

/**
 * Boolean + preload attributes for static <video> and React (spread onto <video>).
 */
export function nativeVideoPlaybackFields(props: Record<string, unknown> | undefined): {
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  playsInline?: boolean;
  controls?: boolean;
  preload?: string;
} {
  const p = props || {};
  const autoPlay = !!p.autoPlay;
  const muted = p.muted !== undefined ? !!p.muted : autoPlay;
  const loop = !!p.loop;
  const playsInline = p.playsInline !== false;
  const controls = p.controls !== false;
  const preload =
    typeof p.preload === "string" && p.preload.trim() ? p.preload.trim() : "metadata";
  return { autoPlay, muted, loop, playsInline, controls, preload };
}
