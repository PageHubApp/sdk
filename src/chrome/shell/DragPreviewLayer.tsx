/**
 * DragPreviewLayer — Framer-style drag preview.
 *
 * Custom drag layer (not the browser's native drag image). On dragstart we clone
 * the source DOM, style it with a 1px dashed accent border + slight scale/opacity,
 * append it inside .pagehub-sdk-root so theme vars cascade, and follow the cursor
 * via RAF-batched dragover. The native drag image is suppressed to a 1×1 transparent
 * element in CustomEventHandlers so only our layer is visible.
 */

import { useEffect } from "react";
import { OVERLAY_Z_DRAG } from "../overlays/overlayZIndex";

const ACCENT = "rgb(59 130 246)"; // tailwind blue-500

function stripEditorAttrs(root: HTMLElement) {
  const attrs = [
    "data-selected",
    "data-hover",
    "data-parent-of-selected",
    "data-dragging",
    "data-ancestor",
    "data-position-override",
  ];
  for (const a of attrs) root.removeAttribute(a);
  const all = root.querySelectorAll(`[${attrs.join("],[")}]`);
  all.forEach(el => {
    for (const a of attrs) el.removeAttribute(a);
  });
}

export function DragPreviewLayer() {
  useEffect(() => {
    let cleanup: (() => void) | null = null;

    const onDragStart = (e: DragEvent) => {
      // Defensive: if a prior drag never fired dragend/drop (Esc, browser bug, etc.),
      // make sure the previous clone is gone before we make a new one.
      cleanup?.();

      const target = e.target as HTMLElement | null;
      if (!target || !(target instanceof HTMLElement)) return;

      // Only render the custom clone for canvas drags. Sidebar/toolbox drags
      // (Components panel, Blocks panel) live outside #viewport and rely on
      // CraftJS's own connector chrome — cloning their previews here can throw
      // (complex scaled subtrees) and abort the native drag.
      if (!target.closest("#viewport")) return;

      const sdkRoot = target.closest(".pagehub-sdk-root") as HTMLElement | null;
      if (!sdkRoot) return;

      const rect = target.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      const clone = target.cloneNode(true) as HTMLElement;
      stripEditorAttrs(clone);

      clone.style.position = "fixed";
      clone.style.top = `${rect.top}px`;
      clone.style.left = `${rect.left}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.margin = "0";
      clone.style.zIndex = String(OVERLAY_Z_DRAG);
      clone.style.pointerEvents = "none";
      clone.style.opacity = "0.88";
      clone.style.border = `1px dashed ${ACCENT}`;
      clone.style.borderRadius = "4px";
      clone.style.transformOrigin = `${offsetX}px ${offsetY}px`;
      clone.style.transform = "scale(0.96)";
      clone.style.transition = "transform 0.18s ease, opacity 0.15s ease";
      clone.classList.add("pagehub-drag-clone");

      sdkRoot.appendChild(clone);

      let rafId = 0;
      let lastX = e.clientX;
      let lastY = e.clientY;

      const update = () => {
        rafId = 0;
        clone.style.left = `${lastX - offsetX}px`;
        clone.style.top = `${lastY - offsetY}px`;
      };

      const onDragOver = (de: DragEvent) => {
        if (de.clientX === 0 && de.clientY === 0) return;
        lastX = de.clientX;
        lastY = de.clientY;
        if (!rafId) rafId = requestAnimationFrame(update);
      };

      const finish = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
        clone.remove();
        document.removeEventListener("dragover", onDragOver, true);
        document.removeEventListener("dragend", finish, true);
        document.removeEventListener("drop", finish, true);
        cleanup = null;
      };

      document.addEventListener("dragover", onDragOver, true);
      document.addEventListener("dragend", finish, true);
      document.addEventListener("drop", finish, true);

      cleanup = finish;
    };

    document.addEventListener("dragstart", onDragStart, true);
    return () => {
      document.removeEventListener("dragstart", onDragStart, true);
      cleanup?.();
    };
  }, []);

  return null;
}
