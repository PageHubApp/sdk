import type { RefObject } from "react";
import { useEffect } from "react";

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
 * Escape cascade closes the deepest open layer first: component flyout →
 * insert panel → main menu.
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

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (componentFlyoutOpen) {
        setComponentFlyoutOpen(false);
        e.preventDefault();
        return;
      }
      if (insertPanelOpen) {
        setInsertPanelOpen(false);
        e.preventDefault();
        return;
      }
      closeMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, insertPanelOpen, componentFlyoutOpen, setInsertPanelOpen, setComponentFlyoutOpen, closeMenu]);

  // Auto-close when no menu items would render.
  useEffect(() => {
    if (!enabled || !id || hasAnyMenuItems) return;
    closeMenu();
  }, [enabled, id, hasAnyMenuItems, closeMenu]);
}
