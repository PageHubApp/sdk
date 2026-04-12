import { useEditor } from "@craftjs/core";
import { useCallback, useEffect, useRef } from "react";

function isNonCanvasTextInteractionTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest('[contenteditable="true"]')) return true;
  if (target.closest(".ProseMirror")) return true;
  if (target.closest("input, textarea, select")) return true;
  return false;
}

/** True when the event is on in-canvas editor chrome (often inside `[node-id]` via portals). */
function isCanvasNodeChromeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.closest("[data-pagehub-canvas-chrome]")) return true;
  if (target.closest('[data-node-control="true"]')) return true;
  if (target.closest(".node-control")) return true;
  if (target.closest('[data-type="nodeControl"]')) return true;
  if (target.closest('[data-type="nodeControlBase"]')) return true;
  return false;
}

/**
 * Second click on an already-selected canvas node clears Craft selection.
 * Pointer tracking uses capture on document so stale state resets when clicking outside #viewport.
 */
export function useViewportClickDeselect() {
  const { enabled, actions, query } = useEditor((state, queryFromEditor) => ({
    enabled: state.options.enabled,
    query: queryFromEditor,
  }));

  const pendingRef = useRef<{ nodeId: string; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const onPointerDownCapture = (e: PointerEvent) => {
      const viewport = document.getElementById("viewport");
      const t = e.target;
      if (!(t instanceof Node) || !viewport?.contains(t)) {
        pendingRef.current = null;
        return;
      }
      if (e.button !== 0) {
        pendingRef.current = null;
        return;
      }
      if (isNonCanvasTextInteractionTarget(t)) {
        pendingRef.current = null;
        return;
      }
      if (isCanvasNodeChromeTarget(t)) {
        pendingRef.current = null;
        return;
      }
      const nodeEl = t instanceof HTMLElement ? t.closest("[node-id]") : null;
      const nodeId = nodeEl?.getAttribute("node-id") ?? null;
      let selected: string | null = null;
      try {
        selected = query.getEvent("selected").first() ?? null;
      } catch {
        pendingRef.current = null;
        return;
      }
      if (nodeId && selected && nodeId === selected) {
        pendingRef.current = { nodeId, x: e.clientX, y: e.clientY };
      } else {
        pendingRef.current = null;
      }
    };

    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () => document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, [enabled, query]);

  const handleViewportClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!enabled) return;
      const pending = pendingRef.current;
      if (!pending) return;

      if (isNonCanvasTextInteractionTarget(e.target)) {
        pendingRef.current = null;
        return;
      }

      if (isCanvasNodeChromeTarget(e.target)) {
        pendingRef.current = null;
        return;
      }

      if (Math.hypot(e.clientX - pending.x, e.clientY - pending.y) > 10) {
        pendingRef.current = null;
        return;
      }

      let selected: string | null = null;
      try {
        selected = query.getEvent("selected").first() ?? null;
      } catch {
        pendingRef.current = null;
        return;
      }

      if (selected !== pending.nodeId) {
        pendingRef.current = null;
        return;
      }

      const nodeEl = e.target instanceof HTMLElement ? e.target.closest("[node-id]") : null;
      const nodeId = nodeEl?.getAttribute("node-id");
      if (nodeId !== pending.nodeId) {
        pendingRef.current = null;
        return;
      }

      pendingRef.current = null;
      actions.selectNode(null);
    },
    [enabled, actions, query]
  );

  return { handleViewportClick };
}
