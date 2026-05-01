/** Audio — presets extracted from Audio.craft.tsx. */
import { Audio } from "./Audio";
import type { ComponentPreset } from "../../define/types";
import { registerPresets } from "../../define/catalogRegistry";

export const audioPresets: ComponentPreset[] = [
      {
        label: "Audio",
        props: {
          className: "w-full flex",
        },
      },
];

registerPresets("Audio", audioPresets);
