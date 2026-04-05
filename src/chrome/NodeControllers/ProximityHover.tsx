// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useState } from "react";

const HOVER_MARGIN = 60; // pixels

export const ProximityHover = () => {
  const { id, dom, isInteractiveElement } = useNode(node => ({
    dom: node.dom,
    isInteractiveElement:
      node.data.name === "Container" ||
      node.data.displayName === "Container" ||
      node.data.name === "Button" ||
      node.data.displayName === "Button" ||
      node.data.name === "Text" ||
      node.data.displayName === "Text" ||
      node.data.name === "Image" ||
      node.data.displayName === "Image" ||
      node.data.name === "Nav" ||
      node.data.displayName === "Nav" ||
      node.data.name === "Header" ||
      node.data.displayName === "Header" ||
      node.data.name === "Footer" ||
      node.data.displayName === "Footer",
  }));

  const { isSelected } = useEditor((_, query) => ({
    isSelected: query.getEvent("selected").contains(id),
  }));

  const [isProximityHover, setIsProximityHover] = useState(false);

  useEffect(() => {
    if (!dom || !isInteractiveElement) return;

    let rafId: number;

    const checkProximity = (e: MouseEvent | DragEvent) => {
      if (rafId) cancelAnimationFrame(rafId);

      rafId = requestAnimationFrame(() => {
        const rect = dom.getBoundingClientRect();

        // Expand the rect by HOVER_MARGIN
        const expandedRect = {
          top: rect.top - HOVER_MARGIN,
          left: rect.left - HOVER_MARGIN,
          bottom: rect.bottom + HOVER_MARGIN,
          right: rect.right + HOVER_MARGIN,
        };

        // Check if mouse is within expanded bounds
        const isWithinBounds =
          e.clientX >= expandedRect.left &&
          e.clientX <= expandedRect.right &&
          e.clientY >= expandedRect.top &&
          e.clientY <= expandedRect.bottom;

        setIsProximityHover(isWithinBounds);
      });
    };

    // Listen to both mousemove (normal) and dragover (during drag)
    document.addEventListener("mousemove", checkProximity as EventListener);
    document.addEventListener("dragover", checkProximity as EventListener);

    return () => {
      document.removeEventListener("mousemove", checkProximity as EventListener);
      document.removeEventListener("dragover", checkProximity as EventListener);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [dom, isInteractiveElement]);

  // Apply hover attribute based on proximity (but not if selected)
  useEffect(() => {
    if (!dom || !isInteractiveElement || isSelected) return;

    if (isProximityHover) {
      dom.setAttribute("data-hover", "true");
    } else {
      // Only remove if we're not actually hovering (let normal hover take precedence)
      const actuallyHovering = dom.matches(":hover");
      if (!actuallyHovering) {
        dom.removeAttribute("data-hover");
      }
    }
  }, [isProximityHover, dom, isSelected, isInteractiveElement]);

  return null;
};
