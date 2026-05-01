/** Icon — presets extracted from Icon.craft.tsx. */
import { TbBolt, TbIcons, TbStarFilled } from "react-icons/tb";
import { Icon } from "./Icon";
import type { ComponentPreset } from "../../define/types";
import { registerPresets } from "../../define/catalogRegistry";

export const iconPresets: ComponentPreset[] = [
      {
        label: "Icon",
        icon: TbStarFilled,
        description: "A small standalone icon.",
        props: {
          value: "ref-icon:tb/TbStar",
          className: "size-6",
        },
      },
      {
        label: "Large Icon",
        icon: TbBolt,
        description: "A bigger icon for feature tiles or hero badges.",
        props: {
          value: "ref-icon:tb/TbBolt",
          className: "size-12 text-primary",
        },
      },
];

registerPresets("Icon", iconPresets);
