import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useRef, useState } from "react";
import { TbBrandVimeo, TbBrandYoutube, TbPlayerPlay, TbVideo } from "react-icons/tb";
import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { getMediaContent } from "../utils/media";
import { isDirectVideoFileUrl, nativeVideoPlaybackFields } from "../utils/nativeVideo";

import { Box } from "@pagehub/ui";
import { motionIt } from "../utils/lib";
import { applyAnimation } from "../utils/tailwind/tailwind";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

const DynamicYouTube = React.lazy(() => import("react-youtube"));

const YouTube = props => (
  <React.Suspense
    fallback={
      <div role="status" aria-live="polite">
        Loading video...
      </div>
    }
  >
    <DynamicYouTube {...props} />
  </React.Suspense>
);

// Generic video embed for Vimeo, Dailymotion, Wistia, etc.
const VideoEmbed = ({ provider, videoId, title, className }) => {
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
        return videoId; // Direct URL
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
  | "youtube"
  | "vimeo"
  | "dailymotion"
  | "wistia"
  | "facebook"
  | "twitch"
  | "url"
  /** Self-hosted video stored in the host's R2 bucket via Media Manager.
   *  `videoId` is the R2 mediaId; the renderer resolves it through
   *  `getMediaContent` to the public delivery URL. */
  | "r2";

export interface VideoProps extends BaseSelectorProps {
  provider?: VideoProvider;
  videoId?: string;
  title?: string;
  /** HTML5 playback — used for R2 uploads and direct file URLs (`.mp4`, `.webm`, …). */
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  controls?: boolean;
  preload?: string;
}

export const Video = (incomingProps: VideoProps) => {
  let props: any = {
    canDelete: true,
    canEditName: true,
    provider: "youtube",
    controls: true,
    playsInline: true,
    ...incomingProps,
  };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { name } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
  }));

  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const { isActive } = useEditor((_, q) => ({
    isActive: q.getEvent("selected").contains(id),
  }));

  const { videoId } = props;

  props = setClonedProps(props, query);

  const { provider } = props;

  const ref = useRef<HTMLElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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
    if (!videoId) {
      return enabled ? (
        <EditorEmptyLeafHint
          selected={isActive}
          icon={getProviderIcon()}
          idleLabel="Empty video"
          selectedLabel="Drop here or right-click"
        />
      ) : null;
    }

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
      const src = getMediaContent(query, videoId);
      if (!src) {
        return enabled ? (
          <EditorEmptyLeafHint
            selected={isActive}
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
    ref: r => {
      ref.current = r;
      connect(drag(r));
    },
    className: "",
    role: "region",
    "aria-label": props.title || videoId ? `Video: ${props.title || videoId}` : "Video player",
    children: renderVideoPlayer(),
  };

  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    prop["data-empty-state"] = !videoId;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
    prop.onClick = e => e.preventDefault();
  }

  return React.createElement(
    motionIt(props, Box, enabled),
    applyAnimation({ ...prop, key: id }, props, null, enabled)
  );
};

Video.craft = {
  displayName: "Video",
};
