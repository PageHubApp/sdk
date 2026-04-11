/** Container — Component definition via defineComponent() (no canvas inline tool controllers). */
import { TbContainer, TbLayoutColumns, TbLayoutRows } from "react-icons/tb";
import { ContainerMainTab, HeaderFooterToggles } from "../chrome/Toolbar/UnifiedSettings/mainTabs/ContainerMainTab";
import { defineComponent } from "../define";
import { ariaAttrs, getInlineStyle, staticClasses, tag, type ToHTMLFn } from "../utils/static-html";
import { Container } from "./Container";

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

  const attrs: Record<string, any> = {
    class: staticClasses(props, ctx) || undefined,
    style: getInlineStyle(props) || undefined,
    id: props.id || props.anchor || undefined,
    ...ariaAttrs(props),
    action: t === "form" ? (props.action || "") : undefined,
    method: t === "form" ? (props.method || "POST") : undefined,
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

  return tag(t, attrs, children);
};

const SECTION_PARENTS = new Set(["page", "component", "header", "footer"]);

const canMoveIn = (nodes: any[], into: any) => {
  if (!into?.data) return true;
  return nodes.every(node => {
    if (node?.data?.props?.type === "form") {
      if (into.data?.props?.type === "form") return false;
    }
    if (node?.data?.props?.type === "page") {
      return into.id === "ROOT";
    }
    // Blocks/sections can only go into pages, components, headers, or footers
    if (node?.data?.props?.type === "section") {
      return SECTION_PARENTS.has(into.data?.props?.type);
    }
    return true;
  });
};

export const ContainerDef = defineComponent({
  name: "Container",
  component: Container,
  icon: TbContainer,
  category: "Layout",
  canvas: true,
  settings: ContainerMainTab,
  toolbarExtra: <HeaderFooterToggles />,
  toHTML,
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: (node, into) => canMoveIn(node, into),
  },
  tools: () => [],
  presets: [
    {
      label: "Row",
      icon: TbLayoutColumns,
      props: {
        className: "flex flex-row flex-wrap gap-space-md items-start min-w-0 w-full",
      },
    },
    {
      label: "Column",
      icon: TbLayoutRows,
      props: { className: "flex flex-col gap-space-md w-full" },
    },
  ],
  modifiers: [
    // Composite patterns (real CSS classes via @utility in daisyui-spatial)
    // DaisyUI component classes go in `requires` — auto-added alongside the modifier.
    { name: "section-wrapper", label: "Section", category: "Pattern" },
    { name: "section-wrapper-dark", label: "Section Dark", category: "Pattern" },
    { name: "card-surface", label: "Card Surface", category: "Pattern", requires: "card" },
    { name: "icon-row", label: "Icon Row", category: "Pattern" },
    { name: "content-col", label: "Content Column", category: "Pattern" },
    { name: "hero-content-centered", label: "Hero Content", category: "Pattern", requires: "hero-content" },
    // DaisyUI component roles
    { name: "card", label: "Card", category: "DaisyUI" },
    { name: "card-body", label: "Card Body", category: "DaisyUI" },
    { name: "card-compact", label: "Compact Card", category: "DaisyUI" },
    { name: "hero", label: "Hero", category: "DaisyUI" },
    { name: "hero-content", label: "Hero Content", category: "DaisyUI" },
    { name: "hero-overlay", label: "Hero Overlay", category: "DaisyUI" },
    { name: "navbar", label: "Navbar", category: "DaisyUI" },
    { name: "drawer", label: "Drawer", category: "DaisyUI" },
    { name: "modal-box", label: "Modal Box", category: "DaisyUI" },
    { name: "collapse", label: "Collapse", category: "DaisyUI" },
    { name: "collapse-title", label: "Collapse Title", category: "DaisyUI" },
    { name: "collapse-content", label: "Collapse Content", category: "DaisyUI" },
    // Spacing (spatial tokens)
    { name: "p-space-xs", label: "XS Padding", category: "Padding" },
    { name: "p-space-sm", label: "SM Padding", category: "Padding" },
    { name: "p-space-md", label: "MD Padding", category: "Padding" },
    { name: "p-space-lg", label: "LG Padding", category: "Padding" },
    { name: "p-space-xl", label: "XL Padding", category: "Padding" },
    // Width
    { name: "w-full", label: "Full", category: "Width" },
    { name: "w-1/2", label: "Half", category: "Width" },
    { name: "w-1/3", label: "Third", category: "Width" },
    { name: "w-2/3", label: "Two Thirds", category: "Width" },
    // Height
    { name: "min-h-screen", label: "Full Screen", category: "Height" },
    { name: "min-h-[50vh]", label: "Half Screen", category: "Height" },
    // Layout
    { name: "mx-auto", label: "Centered", category: "Layout" },
    { name: "overflow-hidden", label: "Clip Overflow", category: "Layout" },
    { name: "items-center", label: "Center Items", category: "Layout" },
    { name: "justify-center", label: "Center Content", category: "Layout" },
    // Color surfaces
    { name: "bg-base-100", label: "Base 100", category: "Surface", exclusive: true },
    { name: "bg-base-200", label: "Base 200", category: "Surface", exclusive: true },
    { name: "bg-base-content", label: "Dark", category: "Surface", exclusive: true },
    { name: "bg-primary", label: "Primary", category: "Surface", exclusive: true },
    { name: "bg-secondary", label: "Secondary", category: "Surface", exclusive: true },
    { name: "bg-accent", label: "Accent", category: "Surface", exclusive: true },
    { name: "bg-neutral", label: "Neutral", category: "Surface", exclusive: true },
  ],
}, { __internal: true });
