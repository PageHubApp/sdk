import { useLayoutEffect, useRef, type RefObject } from "react";

/**
 * useClampToViewport - Clamps an element horizontally within the #viewport bounds.
 *
 * Measures the element's bounding rect after render and applies a translateX
 * to keep it within the viewport edges (with 4px padding).
 *
 * @param ref - RefObject to the element to clamp. If not provided, creates one.
 * @returns The ref to attach to the element.
 */
export function useClampToViewport<T extends HTMLElement = HTMLDivElement>(
  externalRef?: RefObject<T | null>
): RefObject<T | null> {
  const internalRef = useRef<T | null>(null);
  const ref = externalRef || internalRef;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reset inline transform so we measure with only the CSS-class transform
    el.style.transform = "";

    // Read the base transform from the element's CSS class (e.g. -translate-x-1/2)
    // Must be read AFTER clearing inline transform to avoid accumulating prior shifts
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
      // Compose: keep the CSS-class transform and add the clamp shift
      const base = baseTransform && baseTransform !== "none" ? `${baseTransform} ` : "";
      el.style.transform = `${base}translateX(${shiftX}px)`;
    }
  });

  return ref;
}
