/**
 * Video — Component definition via defineComponent()
 */
import React from "react";
import { TbVideo } from "react-icons/tb";
import { defineComponent } from "../define";
import { Video } from "./Video";
import { staticClasses, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const { videoId, provider = "youtube", title } = props;
  if (!videoId) return "";

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
import { VideoMainTab } from "../chrome/toolbar/unified-settings/mainTabs/VideoMainTab";
import { HoverNodeController, NameNodeController, DeleteNodeController } from "./editor-chrome";

export const VideoDef = defineComponent(
  {
    name: "Video",
    component: Video,
    icon: TbVideo,
    category: "Media",
    settings: VideoMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "background", "pattern", "font", "opacity", "hoverClick"],
    tools: props => [
      <NameNodeController key="videoNameController" position="top" align="end" placement="start" />,
      <HoverNodeController
        key="videoHoverController"
        position="top"
        align="start"
        placement="end"
        alt={{
          position: "bottom",
          align: "start",
          placement: "start",
        }}
      />,
      <DeleteNodeController key="videoDelete" />,
    ],
    presets: [
      {
        label: "Video",
        props: {
          className: "w-full h-full flex overflow-hidden",
        },
      },
    ],
  },
  { __internal: true }
);
