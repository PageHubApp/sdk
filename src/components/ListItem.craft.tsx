/**
 * ListItem — Single row for List (text + marker).
 */
import React from "react";
import { TbListDetails } from "react-icons/tb";
import { defineComponent } from "../define";
import { ListItem } from "./ListItem";
import { resolveIconSvgSync } from "../utils/icons/serverResolve";
import {
  staticClasses,
  getInlineStyle,
  tag,
  ariaAttrs,
  escapeAttr,
  escapeHTML,
  type ToHTMLFn,
  type StaticRenderContext,
} from "../utils/static-html";
import type { ListMarkerStyle } from "./List";
import { ListItemMainTab } from "../chrome/toolbar/unified-settings/mainTabs/ListItemMainTab";
import { HoverNodeController, DeleteNodeController, SelectListTool } from "./editor-chrome";

function resolveName(n: { type?: { resolvedName?: string } } | undefined): string {
  if (!n?.type) return "";
  return typeof n.type === "string" ? n.type : n.type.resolvedName || "";
}

function staticMarkerHtml(
  ordered: boolean,
  marker: ListMarkerStyle,
  icon?: { value?: string; size?: string }
): string {
  if (ordered) return "";
  switch (marker) {
    case "bullet":
      return `<span aria-hidden="true" class="text-base-content/80 mt-0.5 shrink-0 select-none">&bull;</span>`;
    case "dash":
      return `<span aria-hidden="true" class="text-base-content/70 mt-0.5 shrink-0 select-none">&ndash;</span>`;
    case "check":
      return `<span aria-hidden="true" class="text-primary mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center font-sans" style="line-height:1">&check;</span>`;
    case "icon": {
      const raw = icon?.value;
      const sz = (icon?.size || "w-5 h-5");
      if (raw && raw.startsWith("ref-icon:")) {
        const entry = resolveIconSvgSync(raw);
        if (entry) {
          return `<span aria-hidden="true" class="${escapeAttr(sz)} shrink-0 text-primary flex items-center justify-center fill-current"><svg fill="currentColor" viewBox="${entry.viewBox}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${entry.svg}</svg></span>`;
        }
      }
      return `<span aria-hidden="true" class="text-primary mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center font-sans" style="line-height:1">&check;</span>`;
    }
    default:
      return "";
  }
}

function parentListFromCtx(ctx: StaticRenderContext): {
  ordered: boolean;
  markerStyle: ListMarkerStyle;
  markerIcon?: { value?: string; size?: string };
} | null {
  const id = ctx.renderingNodeId;
  if (!id || !ctx.nodes) return null;
  const self = ctx.nodes[id];
  const pid = self?.parent;
  if (!pid) return null;
  const parent = ctx.nodes[pid];
  if (!parent || resolveName(parent) !== "List") return null;
  const p = parent.props || {};
  return {
    ordered: !!p.ordered,
    markerStyle: (p.markerStyle || "check") as ListMarkerStyle,
    markerIcon: p.markerIcon,
  };
}

const toHTML: ToHTMLFn = (props, _children, ctx) => {
  const cls = staticClasses(props, ctx) || undefined;
  const style = getInlineStyle(props);
  const text = props.text || "";
  const parentList = parentListFromCtx(ctx);
  const ordered = parentList?.ordered === true;
  const inheritedMarker = (parentList?.markerStyle || "check") as ListMarkerStyle;
  const inheritedIcon = parentList?.markerIcon || { value: "ref-icon:tb/TbCheck", size: "w-5 h-5" };
  const effectiveMarker = (
    props.markerStyle && props.markerStyle !== "inherit" ? props.markerStyle : inheritedMarker
  ) as ListMarkerStyle;
  const effectiveIcon = {
    ...inheritedIcon,
    ...props.markerIcon,
  };

  const body = ordered
    ? text
    : `<div class="flex items-start gap-2">${staticMarkerHtml(
        false,
        effectiveMarker,
        effectiveIcon
      )}<div class="min-w-0 flex-1 text-base-content">${text}</div></div>`;

  return tag(
    "li",
    {
      class: cls || undefined,
      style: style || undefined,
      ...ariaAttrs(props),
    },
    body
  );
};

export const ListItemDef = defineComponent(
  {
    name: "ListItem",
    displayName: "List Item",
    component: ListItem,
    icon: TbListDetails,
    category: "List",
    canvas: false,
    settings: ListItemMainTab,
    toHTML,
    disable: ["textColor", "bgColor", "shadow", "opacity", "hoverClick", "pattern"],
    rules: {
      canDrag: () => true,
      canMoveIn: () => false,
    },
    tools: props => [
      <HoverNodeController
        key="listItemHoverController"
        position="top"
        align="end"
        placement="end"
        alt={{
          position: "bottom",
          align: "start",
          placement: "start",
        }}
      />,
      <SelectListTool key="selectList" />,
      <DeleteNodeController key="listItemDelete" />,
    ],
    presets: [
      {
        label: "List item",
        description: "One row of text with an inherited marker.",
        props: {
          text: "<p>Feature or benefit</p>",
          className: "text-base leading-relaxed",
        },
      },
    ],
  },
  { __internal: true }
);
