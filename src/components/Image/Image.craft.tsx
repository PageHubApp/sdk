/**
 * Image — Component definition via defineComponent()
 */
import { TbPhoto } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { Image } from "./Image";
import { toHTML } from "./Image.toHTML";
import { lazyNamed } from "../../utils/lazyNamed";

const ImageMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/ImageMainTab"),
  "ImageMainTab",
);
import { ImageGroupSettings } from "../../chrome/toolbar/inspector/ImageGroupSettings";

export { toHTML };

export const ImageDef = defineComponent(
  {
    name: "Image",
    component: Image,
    icon: TbPhoto,
    category: "Images",
    settings: ImageMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "background", "pattern", "font", "opacity"],
    hoverClickVariant: "link",
    rules: {
      canDrag: () => true,
      canMoveIn: () => false,
    },
    groupSettings: ImageGroupSettings,
  },
  { __internal: true }
);
