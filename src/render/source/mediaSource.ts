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
 *  - **Maps** emit the runtime's lazy-hydration contract (`chunks/map.ts`): the
 *    container carries a `data-map` JSON config (`{lat,lng,zoom?,grayscale?}`)
 *    the chunk reads via `JSON.parse`, and the `MapPoint` / `MapPath` children
 *    are the pins (`[data-lat]`/`[data-lng]`) and routes (`[data-path]`) it
 *    queries. The children stay visible as a no-JS fallback; the chunk hides
 *    them itself once Leaflet mounts. Pin title/description and route label are
 *    TEXT content (the chunk reads `textContent`), not `data-*`.
 *  - `lat` / `lng` / `zoom` pass through verbatim INSIDE the JSON, and `path`
 *    verbatim, so a detail-page `{{ item.lat }}` binding survives into the source.
 *
 * Not handled here (per spec "Not in this converter"): Embed `headCode` /
 * `footCode` are layout-global settings the host provides, so they are dropped
 * — the inline embed body is all that maps to a page node.
 */
import { liquidizeBindings } from "./bindings";
import type { StaticRenderContext } from "../../utils/staticHtml";
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
    .map(([k, v]) => (v === true ? k : `${k}="${liquidizeBindings(String(v)).replace(/"/g, "&quot;")}"`))
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

/** Minimal text escape for element content — keeps `{{ item.x }}` bindings intact. */
function escText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

/** The Leaflet container + its `data-map` JSON config; children (pins / routes) are the
 *  elements the runtime `map` chunk queries. Mirrors `chunks/map.ts`'s contract. OSM is the
 *  chunk's default tile style (the only one that renders unwatermarked), so no tiles are emitted. */
export const mapSource: ToSourceFn = (props, children, _ctx) => {
  const { grayscale = false, title = "" } = props;
  const cls = `overflow-hidden ${classString(props) || ""}`.trim();
  // Build the JSON by hand so a detail-page `{{ item.lat }}` binding passes through verbatim
  // (a JSON.stringify would quote it as a string). Zoom is omitted when unset so the chunk
  // fits the bounds of the pins instead; grayscale only when on.
  const parts = [`"lat":${coord(props.lat, "51.505")}`, `"lng":${coord(props.lng, "-0.09")}`];
  const zoom = coord(props.zoom, "");
  if (zoom) parts.push(`"zoom":${zoom}`);
  if (grayscale) parts.push(`"grayscale":true`);
  return el(
    "div",
    {
      class: cls || undefined,
      role: "region",
      "aria-label": title || "Map",
      "data-map": `{${parts.join(",")}}`,
    },
    children
  );
};

/** A map pin → an `<address>` the runtime reads for position (`data-lat`/`data-lng`) and
 *  popup text (`<strong>` title + description); doubles as a no-JS fallback. */
export const mapPointSource: ToSourceFn = (props, _children, _ctx) => {
  const title = typeof props.title === "string" ? props.title.trim() : "";
  const description = typeof props.description === "string" ? props.description.trim() : "";
  const inner = [title ? el("strong", {}, escText(title)) : "", escText(description)].filter(Boolean).join(" ");
  return el(
    "address",
    {
      "data-lat": coord(props.lat, "0"),
      "data-lng": coord(props.lng, "0"),
    },
    inner
  );
};

/** A route line → a `<span>` the runtime reads for its path (`data-path` = `lat,lng` per line,
 *  plus style `data-*`); the label is visible text (and the chunk's permanent tooltip). */
export const mapPathSource: ToSourceFn = (props, _children, _ctx) => {
  const label = typeof props.label === "string" ? props.label.trim() : "";
  return el(
    "span",
    {
      "data-path": typeof props.path === "string" ? props.path : undefined,
      "data-color": props.color || undefined,
      "data-weight": props.weight != null ? String(props.weight) : undefined,
      "data-opacity": props.opacity != null ? String(props.opacity) : undefined,
      "data-dashed": props.dashed === false ? "false" : "true",
    },
    escText(label)
  );
};
