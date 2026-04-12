import type { ReactElement } from "react";
import { Tooltip } from "./layout/Tooltip";

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
  return (
    <Tooltip
      content={TOOLBOX_INSERT_HINT}
      delay={TOOLBOX_INSERT_HINT_DELAY_MS}
      placement={placement}
      full
    >
      {children}
    </Tooltip>
  );
}
