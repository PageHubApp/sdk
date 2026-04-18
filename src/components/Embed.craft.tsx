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
import { defineComponent } from "../define";
import { Embed, resolveEmbedHTML } from "./Embed";
import { staticClasses, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

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

import { EmbedMainTab } from "../chrome/toolbar/unified-settings/mainTabs/EmbedMainTab";
import { HoverNodeController, NameNodeController, DeleteNodeController } from "./editor-chrome";

export const EmbedDef = defineComponent(
  {
    name: "Embed",
    description: "Embed a third-party service or custom HTML.",
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
    presets: [
      {
        label: "Custom HTML",
        icon: TbCode,
        props: { service: "custom", className: "w-full" },
      },
      {
        label: "Calendly",
        icon: TbCalendarEvent,
        props: { service: "calendly", className: "w-full" },
      },
      {
        label: "Cal.com",
        icon: TbCalendar,
        props: { service: "cal", className: "w-full" },
      },
      {
        label: "Stripe",
        icon: TbCreditCard,
        props: { service: "stripe", className: "w-full" },
      },
      {
        label: "Gumroad",
        icon: TbShoppingBag,
        props: { service: "gumroad", className: "w-full" },
      },
      {
        label: "Ko-fi",
        icon: TbCoffee,
        props: { service: "kofi", className: "w-full" },
      },
      {
        label: "Typeform",
        icon: TbForms,
        props: { service: "typeform", className: "w-full" },
      },
      {
        label: "Tally",
        icon: TbClipboardList,
        props: { service: "tally", className: "w-full" },
      },
      {
        label: "Mailchimp",
        icon: TbMail,
        props: { service: "mailchimp", className: "w-full" },
      },
      {
        label: "Spotify",
        icon: TbBrandSpotify,
        props: { service: "spotify", className: "w-full" },
      },
      {
        label: "Instagram",
        icon: TbBrandInstagram,
        props: { service: "instagram", className: "w-full" },
      },
      {
        label: "Twitter / X",
        icon: TbBrandX,
        props: { service: "twitter", className: "w-full" },
      },
      {
        label: "Google Calendar",
        icon: TbCalendarTime,
        props: { service: "google-calendar", className: "w-full" },
      },
      {
        label: "Crisp Chat",
        icon: TbMessageCircle,
        props: { service: "crisp", className: "w-full" },
      },
    ],
  },
  { __internal: true }
);
