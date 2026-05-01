/** Button — toolbox presets. */
import type { ComponentPreset } from "../../define/types";
import { registerPresets } from "../../define/catalogRegistry";

export const buttonPresets: ComponentPreset[] = [
  {
    label: "Button",
    description: "A clickable button — your main call-to-action.",
    props: {
      text: "Button",
      className:
        "btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold self-start",
    },
  },
];

registerPresets("Button", buttonPresets);
