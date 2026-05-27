import type { RefObject } from "react";
import { useEffect } from "react";
import { useOverlay } from "../../../../registry/hooks/useOverlay";

interface UseMenuDismissalArgs {
  enabled: boolean;
  id: string;
  hasAnyMenuItems: boolean;
  ref: RefObject<HTMLDivElement | null>;
  insertPanelRef: RefObject<HTMLElement | null>;
  componentPanelRef: RefObject<HTMLElement | null>;
  insertPanelOpen: boolean;
  componentFlyoutOpen: boolean;
  setInsertPanelOpen: (open: boolean) => void;
  setComponentFlyoutOpen: (open: boolean) => void;
  cancelInsertLeaveTimer: () => void;
  closeMenu: () => void;
}

/**
 * Outside-click + escape + auto-close-when-empty for the canvas context menu.
 *
 * Outside-click attaches via `setTimeout(..., 0)` with capture phase to avoid
 * catching the right-click event that opened the menu. Clicks inside either
 * floating panel (insert / component flyout) do NOT dismiss.
 *
 * Escape cascade — formerly an inline `keydown` listener — now uses per-layer
 * overlay-stack registrations. Each layer registers under its own overlay id;
 * the registry dispatcher's LIFO ordering handles the cascade naturally:
 *
 *   1. component-flyout (registered last when open) is dismissed first
 *   2. then insert-panel
 *   3. then the main menu
 */
export function useMenuDismissal({
  enabled,
  id,
  hasAnyMenuItems,
  ref,
  insertPanelRef,
  componentPanelRef,
  insertPanelOpen,
  componentFlyoutOpen,
  setInsertPanelOpen,
  setComponentFlyoutOpen,
  cancelInsertLeaveTimer,
  closeMenu,
}: UseMenuDismissalArgs) {
  useEffect(() => {
    if (!enabled) return;
    let detach: (() => void) | undefined;
    const tid = window.setTimeout(() => {
      const onDoc = (event: MouseEvent) => {
        if (event.button === 2) return;
        const t = event.target as Node;
        if (ref.current?.contains(t)) return;
        if (insertPanelRef.current?.contains(t)) return;
        if (componentPanelRef.current?.contains(t)) return;
        cancelInsertLeaveTimer();
        setInsertPanelOpen(false);
        setComponentFlyoutOpen(false);
        closeMenu();
      };
      document.addEventListener("pointerdown", onDoc, true);
      detach = () => document.removeEventListener("pointerdown", onDoc, true);
    }, 0);
    return () => {
      window.clearTimeout(tid);
      detach?.();
    };
  }, [
    enabled,
    ref,
    insertPanelRef,
    componentPanelRef,
    cancelInsertLeaveTimer,
    setInsertPanelOpen,
    setComponentFlyoutOpen,
    closeMenu,
  ]);

  // Escape cascade via per-layer overlay-stack registrations. The push order
  // (main menu → insert panel → component flyout) matches the visual layering;
  // LIFO pop dismisses the deepest layer first.
  useOverlay({
    id: `toolbox-context-menu:${id}`,
    isOpen: enabled,
    onDismiss: closeMenu,
  });
  useOverlay({
    id: `toolbox-context-menu:${id}:insert-panel`,
    isOpen: enabled && insertPanelOpen,
    onDismiss: () => setInsertPanelOpen(false),
  });
  useOverlay({
    id: `toolbox-context-menu:${id}:component-flyout`,
    isOpen: enabled && componentFlyoutOpen,
    onDismiss: () => setComponentFlyoutOpen(false),
  });

  // Auto-close when no menu items would render.
  useEffect(() => {
    if (!enabled || !id || hasAnyMenuItems) return;
    closeMenu();
  }, [enabled, id, hasAnyMenuItems, closeMenu]);
}
