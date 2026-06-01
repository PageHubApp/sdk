/**
 * useInsertFlyout — owns the open-state, leave-timers, and anchored popovers
 * for the "Insert" submenu + nested "Component" flyout in the canvas
 * right-click menu.
 *
 * Two leave timers (160ms each) give the user enough hover-grace to cross
 * the gap between the parent menu row and the floating panel without the
 * panel snapping shut.
 *
 * Pulled out of `ToolboxContextual.tsx` so the main component owns only its
 * own selection / clipboard / mutation handlers.
 */
import { useCallback, useRef, useState } from "react";
import type { Placement } from "@floating-ui/react-dom";
import { useAnchoredPopover } from "../../popovers/useAnchoredPopover";

const CONTEXT_SUBMENU_FALLBACKS: Placement[] = [
  "left-start",
  "right-end",
  "left-end",
  "top-start",
  "bottom-start",
  "top-end",
  "bottom-end",
];

const CONTEXT_SUBMENU_FLIP = {
  crossAxis: true,
  fallbackPlacements: CONTEXT_SUBMENU_FALLBACKS,
};

const LEAVE_DELAY_MS = 160;

export function useInsertFlyout() {
  const [insertPanelOpen, setInsertPanelOpen] = useState(false);
  const [componentFlyoutOpen, setComponentFlyoutOpen] = useState(false);
  const insertLeaveTimer = useRef<number | null>(null);
  const componentFlyoutLeaveTimer = useRef<number | null>(null);

  const cancelInsertLeaveTimer = useCallback(() => {
    if (insertLeaveTimer.current) {
      window.clearTimeout(insertLeaveTimer.current);
      insertLeaveTimer.current = null;
    }
    if (componentFlyoutLeaveTimer.current) {
      window.clearTimeout(componentFlyoutLeaveTimer.current);
      componentFlyoutLeaveTimer.current = null;
    }
  }, []);

  const closeBoth = useCallback(() => {
    cancelInsertLeaveTimer();
    setInsertPanelOpen(false);
    setComponentFlyoutOpen(false);
  }, [cancelInsertLeaveTimer]);

  const scheduleCloseInsertPanels = useCallback(() => {
    cancelInsertLeaveTimer();
    insertLeaveTimer.current = window.setTimeout(() => {
      setInsertPanelOpen(false);
      setComponentFlyoutOpen(false);
      insertLeaveTimer.current = null;
    }, LEAVE_DELAY_MS);
  }, [cancelInsertLeaveTimer]);

  /** Closing the nested component flyout only — not the whole Insert panel
   *  (sibling items like Add empty section). */
  const scheduleCloseComponentFlyoutOnly = useCallback(() => {
    if (componentFlyoutLeaveTimer.current) {
      window.clearTimeout(componentFlyoutLeaveTimer.current);
      componentFlyoutLeaveTimer.current = null;
    }
    componentFlyoutLeaveTimer.current = window.setTimeout(() => {
      setComponentFlyoutOpen(false);
      componentFlyoutLeaveTimer.current = null;
    }, LEAVE_DELAY_MS);
  }, []);

  const insertPanelFloating = useAnchoredPopover({
    open: insertPanelOpen,
    placement: "right-start",
    strategy: "fixed",
    mainAxisOffset: -6,
    crossAxisOffset: 0,
    flipOptions: CONTEXT_SUBMENU_FLIP,
    shiftPadding: 8,
  });

  const componentPanelFloating = useAnchoredPopover({
    open: componentFlyoutOpen,
    placement: "right-start",
    strategy: "fixed",
    mainAxisOffset: -6,
    crossAxisOffset: 0,
    flipOptions: CONTEXT_SUBMENU_FLIP,
    shiftPadding: 8,
  });

  return {
    insertPanelOpen,
    setInsertPanelOpen,
    componentFlyoutOpen,
    setComponentFlyoutOpen,
    insertPanelFloating,
    componentPanelFloating,
    cancelInsertLeaveTimer,
    closeBoth,
    scheduleCloseInsertPanels,
    scheduleCloseComponentFlyoutOnly,
  };
}
