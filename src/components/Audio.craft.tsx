/**
 * Audio — Component definition via defineComponent()
 */
import React from "react";
import { TbMusic } from "react-icons/tb";
import { defineComponent } from "../define";
import { Audio } from "./Audio";
import { staticClasses, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const audioUrl = props.src ?? props.audioUrl;
  const { title, controls = true, loop = false } = props;
  if (!audioUrl) return "";

  const cls = staticClasses(props, ctx);
  const audio = tag(
    "audio",
    {
      src: audioUrl,
      class: cls || undefined,
      controls,
      loop,
      preload: "metadata",
      style: "width: 100%",
    },
    "Your browser does not support the audio element."
  );

  return tag(
    "div",
    {
      role: "region",
      "aria-label": title || `Audio: ${audioUrl}`,
      ...ariaAttrs(props),
    },
    audio
  );
};
import { AudioMainTab } from "../chrome/toolbar/unified-settings/mainTabs/AudioMainTab";
import { NameNodeController, HoverNodeController, DeleteNodeController } from "./editor-chrome";

export const AudioDef = defineComponent(
  {
    name: "Audio",
    description: "An audio player you can drop a track into.",
    component: Audio,
    icon: TbMusic,
    category: "Media",
    settings: AudioMainTab,
    toHTML,
    disable: [
      "textColor",
      "bgColor",
      "background",
      "pattern",
      "font",
      "border",
      "opacity",
      "hoverClick",
    ],
    tools: props => [
      <NameNodeController key="audioNameController" position="top" align="end" placement="start" />,
    ],
    presets: [
      {
        label: "Audio",
        props: {
          className: "w-full flex",
        },
      },
    ],
  },
  { __internal: true }
);
