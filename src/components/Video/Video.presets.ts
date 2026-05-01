/** Video — presets extracted from Video.craft.tsx. */
import { Video } from "./Video";
import type { ComponentPreset } from "../../define/types";
import { registerPresets } from "../../define/catalogRegistry";

export const videoPresets: ComponentPreset[] = [
      {
        label: "Video",
        description: "Embed a video from YouTube, Vimeo, or similar.",
        props: {
          className: "w-full h-full flex overflow-hidden",
        },
      },
];

registerPresets("Video", videoPresets);
