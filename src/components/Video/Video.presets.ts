/** Video — presets extracted from Video.craft.tsx. */
import { Video } from "./Video";
import type { ComponentPreset } from "../../define/types";

export const videoPresets: ComponentPreset[] = [
      {
        label: "Video",
        description: "Embed a video from YouTube, Vimeo, or similar.",
        props: {
          className: "w-full h-full flex overflow-hidden",
        },
      },
];
