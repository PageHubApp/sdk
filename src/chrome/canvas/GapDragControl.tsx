import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { createPortal } from "react-dom";
import { editorCanvasViewToClassPrefixKey } from "../../utils/tailwind/className";
import { ViewSelectionAtom } from "../toolbar/Label";
import { ViewAtom } from "../viewport/atoms";
import { useGapDrag } from "./gap/useGapDrag";

export function GapDragControl() {
  const { id, dom } = useNode(node => ({
    dom: node.dom,
  }));

  const { isSelected } = useEditor((_, query) => ({
    isSelected: query.getEvent("selected").contains(id),
  }));

  const {
    actions: { setProp },
  } = useNode();
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classPrefixView = editorCanvasViewToClassPrefixKey(view);

  const { gapHoverInfo, isDragging, handleMouseDown } = useGapDrag({
    dom: dom as HTMLElement | null,
    isSelected,
    classPrefixView,
    classDark,
    setProp,
  });

  const shouldShow = (gapHoverInfo?.show || isDragging) && gapHoverInfo;

  const portalTarget = typeof document !== "undefined" ? document.getElementById("viewport") : null;

  if (!shouldShow || !portalTarget || !gapHoverInfo.gapRect) return null;

  const portalRect = portalTarget.getBoundingClientRect();
  const ox = -portalRect.left + portalTarget.scrollLeft;
  const oy = -portalRect.top + portalTarget.scrollTop;

  const isVertical = gapHoverInfo.direction === "vertical";
  const gr = gapHoverInfo.gapRect;

  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      data-exclude-gap-detection
      data-node-control="true"
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: gr.x + ox - (isVertical ? 12 : 0),
        top: gr.y + oy - (isVertical ? 0 : 4),
        width: isVertical ? Math.max(gr.width, 8) + 24 : gr.width,
        height: isVertical ? gr.height : Math.max(gr.height, 8) + 8,
        backgroundColor: isDragging ? "rgba(59, 130, 246, 0.4)" : "rgba(59, 130, 246, 0.2)",
        cursor: isVertical ? "ew-resize" : "ns-resize",
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: isDragging ? "none" : "background-color 0.15s ease",
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#1d4ed8",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          padding: "1px 5px",
          borderRadius: 3,
          fontFamily: "system-ui, -apple-system, sans-serif",
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
        }}
      >
        {Math.round(gapHoverInfo.currentGap)}px
      </span>
    </div>,
    portalTarget
  );
}
