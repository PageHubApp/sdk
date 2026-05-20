/**
 * Embed — Component definition via defineComponent()
 */
import {
  TbBrandInstagram,
  TbBrandSpotify,
  TbBrandX,
  TbCalendar,
  TbCalendarEvent,
  TbCalendarTime,
  TbClipboardList,
  TbCode,
  TbCoffee,
  TbCreditCard,
  TbForms,
  TbMail,
  TbMessageCircle,
  TbShoppingBag,
} from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { lazyNamed } from "../../utils/lazyNamed";
import { Embed } from "./Embed";
import { toHTML } from "./Embed.toHTML";

export { toHTML };

const EmbedMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/EmbedMainTab"),
  "EmbedMainTab",
);
import {
  HoverNodeController,
  NameNodeController,
  DeleteNodeController,
} from "../../chrome/editor-chrome";

export const EmbedDef = defineComponent(
  {
    name: "Embed",
    description: "Drop in custom HTML or a third-party widget.",
    component: Embed,
    icon: TbCode,
    category: "Embeds",
    settings: EmbedMainTab,
    toHTML,
    disable: [
      "textColor",
      "bgColor",
      "background",
      "pattern",
      "font",
      "border",
      "opacity",
      "hoverClick",
    ],
    toolbarLayout: "hidden",
    rules: {
      canDrag: () => true,
      canMoveIn: () => false,
    },
    tools: props => [
      <NameNodeController key="embedNameController" position="top" align="end" placement="start" />,
    ],
  },
  { __internal: true }
);
