import {
  isDirectVideoFileUrl,
  nativeVideoPlaybackFields,
  resolveR2VideoSrcFromSerializedTree,
} from "../../utils/nativeVideo";
import { ariaAttrs, staticClasses, tag, type ToHTMLFn } from "../../utils/staticHtml";

function emitNativeVideoHtml(
  props: Record<string, any>,
  ctx: Parameters<ToHTMLFn>[2],
  src: string,
  provider: string,
  videoId: string
): string {
  const cls = staticClasses(props, ctx);
  const { title } = props;
  const pb = nativeVideoPlaybackFields(props);
  const attrs: Record<string, string | boolean | undefined> = {
    src,
    class: cls || undefined,
    title: title || `${provider} video ${videoId}`,
  };
  if (pb.autoPlay) attrs.autoplay = true;
  if (pb.muted) attrs.muted = true;
  if (pb.loop) attrs.loop = true;
  if (pb.playsInline) attrs.playsinline = true;
  if (pb.controls) attrs.controls = true;
  if (pb.preload) attrs.preload = pb.preload;
  return tag(
    "div",
    {
      role: "region",
      "aria-label": title || `Video: ${videoId}`,
      ...ariaAttrs(props),
    },
    tag("video", attrs, "")
  );
}

export const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const { videoId, provider = "youtube", title } = props;
  if (!videoId) return "";

  if (provider === "r2") {
    const src = resolveR2VideoSrcFromSerializedTree(ctx.nodes, videoId);
    if (!src) return "";
    return emitNativeVideoHtml(props, ctx, src, provider, videoId);
  }

  if (provider === "url" && isDirectVideoFileUrl(videoId)) {
    return emitNativeVideoHtml(props, ctx, videoId, provider, videoId);
  }

  const cls = staticClasses(props, ctx);
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
      src = videoId;
  }

  const iframe = tag("iframe", {
    src,
    class: cls || undefined,
    frameborder: "0",
    allow:
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    allowfullscreen: true,
    title: title || `${provider} video ${videoId}`,
    loading: "lazy",
  });
  return tag(
    "div",
    {
      role: "region",
      "aria-label": title || `Video: ${videoId}`,
      ...ariaAttrs(props),
    },
    iframe
  );
};
