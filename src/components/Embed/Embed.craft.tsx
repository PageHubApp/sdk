/**
 * Embed — Component definition via defineComponent()
 */
import React from "react";
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
import { Embed, resolveEmbedHTML } from "./Embed";
import { staticClasses, tag, ariaAttrs, type ToHTMLFn } from "../../utils/staticHtml";

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const html = resolveEmbedHTML(props);

  if (!html) return "";
  const cls = staticClasses(props, ctx);
  return tag(
    "div",
    {
      class: cls || undefined,
      role: "region",
      "aria-label": props.title || "Embedded content",
      ...ariaAttrs(props),
    },
    html
  );
};

const EmbedMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/EmbedMainTab").then(mod => ({
    default: mod.EmbedMainTab,
  }))
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
