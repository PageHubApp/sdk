/**
 * Audio — Component definition via defineComponent()
 */
import { TbMusic } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { lazyNamed } from "../../utils/lazyNamed";
import { Audio } from "./Audio";
import { toHTML } from "./Audio.toHTML";

export { toHTML };

const AudioMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/AudioMainTab"),
  "AudioMainTab",
);
import {
  NameNodeController,
  HoverNodeController,
  DeleteNodeController,
} from "../../chrome/editor-chrome";

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
  },
  { __internal: true }
);
