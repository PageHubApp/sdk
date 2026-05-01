/** Image — presets extracted from Image.craft.tsx. */
import { Image } from "./Image";
import type { ComponentPreset } from "../../define/types";
import { registerPresets } from "../../define/catalogRegistry";

export const imagePresets: ComponentPreset[] = [
      {
        label: "Image",
        description: "A picture that scales to fit its slot.",
        props: {
          type: "cdn",
          className: "object-cover flex overflow-hidden md:h-auto",
        },
      },
];

registerPresets("Image", imagePresets);
