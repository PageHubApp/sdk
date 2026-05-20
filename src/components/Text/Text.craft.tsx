/**
 * Text — Component definition via defineComponent()
 */
import { TbLetterT } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { HoverNodeController } from "../../chrome/editor-chrome";
import { Text } from "./Text";
import { toHTML } from "./Text.toHTML";
import { lazyNamed } from "../../utils/lazyNamed";

const TextMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/TextMainTab"),
  "TextMainTab",
);

export { toHTML };

export const TextDef = defineComponent(
  {
    name: "Text",
    component: Text,
    icon: TbLetterT,
    category: "Text",
    settings: TextMainTab,
    defaultProps: {
      richText: { mode: "full" },
    },
    toHTML,
    disable: [
      "bgColor",
      "background",
      "pattern",
      "border",
      "shadow",
      "radius",
      "opacity",
      "cursor",
      "accessibility",
      "alignment",
      "size",
    ],
    hoverClickVariant: "text",
    rules: {
      canDrag: () => true,
      canMoveIn: () => false,
    },
    tools: [],
  },
  { __internal: true }
);
