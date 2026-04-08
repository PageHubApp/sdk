/**
 * Container — Component definition via defineComponent()
 *
 * The most complex built-in: conditional inline tools based on node type,
 * drag-adjust handles for margins/padding/size, and toolbox presets for
 * Row and Column layouts.
 */
import { TbContainer, TbLayoutColumns, TbLayoutRows } from "react-icons/tb";
import {
  ContainerMainTab,
  ContainerMainTabAdvanced,
  HeaderFooterToggles,
} from "../chrome/Toolbar/UnifiedSettings/mainTabs/ContainerMainTab";
import { defineComponent } from "../define";
import { ariaAttrs, getInlineStyle, staticClasses, tag, type ToHTMLFn } from "../utils/static-html";
import { Container } from "./Container";
import {
  ContainerSettingsTopNodeTool,
  DragAdjustNodeController,
  HoverNodeController,
  NameNodeController,
  ToolNodeController,
  UniformPaddingNodeController,
} from "./editor-chrome";

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

  return tag(t, {
    class: staticClasses(props, ctx) || undefined,
    style: getInlineStyle(props) || undefined,
    id: props.anchor || props.id || undefined,
    ...ariaAttrs(props),
    action: t === "form" ? (props.action || "") : undefined,
    method: t === "form" ? (props.method || "POST") : undefined,
    open: t === "details" && props.open ? "" : undefined,
    "data-tab-group": props.tabGroup || undefined,
  }, children);
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
  advancedSettings: ContainerMainTabAdvanced,
  toolbarExtra: <HeaderFooterToggles />,
  toHTML,
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: (node, into) => canMoveIn(node, into),
  },
  tools: props => {
    const isLinked = props.belongsTo && props.relationType !== "style";

    const baseControls = [
      <NameNodeController
        key="container1"
        position="top"
        align="start"
        placement="end"
        alt={{
          position: "bottom",
          align: "start",
          placement: "start",
        }}
      />,
      <HoverNodeController
        key="container2"
        position="top"
        align="start"
        placement="end"
        alt={{
          position: "bottom",
          align: "start",
          placement: "start",
        }}
      />,
    ];

    if (props.type === "page" || isLinked) {
      return baseControls;
    }

    return [
      ...baseControls,
      <DragAdjustNodeController
        key="containerdrag1"
        position="top"
        align="end"
        direction="vertical"
        propVar="mt"
        styleToUse="marginTop"
        tooltip="Drag to adjust margin"
      />,
      <DragAdjustNodeController
        key="containerdrag2"
        position="bottom"
        align="end"
        direction="vertical"
        propVar="height"
        styleToUse="height"
        tooltip="Drag to adjust height"
      />,
      <DragAdjustNodeController
        key="containerdrag3"
        position="right"
        align="end"
        direction="horizontal"
        propVar="width"
        styleToUse="width"
        gridSnap={12}
        tooltip="Drag to adjust width"
      />,
      <DragAdjustNodeController
        key="paddingdrag1"
        position="top"
        align="middle"
        direction="vertical"
        propVar="pt"
        styleToUse="paddingTop"
        tooltip="Drag to adjust top padding"
        isPadding={true}
      />,
      <DragAdjustNodeController
        key="paddingdrag2"
        position="bottom"
        align="start"
        direction="vertical"
        propVar="pb"
        styleToUse="paddingBottom"
        tooltip="Drag to adjust bottom padding"
        isPadding={true}
      />,
      <DragAdjustNodeController
        key="paddingdrag3"
        position="left"
        align="middle"
        direction="horizontal"
        propVar="pl"
        styleToUse="paddingLeft"
        tooltip="Drag to adjust left padding"
        isPadding={true}
      />,
      <DragAdjustNodeController
        key="paddingdrag4"
        position="right"
        align="middle"
        direction="horizontal"
        propVar="pr"
        styleToUse="paddingRight"
        tooltip="Drag to adjust right padding"
        isPadding={true}
      />,
      <UniformPaddingNodeController key="uniformpadding" />,
      <ToolNodeController
        position="top"
        align="middle"
        placement="start"
        key="containercontroller1"
      >
        <ContainerSettingsTopNodeTool />
      </ToolNodeController>,
    ];
  },
  presets: [
    {
      label: "Row",
      icon: TbLayoutColumns,
      props: { className: "w-full" },
    },
    {
      label: "Column",
      icon: TbLayoutRows,
      props: { className: "w-full" },
    },
  ],
  modifiers: [
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
