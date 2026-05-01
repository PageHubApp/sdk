import { useCallback } from "react";
import { useOpenNodeContextMenu } from "../../hooks/useOpenNodeContextMenu";

/**
 * Right-click + double-click handlers for the canvas. Right-click opens the
 * element context menu at the pointer (skipping text fields); double-click
 * uses the same node-resolution logic, then forwards to the regular
 * double-click handler so node-level activation still happens.
 */
export function useViewportContextMenu({
  enabled,
  handleDoubleClick,
}: {
  enabled: boolean;
  handleDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const openNodeContextMenu = useOpenNodeContextMenu();

  /** Same rules as native context menu: opens element menu at pointer; skips text fields. */
  const tryOpenCanvasNodeContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): boolean => {
      if (!enabled) return false;
      const target = e.target as HTMLElement;
      if (target.closest(".ProseMirror")) return false;
      if (target.closest('[contenteditable="true"]')) return false;
      if (target.closest("input, textarea, select")) return false;

      const nodeEl = target.closest("[node-id]");
      const nodeId = nodeEl?.getAttribute("node-id");
      if (!nodeId) return false;

      const opened = openNodeContextMenu(nodeId, e.clientX, e.clientY);
      if (!opened) return false;

      e.preventDefault();
      e.stopPropagation();
      return true;
    },
    [enabled, openNodeContextMenu]
  );

  const handleViewportContextMenuCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      tryOpenCanvasNodeContextMenu(e);
    },
    [tryOpenCanvasNodeContextMenu]
  );

  const handleViewportDoubleClickCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tryOpenCanvasNodeContextMenu(e)) {
        handleDoubleClick(e);
      }
    },
    [tryOpenCanvasNodeContextMenu, handleDoubleClick]
  );

  return { handleViewportContextMenuCapture, handleViewportDoubleClickCapture };
}
