import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useState } from "react";
import { useAtomValue } from "@zedux/react";
import { twMerge } from "tailwind-merge";
import { Tooltip } from "@/chrome/primitives/layout/Tooltip";
import {
  buildVariantPrefix,
  editorCanvasViewToClassPrefixKey,
} from "../../utils/tailwind/className";
import RenderNodeControlInline from "../rendering/RenderNodeControlInline";
import { ViewSelectionAtom } from "../toolbar/Label";
import { ViewAtom } from "../viewport/atoms";
import { useElementColor } from "./canvasUtils";
import { SpacingOverlay } from "./SpacingOverlay";

// Tailwind spacing values mapping (same as DragAdjustNodeController)
const TAILWIND_SPACING_MAP = {
  0: "0",
  1: "px",
  2: "0.5",
  4: "1",
  6: "1.5",
  8: "2",
  10: "2.5",
  12: "3",
  14: "3.5",
  16: "4",
  20: "5",
  24: "6",
  28: "7",
  32: "8",
  40: "10",
  48: "12",
  56: "14",
  64: "16",
  80: "20",
  96: "24",
  112: "28",
  128: "32",
  144: "36",
  160: "40",
  176: "44",
  192: "48",
  208: "52",
  224: "56",
  240: "60",
  256: "64",
  288: "72",
  320: "80",
  384: "96",
};

const pixelsToTailwindClass = (pixels: number): string => {
  const label = TAILWIND_SPACING_MAP[pixels];
  if (label) {
    return `p-${label}`;
  }
  // Fallback to arbitrary value
  return `p-[${pixels}px]`;
};

export const UniformPaddingNodeController = () => {
  const { id } = useNode();

  const { isActive, isHover } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
    isHover: query.getEvent("hovered").contains(id),
  }));

  const dom = document.querySelector(`[node-id="${id}"]`);

  const {
    actions: { setProp },
  } = useNode();

  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classPrefixView = editorCanvasViewToClassPrefixKey(view);

  const [dragging, setDragging] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [startY, setStartY] = useState(null);
  const [initialPadding, setInitialPadding] = useState(null);

  // Get the current computed color from the DOM (same as border-current uses)
  const elementColor = useElementColor(dom as HTMLElement, isActive);

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = e => {
      if (!dragging || !dom) return;

      const deltaY = e.clientY - startY;
      const newPadding = Math.max(0, initialPadding + deltaY);

      // Snap to nearest Tailwind spacing
      const snappedPadding = snapToTailwindSpacing(newPadding);

      // Convert to Tailwind class and update props (no inline styles)
      const tailwindClass = pixelsToTailwindClass(snappedPadding);

      const prefix = buildVariantPrefix(classPrefixView, classDark);
      setProp(prop => {
        prop.className = twMerge(prop.className || "", prefix + tailwindClass);
      }, 50);
    };

    const handleMouseUp = () => {
      setDragging(false);
      document.body.style.cursor = "auto";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging, startY, initialPadding, dom, setProp, classPrefixView, classDark]);

  const handleMouseDown = e => {
    if (!dom) return;
    e.preventDefault();
    e.stopPropagation();

    setDragging(true);
    setStartY(e.clientY);

    const computedStyle = window.getComputedStyle(dom as HTMLElement);
    const currentPadding = parseFloat(computedStyle.paddingTop) || 0;
    setInitialPadding(currentPadding);

    document.body.style.cursor = "move";
  };

  // Snap to closest Tailwind spacing value
  const snapToTailwindSpacing = (pixels: number): number => {
    const spacingValues = Object.keys(TAILWIND_SPACING_MAP).map(Number);
    const maxTailwind = spacingValues[spacingValues.length - 1];

    if (pixels > maxTailwind + 20) {
      return pixels;
    }

    let closest = spacingValues[0];
    let minDiff = Math.abs(pixels - closest);

    for (const value of spacingValues) {
      const diff = Math.abs(pixels - value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = value;
      }
    }

    return closest;
  };

  if (!isActive || (!isHover && !dragging)) return null;

  return (
    <RenderNodeControlInline
      key={`${id}-uniform-padding`}
      position="top"
      align="start"
      placement="start"
      isPadding={true}
      className="items-center whitespace-nowrap select-none"
      style={elementColor ? { color: elementColor } : {}}
    >
      <>
        <SpacingOverlay
          targetElement={dom as HTMLElement | null}
          type="padding"
          position="all"
          isActive={hovering || dragging}
        />
        <Tooltip content="Drag to adjust all padding" placement="left">
          <button
            type="button"
            className="pointer-events-auto size-6 cursor-move border-t-4 border-l-[5px] border-current transition-transform hover:scale-110 active:scale-110"
            style={{ animation: "node-control-in 0.5s ease-out 0.5s both" }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            aria-label="Drag to adjust uniform padding"
          />
        </Tooltip>
      </>
    </RenderNodeControlInline>
  );
};
