/** Container — Component definition via defineComponent(). */
import React from "react";
import { Element } from "@craftjs/core";
import {
  TbAlertTriangle,
  TbBadge,
  TbChartBar,
  TbContainer,
  TbLayoutColumns,
  TbLayoutRows,
  TbSection,
  TbUserCircle,
} from "react-icons/tb";
import {
  ContainerMainTab,
  HeaderFooterToggles,
} from "../chrome/toolbar/unified-settings/mainTabs/ContainerMainTab";
import { defineComponent } from "../define";
import {
  ariaAttrs,
  getInlineStyle,
  handlerAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../utils/static-html";
import { Container } from "./Container";
import { layoutCanvasCanMoveIn } from "./layoutCanvasCanMoveIn";
import { ContainerPaddingOverlay } from "./ContainerPaddingOverlay";
import { Text } from "./Text";
import { Image } from "./Image";

export const toHTML: ToHTMLFn = (props, children, ctx) => {
  if (props.type === "component") return "";

  let t = "div";
  if (props.type === "page") t = "article";
  else if (props.type === "section") t = "section";
  else if (props.type === "header") t = "header";
  else if (props.type === "footer") t = "footer";
  else if (props.type === "nav") t = "nav";
  else if (props.type === "aside") t = "aside";
  else if (props.type === "main") t = "main";
  else if (props.type === "form") t = "form";
  else if (props.type === "details") t = "details";
  else if (props.type === "summary") t = "summary";
  else if (props.type === "label") t = "label";

  const attrs: Record<string, any> = {
    class: staticClasses(props, ctx) || undefined,
    style: getInlineStyle(props) || undefined,
    id: props.id || props.anchor || undefined,
    ...ariaAttrs(props),
    ...handlerAttrs(props),
    action: t === "form" ? props.action || "" : undefined,
    method: t === "form" ? props.method || "POST" : undefined,
    open: t === "details" && props.open ? "" : undefined,
    "data-tab-group": props.tabGroup || undefined,
  };

  // Horizontal scroll section: wrap children in sticky viewport + flex track
  if (props.scrollEffect === "horizontal-scroll") {
    attrs["data-scroll-effect"] = "horizontal-scroll";
    attrs["data-scroll-direction"] = props.scrollDirection || "ltr";
    attrs["data-scroll-speed"] = String(props.scrollSpeed ?? 1.5);
    attrs["data-scroll-smoothing"] = String(props.scrollSmoothing ?? 0.8);
    attrs["data-scroll-snap"] = String(!!props.scrollSnap);
    ctx.classes.add("ph-hscroll");
    const inner =
      `<div class="ph-hscroll-sticky" style="height:100vh;overflow:hidden">` +
      `<div class="ph-hscroll-track" style="display:flex;height:100%;will-change:transform">${children}</div>` +
      `</div>`;
    return tag(t, attrs, inner);
  }

  // Scroll timeline section: pin + per-child animations via data attributes
  if (props.scrollEffect === "scroll-timeline") {
    attrs["data-scroll-effect"] = "scroll-timeline";
    attrs["data-scroll-runway"] = String(props.scrollTimelineRunway ?? 3);
    attrs["data-scroll-smoothing"] = String(props.scrollSmoothing ?? 0.8);
    ctx.classes.add("ph-scroll-timeline");
    return tag(t, attrs, children);
  }

  const overflow = props.overflow || {};
  const overflowUx =
    (overflow.dragScroll || overflow.autoHide) && props.scrollEffect !== "horizontal-scroll";
  if (overflowUx) {
    const baseClass = attrs.class || "";
    if (!/\boverflow-x-[^\s]+/.test(baseClass)) {
      attrs.class = [baseClass, "overflow-x-auto"].filter(Boolean).join(" ");
      ctx.classes.add("overflow-x-auto");
    }
    ctx.classes.add("ph-overflow-site");
    if (overflow.dragScroll) {
      attrs["data-ph-overflow-drag"] = "";
      const rawS = overflow.smoothing;
      const n =
        typeof rawS === "number" ? rawS : typeof rawS === "string" ? parseFloat(rawS) : NaN;
      const sm = Number.isNaN(n) ? 0 : Math.min(0.5, Math.max(0, n));
      if (sm > 0) attrs["data-ph-overflow-smooth"] = String(sm);
    }
    if (overflow.autoHide) {
      attrs["data-ph-overflow-autohide"] = "";
      ctx.classes.add("ph-overflow-hide-native-scrollbar");
      attrs.class = [attrs.class, "ph-overflow-hide-native-scrollbar"].filter(Boolean).join(" ");
    }
    if (overflow.dragScroll && overflow.wheelHorizontal !== false) {
      attrs["data-ph-overflow-wheel"] = "";
    }
    attrs["data-ph-overflow-hide-delay"] = String(overflow.hideDelay ?? 1000);
  }

  return tag(t, attrs, children);
};

function buildSectionChildren() {
  return [
    <Element
      key="content"
      canvas
      is={Container}
      custom={{ displayName: "Content" }}
      canDelete={true}
      canEditName={true}
      className="flex flex-col gap-space-md w-full max-w-page mx-auto"
    />,
  ];
}

function buildAvatarChildren() {
  return [
    <Element
      key="img"
      is={Image}
      custom={{ displayName: "Photo" }}
      canDelete={true}
      canEditName={true}
      className="w-full h-full object-cover"
    />,
  ];
}

const alertSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

function buildAlertChildren() {
  return [
    <Element
      key="icon"
      is={Text}
      custom={{ displayName: "Icon" }}
      text={`<span class="shrink-0">${alertSvg}</span>`}
      canDelete={true}
      canEditName={true}
    />,
    <Element
      key="text"
      is={Text}
      custom={{ displayName: "Message" }}
      text="<span>This is an important message for your visitors.</span>"
      canDelete={true}
      canEditName={true}
    />,
  ];
}

function buildStatChildren() {
  return [
    <Element
      key="value"
      is={Text}
      custom={{ displayName: "Value" }}
      text="2,400+"
      className="text-4xl font-bold font-heading text-primary"
      canDelete={true}
      canEditName={true}
    />,
    <Element
      key="label"
      is={Text}
      custom={{ displayName: "Label" }}
      text="Happy Customers"
      className="text-sm text-base-content/60"
      canDelete={true}
      canEditName={true}
    />,
  ];
}

/**
 * Extra Container-based presets for the "Components" toolbox category.
 * Same pattern as NAV_EXTRA_PRESETS — Container element, separate category.
 */
export const COMPONENT_EXTRA_PRESETS = [
  {
    label: "Badge",
    description: "Small label pill for tags, status, or categories.",
    icon: TbBadge,
    element: Container,
    props: { className: "badge badge-primary font-medium self-start" },
    children: () => [
      <Element
        key="label"
        is={Text}
        custom={{ displayName: "Label" }}
        text="New"
        canDelete={true}
        canEditName={true}
      />,
    ],
  },
  {
    label: "Avatar",
    description: "Circular image for profile photos or team members.",
    icon: TbUserCircle,
    element: Container,
    props: { className: "w-16 h-16 rounded-full overflow-hidden shrink-0" },
    children: buildAvatarChildren,
  },
  {
    label: "Alert",
    description: "Notification banner with icon and message.",
    icon: TbAlertTriangle,
    element: Container,
    props: { className: "alert alert-info flex flex-row items-center gap-space-xs w-full" },
    children: buildAlertChildren,
  },
  {
    label: "Stat",
    description: "Number + label pair for counters and metrics.",
    icon: TbChartBar,
    element: Container,
    props: { className: "flex flex-col items-center gap-space-xs text-center" },
    children: buildStatChildren,
  },
];

export const ContainerDef = defineComponent(
  {
    name: "Container",
    component: Container,
    icon: TbContainer,
    category: "Layout",
    canvas: true,
    settings: ContainerMainTab,
    toolbarExtra: <HeaderFooterToggles />,
    toHTML,
    tools: () => [<ContainerPaddingOverlay key="padding-overlay" />],
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: (node, into) => layoutCanvasCanMoveIn(node, into),
    },
    presets: [
      {
        label: "Section",
        icon: TbSection,
        description: "Full-width page section with padding and a centered content wrapper.",
        props: {
          type: "section",
          className:
            "bg-base-100 text-base-content w-full flex flex-col items-center py-space-lg px-container-x",
        },
        children: buildSectionChildren,
      },
      {
        label: "Row",
        icon: TbLayoutColumns,
        description: "Horizontal flex layout. Smart defaults based on where you drop it.",
        props: {
          className: "flex flex-row flex-wrap gap-space-md items-start min-w-0 w-full",
        },
      },
      {
        label: "Column",
        icon: TbLayoutRows,
        description: "Vertical flex layout. Smart defaults based on where you drop it.",
        props: { className: "flex flex-col gap-space-md w-full" },
      },
    ],
    modifiers: [
      // Composite patterns (real CSS classes via @utility in @pagehub/daisyui-spatial)
      // DaisyUI component classes go in `requires` — auto-added alongside the modifier.
      {
        name: "section-wrapper",
        label: "Section",
        category: "Pattern",
        description: "Full-width section with standard vertical padding and max-width content area",
      },
      {
        name: "section-wrapper-dark",
        label: "Section Dark",
        category: "Pattern",
        description: "Full-width dark section — dark background with light text, standard padding",
      },
      {
        name: "card-surface",
        label: "Card Surface",
        category: "Pattern",
        description: "Raised card with border, shadow, rounded corners, and padding",
        requires: "card",
      },
      {
        name: "icon-row",
        label: "Icon Row",
        category: "Pattern",
        description: "Horizontal flex row with gap — good for icon + label pairs",
      },
      {
        name: "content-col",
        label: "Content Column",
        category: "Pattern",
        description: "Vertical flex column with gap — good for stacked headings, copy, and CTAs",
      },
      {
        name: "hero-content-centered",
        label: "Hero Content",
        category: "Pattern",
        description:
          "Centered hero content with max-width constraint — use inside a hero container",
        requires: "hero-content",
      },
      // DaisyUI component roles
      {
        name: "card",
        label: "Card",
        category: "DaisyUI",
        description: "DaisyUI card — adds shadow, border-radius, and overflow clipping",
      },
      {
        name: "card-body",
        label: "Card Body",
        category: "DaisyUI",
        description: "Inner padding area of a DaisyUI card",
      },
      {
        name: "card-compact",
        label: "Compact Card",
        category: "DaisyUI",
        description: "Card with reduced padding — tighter than the default card-body",
      },
      {
        name: "hero",
        label: "Hero",
        category: "DaisyUI",
        description: "DaisyUI hero — full-width flex container with centered content layout",
      },
      {
        name: "hero-content",
        label: "Hero Content",
        category: "DaisyUI",
        description: "Inner content wrapper for a hero — constrains width and centers children",
      },
      {
        name: "hero-overlay",
        label: "Hero Overlay",
        category: "DaisyUI",
        description:
          "Dark semi-transparent overlay — place over a background image to improve text contrast",
      },
      {
        name: "navbar",
        label: "Navbar",
        category: "DaisyUI",
        description: "DaisyUI navbar — horizontal bar with padding and flex layout for nav items",
      },
      {
        name: "drawer",
        label: "Drawer",
        category: "DaisyUI",
        description: "DaisyUI drawer root — used for slide-in side panel layouts",
      },
      {
        name: "modal-box",
        label: "Modal Box",
        category: "DaisyUI",
        description: "DaisyUI modal content box — centered dialog with shadow and padding",
      },
      {
        name: "collapse",
        label: "Collapse",
        category: "DaisyUI",
        description: "DaisyUI collapsible container — children toggle open/closed",
      },
      {
        name: "collapse-title",
        label: "Collapse Title",
        category: "DaisyUI",
        description: "Clickable title row that toggles the collapse open or closed",
      },
      {
        name: "collapse-content",
        label: "Collapse Content",
        category: "DaisyUI",
        description: "Hidden content area that expands when the collapse is open",
      },
      // Spacing (spatial tokens)
      {
        name: "p-space-xs",
        label: "XS Padding",
        category: "Padding",
        description: "Extra-small padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-sm",
        label: "SM Padding",
        category: "Padding",
        description: "Small padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-md",
        label: "MD Padding",
        category: "Padding",
        description: "Medium padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-lg",
        label: "LG Padding",
        category: "Padding",
        description: "Large padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-xl",
        label: "XL Padding",
        category: "Padding",
        description: "Extra-large padding on all sides using the density-aware spatial scale",
      },
      // Width
      {
        name: "w-full",
        label: "Full",
        category: "Width",
        description: "Stretches to 100% of the parent width",
      },
      { name: "w-1/2", label: "Half", category: "Width", description: "50% of the parent width" },
      { name: "w-1/3", label: "Third", category: "Width", description: "33% of the parent width" },
      {
        name: "w-2/3",
        label: "Two Thirds",
        category: "Width",
        description: "66% of the parent width",
      },
      // Height
      {
        name: "min-h-screen",
        label: "Full Screen",
        category: "Height",
        description: "Minimum height of 100vh — good for full-page hero sections",
      },
      {
        name: "min-h-[50vh]",
        label: "Half Screen",
        category: "Height",
        description: "Minimum height of 50vh — good for mid-sized hero sections",
      },
      // Layout
      {
        name: "mx-auto",
        label: "Centered",
        category: "Layout",
        description: "Centers a block element horizontally using auto left/right margins",
      },
      {
        name: "overflow-hidden",
        label: "Clip Overflow",
        category: "Layout",
        description:
          "Clips content to the container bounds — required when using rounded corners with images",
      },
      {
        name: "items-center",
        label: "Center Items",
        category: "Layout",
        description: "Vertically centers flex children (cross-axis alignment)",
      },
      {
        name: "justify-center",
        label: "Center Content",
        category: "Layout",
        description: "Horizontally centers flex children (main-axis alignment)",
      },
      // Color surfaces
      {
        name: "bg-base-100",
        label: "Base 100",
        category: "Surface",
        description: "Primary page background color",
        exclusive: true,
      },
      {
        name: "bg-base-200",
        label: "Base 200",
        category: "Surface",
        description: "Slightly raised surface — good for cards and sidebars",
        exclusive: true,
      },
      {
        name: "bg-base-content",
        label: "Dark",
        category: "Surface",
        description:
          "High-contrast dark background using the content color — use text-base-100 for text",
        exclusive: true,
      },
      {
        name: "bg-primary",
        label: "Primary",
        category: "Surface",
        description: "Primary brand color background — use text-primary-content for text",
        exclusive: true,
      },
      {
        name: "bg-secondary",
        label: "Secondary",
        category: "Surface",
        description: "Secondary brand color background — use text-secondary-content for text",
        exclusive: true,
      },
      {
        name: "bg-accent",
        label: "Accent",
        category: "Surface",
        description: "Accent color background — use text-accent-content for text",
        exclusive: true,
      },
      {
        name: "bg-neutral",
        label: "Neutral",
        category: "Surface",
        description: "Neutral dark background — use text-neutral-content for text",
        exclusive: true,
      },
    ],
  },
  { __internal: true }
);
