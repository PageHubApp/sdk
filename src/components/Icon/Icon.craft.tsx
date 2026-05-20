/**
 * Icon — Standalone decorative/semantic icon. Renders inline SVG (react-icons) or
 * a media-library image. No actions — if clickable is needed, wrap in Container/Button.
 */
import { TbBolt, TbIcons, TbStarFilled } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { Icon } from "./Icon";
import { toHTML } from "./Icon.toHTML";
import { lazyNamed } from "../../utils/lazyNamed";

const IconMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/IconMainTab"),
  "IconMainTab",
);

export { toHTML };

export const IconDef = defineComponent(
  {
    name: "Icon",
    component: Icon,
    icon: TbIcons,
    category: "Icons",
    settings: IconMainTab,
    toHTML,
    disable: ["opacity"],
    rules: {
      canDrag: () => true,
    },
  },
  { __internal: true }
);
