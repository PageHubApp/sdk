/**
 * Craft → HTML-first source emitters for the media + map node types
 * (see docs/strategy/html-first-converter.md). The `toSource` twins of
 * `Video.toHTML` / `Audio.toHTML` / `Embed.toHTML` / `Map.toHTML` /
 * `MapPoint.toHTML` / `MapPath.toHTML` — same tree walk, but each node emits
 * **Liquid + HTML source** instead of expanded output.
 *
 * Intentional source-mode divergences from the static expanders:
 *  - **Media ids** (R2 video, media-id audio) become the format's `file_url`
 *    filter — `{{ "<id>" | file_url }}` — the twin of `Image`'s `image_url`,
 *    so the engine resolves the same delivery URL the static walker baked in.
 *    An already-resolved URL (`http(s):` / `data:` / leading `/`) passes verbatim.
 *  - **Maps** carry their hydration inputs as individual `data-*` attributes
 *    (`data-lat` / `data-lng` / `data-zoom` / `data-tile-style` / `data-grayscale`)
 *    and the `MapPoint` / `MapPath` children emit their own hidden `data-*`
 *    carriers, instead of `Map.toHTML`'s single `data-ph-map` JSON blob. In
 *    source mode the children are emitted as source (not folded into a parent
 *    JSON config), so the runtime chunk hydrates by reading the container's
 *    attrs plus its `[data-ph-map-point]` / `[data-ph-map-path]` descendants.
 *  - `lat` / `lng` / `zoom` / `path` pass through verbatim, so a detail-page
 *    `{{ item.lat }}` binding survives into the source.
 *
 * Not handled here (per spec "Not in this converter"): Embed `headCode` /
 * `footCode` are layout-global settings the host provides, so they are dropped
 * — the inline embed body is all that maps to a page node.
 */
import type { StaticRenderContext } from "../static/types";
import type { ToSourceFn } from "./toSource";
import { isDirectVideoFileUrl, nativeVideoPlaybackFields } from "../../utils/nativeVideo";
import { resolveEmbedHTML } from "../../components/Embed/Embed.body";

// ─── local HTML helpers (mirror toSource.ts's internal `el` / `classString`) ──
// Re-stated here because toSource.ts keeps them private; `el` gains boolean
// support (bare attr for `true`, dropped for `false`) for `controls` / `hidden`
// / marker attrs, matching staticHtml's `buildAttrs`.

/** The element's class string, verbatim (every breakpoint / state variant kept). */
function classString(props: Record<string, any>): string | undefined {
  const c = props.className;
  const s = typeof c === "string" ? c : Array.isArray(c) ? c.join(" ") : "";
  return s.trim() || undefined;
}

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

/** `<tag a="b" flag>children</tag>`. `true` → bare attr, `false`/nullish/`""` dropped. */
function el(tagName: string, attrs: Record<string, string | boolean | null | undefined>, children = ""): string {
  const a = Object.entries(attrs)
    .filter(([, v]) => v != null && v !== false && v !== "")
    .map(([k, v]) => (v === true ? k : `${k}="${String(v).replace(/"/g, "&quot;")}"`))
    .join(" ");
  const open = `<${tagName}${a ? " " + a : ""}>`;
  return VOID.has(tagName) ? open : `${open}${children}</${tagName}>`;
}

/** A media id → the `file_url` filter; an already-resolved URL passes verbatim. */
function mediaSrc(raw: string): string {
  return /^(https?:|data:|\/)/.test(raw) ? raw : `{{ ${JSON.stringify(raw)} | file_url }}`;
}

/** A coordinate / zoom prop → source string. Binding tokens (`{{ item.lat }}`) and
 *  literals pass through verbatim; a blank/absent value falls back to `def`. */
function coord(v: unknown, def: string): string {
  if (v == null) return def;
  const s = String(v);
  return s.trim() === "" ? def : s;
}

// ─── Video ────────────────────────────────────────────────────────────────

/** Native `<video controls>` for an R2 upload / direct file URL; iframe for a
 *  provider (YouTube, Vimeo, …). Mirrors `Video.toHTML`. */
export const videoSource: ToSourceFn = (props, _children, _ctx) => {
  const { videoId, provider = "youtube", title } = props;
  if (!videoId) return "";
  const cls = classString(props);

  const native = (src: string): string => {
    const pb = nativeVideoPlaybackFields(props);
    const video = el("video", {
      src,
      class: cls,
      title: title || `${provider} video ${videoId}`,
      autoplay: pb.autoPlay || undefined,
      muted: pb.muted || undefined,
      loop: pb.loop || undefined,
      playsinline: pb.playsInline || undefined,
      controls: pb.controls || undefined,
      preload: pb.preload,
    });
    return el("div", { role: "region", "aria-label": title || `Video: ${videoId}` }, video);
  };

  if (provider === "r2") return native(mediaSrc(String(videoId)));
  if (provider === "url" && isDirectVideoFileUrl(videoId)) return native(String(videoId));

  let src = "";
  switch (provider) {
    case "youtube":
      src = `https://www.youtube.com/embed/${videoId}`;
      break;
    case "vimeo":
      src = `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`;
      break;
    case "dailymotion":
      src = `https://www.dailymotion.com/embed/video/${videoId}`;
      break;
    case "wistia":
      src = `https://fast.wistia.net/embed/iframe/${videoId}`;
      break;
    default:
      src = String(videoId);
  }
  const iframe = el("iframe", {
    src,
    class: cls,
    frameborder: "0",
    allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    allowfullscreen: true,
    title: title || `${provider} video ${videoId}`,
    loading: "lazy",
  });
  return el("div", { role: "region", "aria-label": title || `Video: ${videoId}` }, iframe);
};

// ─── Audio ──────────────────────────────────────────────────────────────────

/** Native `<audio controls>`; a media-id `src` resolves through `file_url`. Mirrors `Audio.toHTML`. */
export const audioSource: ToSourceFn = (props, _children, _ctx) => {
  const audioUrl = props.src ?? props.audioUrl;
  if (!audioUrl) return "";
  const { title, controls = true, loop = false } = props;
  const cls = classString(props);
  const audio = el(
    "audio",
    {
      src: mediaSrc(String(audioUrl)),
      class: cls,
      controls: controls || undefined,
      loop: loop || undefined,
      preload: "metadata",
      style: "width: 100%",
    },
    "Your browser does not support the audio element."
  );
  return el("div", { role: "region", "aria-label": title || `Audio: ${audioUrl}` }, audio);
};

// ─── Embed ────────────────────────────────────────────────────────────────

/** Service iframe/widget code or the raw custom-HTML `code`, kept inline with
 *  its `{{ }}` bindings verbatim (Liquid). Mirrors `Embed.toHTML`. `headCode` /
 *  `footCode` are layout-global host settings — not emitted here (see file head). */
export const embedSource: ToSourceFn = (props, _children, _ctx) => {
  const html = resolveEmbedHTML(props);
  if (!html) return "";
  return el(
    "div",
    { class: classString(props), role: "region", "aria-label": props.title || "Embedded content" },
    html
  );
};

// ─── Map / MapPoint / MapPath ─────────────────────────────────────────────

/** The Leaflet container + hydration `data-*`; children (points / paths) emitted
 *  as source carriers the runtime chunk reads. Mirrors `Map.toHTML`'s container. */
export const mapSource: ToSourceFn = (props, children, _ctx) => {
  const { type = "interactive", tileStyle = "osm", grayscale = false, title = "" } = props;
  const cls = `overflow-hidden ${classString(props) || ""}`.trim();
  return el(
    "div",
    {
      class: cls || undefined,
      role: "region",
      "aria-label": title || "Map",
      "data-ph-map": true,
      "data-lat": coord(props.lat, "51.505"),
      "data-lng": coord(props.lng, "-0.09"),
      "data-zoom": coord(props.zoom, "13"),
      "data-type": type,
      "data-tile-style": tileStyle,
      "data-grayscale": grayscale ? "true" : undefined,
    },
    children
  );
};

/** A map pin → a hidden `data-*` carrier (`lat` / `lng` / popup `title` / `description`). */
export const mapPointSource: ToSourceFn = (props, _children, _ctx) => {
  return el("div", {
    "data-ph-map-point": true,
    "data-lat": coord(props.lat, "0"),
    "data-lng": coord(props.lng, "0"),
    "data-title": props.title || undefined,
    "data-description": props.description || undefined,
    hidden: true,
  });
};

/** A route line → a hidden `data-*` carrier (`path` = `lat,lng` per line, plus style). */
export const mapPathSource: ToSourceFn = (props, _children, _ctx) => {
  return el("div", {
    "data-ph-map-path": true,
    "data-path": typeof props.path === "string" ? props.path : undefined,
    "data-color": props.color || undefined,
    "data-weight": props.weight != null ? String(props.weight) : undefined,
    "data-opacity": props.opacity != null ? String(props.opacity) : undefined,
    "data-dashed": props.dashed === false ? "false" : "true",
    "data-label": props.label || undefined,
    hidden: true,
  });
};
