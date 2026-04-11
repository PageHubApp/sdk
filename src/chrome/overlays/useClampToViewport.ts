import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * Clamps an element horizontally within the `#viewport` bounds (canvas space).
 * Used by inline node controls and the rich-text inline toolbar until those
 * share a single viewport-anchored floating strategy; see VIEWPORT_ANCHORING.md.
 */
export function useClampToViewport<T extends HTMLElement = HTMLDivElement>(
  externalRef?: RefObject<T | null>
): RefObject<T | null> {
  const internalRef = useRef<T | null>(null);
  const ref = externalRef || internalRef;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.transform = "";

    const baseTransform = getComputedStyle(el).transform;

    const viewport = document.getElementById("viewport");
    if (!viewport) return;

    const elRect = el.getBoundingClientRect();
    const vpRect = viewport.getBoundingClientRect();

    let shiftX = 0;
    if (elRect.right > vpRect.right - 4) {
      shiftX = vpRect.right - 4 - elRect.right;
    } else if (elRect.left < vpRect.left + 4) {
      shiftX = vpRect.left + 4 - elRect.left;
    }

    if (shiftX !== 0) {
      const base = baseTransform && baseTransform !== "none" ? `${baseTransform} ` : "";
      el.style.transform = `${base}translateX(${shiftX}px)`;
    }
  });

  return ref;
}
