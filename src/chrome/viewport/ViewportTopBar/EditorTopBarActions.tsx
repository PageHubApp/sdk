/**
 * The editor's top-bar controls: every `useMenuItems("topbar")` button
 * (undo/redo, preview, save, More…), `BreakpointSwitcher` after undo, and
 * optionally the inline page switcher.
 *
 * `ViewportTopBar` renders its header row through this. A host that turns off
 * `features.topBar` can render it in its own chrome instead (portaled out of
 * the editor), as long as it stays a descendant of `<PageHubEditor>` so the
 * Craft + SDK providers are in scope.
 *
 * The row is `flex-row-reverse` so menu order (history → view → save → more)
 * reads right to left, matching the built-in header; the page selector comes
 * last in DOM order and so sits at the left edge.
 */
import { useEditor } from "@craftjs/core";
import React from "react";
import { twMerge } from "tailwind-merge";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { useSDK } from "../../../core/context";
import { useMenuItems } from "../../../registry/hooks";
import { PageSelector } from "../pickers/PageSelector";
import { BreakpointSwitcher } from "./BreakpointSwitcher";
import { HeaderItem as Item } from "./HeaderItem";

export interface EditorTopBarActionsProps {
  className?: string;
  /** Include the page switcher (PageSelector, inline trigger). Default true. */
  showPageSelector?: boolean;
  /** Command ids to leave out, for a host that renders those actions its own way. */
  omit?: readonly string[];
}

export function EditorTopBarActions({
  className,
  showPageSelector = true,
  omit,
}: EditorTopBarActionsProps): React.JSX.Element | null {
  const { enabled } = useEditor(state => ({ enabled: state.options.enabled }));
  const { features, commands } = useSDK();
  const allItems = useMenuItems("topbar");
  const topbarItems = omit?.length
    ? allItems.filter(item => !omit.includes(item.command))
    : allItems;

  if (!enabled) return null;

  return (
    <div className={twMerge("flex min-w-0 flex-row-reverse items-center gap-1", className)}>
      {topbarItems.map((item, idx) => {
        const node = (
          <Item
            key={item.command + JSON.stringify(item.args ?? null)}
            ariaLabel={item.title}
            disabled={!item.enabled}
            onClick={e => {
              e.stopPropagation();
              void commands.execute(item.command, item.args, { trigger: "menu" });
            }}
            onMouseDown={
              item.command === "ph.editor.insert" || item.command === "ph.editor.openMore"
                ? e => e.stopPropagation()
                : undefined
            }
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={item.title}
            data-tooltip-place="bottom"
            data-tooltip-offset={10}
          >
            {item.icon}
          </Item>
        );
        // BreakpointSwitcher is a custom popover surface (mode toggle +
        // breakpoint chip grid + zoom slider), not a single button, so it
        // can't be a registered menu item. It follows ph.editor.undo in array
        // order, which under flex-row-reverse places it left of undo.
        // A locked canvas width (`features.canvasWidth`) has no breakpoints to switch.
        if (item.command === "ph.editor.undo" && !features.canvasWidth) {
          return (
            <React.Fragment key={`__frag_${idx}`}>
              {node}
              <BreakpointSwitcher />
            </React.Fragment>
          );
        }
        return node;
      })}
      {showPageSelector && (
        <div className="mr-auto flex min-w-0 items-center">
          <PageSelector inlineTrigger />
        </div>
      )}
    </div>
  );
}
