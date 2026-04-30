import React, { type ReactElement } from "react";
import { PAGEHUB_RTT_GLOBAL_ID } from "./layout/tooltipSurface";

export const TOOLBOX_INSERT_HINT_DELAY_MS = 500;

/** SVG icons for the tooltip actions row — matches TbHandGrab / TbHandClick from react-icons/tb. */
const dragIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 11v-3.5a1.5 1.5 0 0 1 3 0v2.5"/><path d="M11 9.5v-3a1.5 1.5 0 0 1 3 0v3.5"/><path d="M14 7.5a1.5 1.5 0 0 1 3 0v2.5"/><path d="M17 9.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7l-.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47"/></svg>`;
const dblClickIcon = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 13v-8.5a1.5 1.5 0 0 1 3 0v7.5"/><path d="M11 11.5v-2a1.5 1.5 0 0 1 3 0v2.5"/><path d="M14 10.5a1.5 1.5 0 0 1 3 0v1.5"/><path d="M17 11.5a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7l-.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47"/><path d="M5 3l-1 -1"/><path d="M4 7h-1"/><path d="M14 3l1 -1"/><path d="M15 6h1"/></svg>`;

function buildTooltipHTML(description?: string): string {
  const desc = description
    ? `<div style="margin-bottom:4px;line-height:1.4">${description}</div>`
    : "";
  const actions =
    `<div style="display:flex;gap:10px;opacity:0.6;font-size:10px;line-height:1">` +
    `<span style="display:inline-flex;align-items:center;gap:3px">${dragIcon} Drag</span>` +
    `<span style="display:inline-flex;align-items:center;gap:3px">${dblClickIcon} Double-click</span>` +
    `</div>`;
  return desc + actions;
}

type ToolboxInsertHintTooltipProps = {
  children: ReactElement;
  /** Short description shown above the action hints. */
  description?: string;
  /** Prefer `right` when the panel is docked left so the tip opens over the canvas. */
  placement?: "top" | "bottom" | "left" | "right";
};

export function ToolboxInsertHintTooltip({
  children,
  description,
  placement = "right",
}: ToolboxInsertHintTooltipProps) {
  return React.cloneElement(children as ReactElement<Record<string, unknown>>, {
    "data-tooltip-id": PAGEHUB_RTT_GLOBAL_ID,
    "data-tooltip-html": buildTooltipHTML(description),
    "data-tooltip-delay-show": TOOLBOX_INSERT_HINT_DELAY_MS,
    "data-tooltip-place": placement,
    className:
      `flex h-full w-full min-w-0 ${(children as ReactElement<{ className?: string }>).props.className ?? ""}`.trim(),
  });
}
