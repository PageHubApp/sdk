import { useEditor } from "@craftjs/core";
import { useEffect, useRef } from "react";
import {
  forEachProximityTarget,
  getProximityTarget,
  unregisterProximityTarget,
} from "./proximityHoverRegistry";

const HOVER_MARGIN = 60;

let previousHotIds = new Set<string>();

/**
 * Single document-level mousemove + dragover handler for proximity `data-hover`.
 * ProximityHover registers targets via proximityHoverRegistry.
 */
export function ProximityHoverManager() {
  const enabled = useEditor(s => s.options.enabled);
  const { query } = useEditor();
  const queryRef = useRef(query);
  queryRef.current = query;

  const selectionKey = useEditor((_, q) => q.getEvent("selected").all().join("\0"));

  useEffect(() => {
    if (!enabled) return;
    const q = queryRef.current;
    forEachProximityTarget((id, dom) => {
      if (!dom.isConnected) return;
      if (q.getEvent("selected").contains(id)) {
        if (!dom.matches(":hover")) dom.removeAttribute("data-hover");
      }
    });
  }, [selectionKey, enabled]);

  useEffect(() => {
    if (!enabled) return;

    let rafId = 0;
    let pending: MouseEvent | DragEvent | null = null;

    const flush = () => {
      const e = pending;
      pending = null;
      if (!e) return;

      const q = queryRef.current;
      const newHot = new Set<string>();

      const stale: string[] = [];
      forEachProximityTarget((id, dom) => {
        if (!dom.isConnected) {
          stale.push(id);
          return;
        }
        if (q.getEvent("selected").contains(id)) return;

        const rect = dom.getBoundingClientRect();
        const top = rect.top - HOVER_MARGIN;
        const left = rect.left - HOVER_MARGIN;
        const bottom = rect.bottom + HOVER_MARGIN;
        const right = rect.right + HOVER_MARGIN;
        const mx = e.clientX;
        const my = e.clientY;

        if (mx >= left && mx <= right && my >= top && my <= bottom) {
          newHot.add(id);
        }
      });
      for (const id of stale) unregisterProximityTarget(id);

      const prev = previousHotIds;
      for (const id of prev) {
        if (!newHot.has(id)) {
          const dom = getProximityTarget(id);
          if (dom?.isConnected && !dom.matches(":hover")) {
            dom.removeAttribute("data-hover");
          }
        }
      }

      for (const id of newHot) {
        const dom = getProximityTarget(id);
        if (dom?.isConnected) dom.setAttribute("data-hover", "true");
      }

      previousHotIds = newHot;
    };

    const schedule = (e: MouseEvent | DragEvent) => {
      pending = e;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        flush();
      });
    };

    document.addEventListener("mousemove", schedule);
    document.addEventListener("dragover", schedule);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("mousemove", schedule);
      document.removeEventListener("dragover", schedule);
      for (const id of previousHotIds) {
        const dom = getProximityTarget(id);
        if (dom?.isConnected && !dom.matches(":hover")) {
          dom.removeAttribute("data-hover");
        }
      }
      previousHotIds = new Set();
    };
  }, [enabled]);
}
