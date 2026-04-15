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

  const portalTarget = typeof document !== "undefined"
    ? document.getElementById("viewport")
    : null;

  // TODO: positioning/click issues — disabled until fixed
  if (!shouldShow || !portalTarget) return null;
  return null;

  const portalRect = portalTarget.getBoundingClientRect();
  const offsetX = -portalRect.left + portalTarget.scrollLeft;
  const offsetY = -portalRect.top + portalTarget.scrollTop;

  const isVertical = gapHoverInfo.direction === "vertical";

  return createPortal(
    <>
      {/* Gap region highlight */}
      {gapHoverInfo.gapRect && (
        <div
          data-exclude-gap-detection
          style={{
            position: "absolute",
            left: gapHoverInfo.gapRect.x + offsetX,
            top: gapHoverInfo.gapRect.y + offsetY,
            width: gapHoverInfo.gapRect.width,
            height: gapHoverInfo.gapRect.height,
            background: isDragging
              ? "rgba(59, 130, 246, 0.15)"
              : "rgba(59, 130, 246, 0.08)",
            pointerEvents: "none",
            zIndex: 9998,
            transition: "background 0.15s ease",
          }}
        />
      )}
      {/* Drag handle */}
      {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
      <div
        data-exclude-gap-detection
        data-craft-ignore="true"
        onMouseDown={handleMouseDown}
        style={{
          position: "absolute",
          left: gapHoverInfo.x + offsetX - 12,
          top: gapHoverInfo.y + offsetY - 12,
          width: 24,
          height: 24,
          zIndex: 9999,
          cursor: isDragging ? "grabbing" : "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: isDragging ? 20 : 16,
            height: isDragging ? 20 : 16,
            borderRadius: "50%",
            background: isDragging ? "rgb(59, 130, 246)" : "rgba(59, 130, 246, 0.8)",
            border: "2px solid white",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            transition: "all 0.15s ease",
          }}
        />
      </div>
      {/* Gap value label */}
      {isDragging && (
        <div
          data-exclude-gap-detection
          style={{
            position: "absolute",
            left: gapHoverInfo.x + offsetX + (isVertical ? 16 : 0),
            top: gapHoverInfo.y + offsetY + (isVertical ? 0 : -28),
            transform: isVertical ? "translateY(-50%)" : "translateX(-50%)",
            background: "rgb(59, 130, 246)",
            color: "white",
            fontSize: 11,
            fontWeight: 600,
            padding: "2px 6px",
            borderRadius: 4,
            pointerEvents: "none",
            zIndex: 9999,
            whiteSpace: "nowrap",
            boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          }}
        >
          {Math.round(gapHoverInfo.currentGap)}px
        </div>
      )}
    </>,
    portalTarget
  );
}
