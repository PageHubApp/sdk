/**
 * Video — Component definition via defineComponent()
 */
import { TbVideo } from "react-icons/tb";
import {
  DeleteNodeController,
  HoverNodeController,
  NameNodeController,
} from "../../chrome/editor-chrome";
import { defineComponent } from "../../define/defineComponent";
import { Video } from "./Video";
import { toHTML } from "./Video.toHTML";
import { lazyNamed } from "../../utils/lazyNamed";

const VideoMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/VideoMainTab"),
  "VideoMainTab",
);

export { toHTML };

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
    ],
  },
  { __internal: true }
);
