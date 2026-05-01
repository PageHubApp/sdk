import React from "react";

import { HorizontalOverflowThumbOverlay } from "./HorizontalOverflowThumbOverlay";
import type { OverflowProps } from "../types";

interface ApplyOverflowUXOptions {
  overflow: OverflowProps;
  enabled: boolean;
  scrollEl: HTMLElement | null;
  onDragPointerDown: (e: React.PointerEvent) => void;
  dragSmooth: number;
  wheelMaps: boolean;
}

/**
 * Mutates `prop` to wire the CSS overflow UX (horizontal pointer-drag scroll +
 * autohide thumb). Mirrors the inline block extracted from `Container.tsx` —
 * caller is expected to gate on its own `overflowUxActive` first.
 *
 * Mutating shape (not return-a-new-prop) matches the rest of Container's prop
 * assembly so the fields layered on by other passes (link wiring, action
 * handlers, attrs) stay observable in one object.
 */
export function applyContainerOverflowUX(prop: any, opts: ApplyOverflowUXOptions): void {
  const { overflow, enabled, scrollEl, onDragPointerDown, dragSmooth, wheelMaps } = opts;

  if (overflow.autoHide) {
    const inner = prop.children;
    prop.children = (
      <>
        <HorizontalOverflowThumbOverlay
          scrollEl={scrollEl}
          hideDelay={overflow.hideDelay ?? 1000}
        />
        {inner}
      </>
    );
    prop.className = `${prop.className || ""} ph-overflow-hide-native-scrollbar`.trim();
    prop.style = {
      ...prop.style,
      scrollbarWidth: "none",
      msOverflowStyle: "none",
    };
  }

  if (overflow.dragScroll && !enabled) {
    prop.onPointerDown = onDragPointerDown;
    prop.className = `${prop.className || ""} cursor-grab`.trim();
    // Native `<img>` drag steals pointer gestures; block so horizontal
    // drag-scroll works on cards.
    const prevDragStart = prop.onDragStart;
    prop.onDragStart = (e: React.DragEvent) => {
      const el = e.target as Node | null;
      if (el && (el as Element).nodeName === "IMG") {
        e.preventDefault();
      }
      if (typeof prevDragStart === "function") prevDragStart(e);
    };
  }

  if (overflow.dragScroll) {
    prop["data-ph-overflow-drag"] = "";
    if (dragSmooth > 0) {
      prop["data-ph-overflow-smooth"] = String(dragSmooth);
    }
  }
  if (overflow.autoHide) prop["data-ph-overflow-autohide"] = "";
  if (wheelMaps) prop["data-ph-overflow-wheel"] = "";
  prop["data-ph-overflow-hide-delay"] = String(overflow.hideDelay ?? 1000);
}
