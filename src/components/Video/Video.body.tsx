/** Pure body for Video. NO `@craftjs/core`. */
/* eslint-disable react-hooks/rules-of-hooks -- render*Body fns are invoked once from a wrapper component; hook order is preserved. Renamed to use* would change exported public-ish API across the SDK. */
import React, { useRef } from "react";
import { TbBrandVimeo, TbBrandYoutube, TbPlayerPlay, TbVideo } from "../_emptyHintIcons";
import { EditorEmptyLeafHint } from "../../chrome/primitives/EditorEmptyLeafHint";
import { getMediaContent } from "../../utils/media/media";
import { isDirectVideoFileUrl, nativeVideoPlaybackFields } from "../../utils/nativeVideo";
import { Box } from "@pagehub/ui";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import type { RenderCtx } from "../../render/react/RenderCtx";
import { BaseSelectorProps, applyAriaProps } from "../selectors";

const DynamicYouTube = React.lazy(() => import("react-youtube"));
const YouTube = (props: any) => (
  <React.Suspense
    fallback={<div role="status" aria-live="polite">Loading video...</div>}
  >
    <DynamicYouTube {...props} />
  </React.Suspense>
);

const VideoEmbed = ({ provider, videoId, title, className }: any) => {
  const getEmbedUrl = () => {
    switch (provider) {
      case "vimeo":
        return `https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0`;
      case "dailymotion":
        return `https://www.dailymotion.com/embed/video/${videoId}`;
      case "wistia":
        return `https://fast.wistia.net/embed/iframe/${videoId}`;
      case "facebook":
        return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoId)}`;
      case "twitch":
        return `https://player.twitch.tv/?video=${videoId}&parent=${typeof window !== "undefined" ? window.location.hostname : ""}`;
      default:
        return videoId;
    }
  };
  return (
    <iframe
      src={getEmbedUrl()}
      className={className}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      title={title || `${provider} video ${videoId}`}
      loading="lazy"
    />
  );
};

export type VideoProvider =
  | "youtube" | "vimeo" | "dailymotion" | "wistia" | "facebook" | "twitch" | "url" | "r2";

export interface VideoProps extends BaseSelectorProps {
  provider?: VideoProvider;
  videoId?: string;
  title?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  controls?: boolean;
  preload?: string;
}

export function renderVideoBody(props: any, ctx: RenderCtx) {
  const { videoId, provider } = props;
  const ref = useRef<HTMLElement | null>(null);

  // Get appropriate icon for provider
  const getProviderIcon = () => {
    switch (provider) {
      case "youtube":
        return <TbBrandYoutube aria-label="YouTube icon" />;
      case "vimeo":
        return <TbBrandVimeo aria-label="Vimeo icon" />;
      case "url":
        return <TbVideo aria-label="Video icon" />;
      default:
        return <TbPlayerPlay aria-label="Video player icon" />;
    }
  };

  // Render video player based on provider
  const renderVideoPlayer = () => {
    // A decoratively-styled video slot (placeholder gradient, colored block)
    // is intentional — don't flag it as empty. Mirrors Button/Link/Image.
    const cn = props.className || "";
    const looksStyledShape =
      /\bbg-/.test(cn) || /\bbg-gradient-/.test(cn) || /\bbg-linear-/.test(cn);
    if (!videoId && !looksStyledShape) {
      return ctx.enabled ? (
        <EditorEmptyLeafHint
          selected={ctx.isActive}
          icon={getProviderIcon()}
          idleLabel="Empty video"
          selectedLabel="Drop here or right-click"
        />
      ) : null;
    }
    if (!videoId) return null;

    const videoClassName = props.className || "";

    if (provider === "youtube") {
      return (
        <YouTube
          className={videoClassName}
          videoId={videoId}
          opts={{
            width: "100%",
            height: "100%",
          }}
          title={props.title || `YouTube video ${videoId}`}
        />
      );
    }

    if (provider === "r2") {
      // videoId is a Media Manager mediaId; resolve to the R2 public URL.
      const src = getMediaContent(ctx.pageMedia, videoId);
      if (!src) {
        return ctx.enabled ? (
          <EditorEmptyLeafHint
            selected={ctx.isActive}
            icon={getProviderIcon()}
            idleLabel="Video not found in media library"
            selectedLabel="Pick a file from Media Manager"
          />
        ) : null;
      }
      const pb = nativeVideoPlaybackFields(props);
      return (
        <video
          className={videoClassName}
          src={src}
          autoPlay={pb.autoPlay}
          loop={pb.loop}
          muted={pb.muted}
          playsInline={pb.playsInline}
          controls={pb.controls}
          preload={pb.preload}
          title={props.title}
        />
      );
    }

    if (provider === "url" && isDirectVideoFileUrl(videoId)) {
      const pb = nativeVideoPlaybackFields(props);
      return (
        <video
          className={videoClassName}
          src={videoId}
          autoPlay={pb.autoPlay}
          loop={pb.loop}
          muted={pb.muted}
          playsInline={pb.playsInline}
          controls={pb.controls}
          preload={pb.preload}
          title={props.title}
        />
      );
    }

    return (
      <VideoEmbed
        provider={provider}
        videoId={videoId}
        title={props.title}
        className={videoClassName}
      />
    );
  };

  const prop: any = {
    ref: (r: any) => {
      ref.current = r;
      ctx.connect(ctx.drag(r));
    },
    className: "",
    role: "region",
    "aria-label": props.title || videoId ? `Video: ${props.title || videoId}` : "Video player",
    children: renderVideoPlayer(),
  };

  applyAriaProps(prop, props);

  if (ctx.enabled) {
    prop["data-bounding-box"] = ctx.enabled;
    prop["data-empty-state"] = !videoId;
    if (ctx.isMounted) prop["node-id"] = ctx.id;
    prop.onClick = (e: any) => e.preventDefault();
  }

  return React.createElement(
    motionIt(props, Box, ctx.enabled),
    applyAnimation({ ...prop, key: ctx.id }, props, null, ctx.enabled)
  );
}
