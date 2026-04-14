import React, { type ReactElement } from "react";
import { PAGEHUB_RTT_GLOBAL_ID } from "./layout/tooltipSurface";

/** Shown after {@link TOOLBOX_INSERT_HINT_DELAY_MS} hover on toolbox tiles and block cards. */
export const TOOLBOX_INSERT_HINT = "Double-click adds to the selected area; drag to place.";

export const TOOLBOX_INSERT_HINT_DELAY_MS = 500;

type ToolboxInsertHintTooltipProps = {
  children: ReactElement;
  /** Prefer `right` when the panel is docked left so the tip opens over the canvas. */
  placement?: "top" | "bottom" | "left" | "right";
};

export function ToolboxInsertHintTooltip({
  children,
  placement = "right",
}: ToolboxInsertHintTooltipProps) {
  return React.cloneElement(children as ReactElement<Record<string, unknown>>, {
    "data-tooltip-id": PAGEHUB_RTT_GLOBAL_ID,
    "data-tooltip-content": TOOLBOX_INSERT_HINT,
    "data-tooltip-delay-show": TOOLBOX_INSERT_HINT_DELAY_MS,
    "data-tooltip-place": placement,
    className: `flex w-full min-w-0 ${(children as ReactElement<{ className?: string }>).props.className ?? ""}`.trim(),
  });
}
