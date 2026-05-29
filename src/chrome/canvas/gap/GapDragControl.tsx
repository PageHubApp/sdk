import { useEditor, useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { createPortal } from "react-dom";
import { editorCanvasViewToClassPrefixKey } from "../../../utils/tailwind/className";
import { checkIfAncestorLinked } from "../../../utils/component/componentUtils";
import { EditModifiersAtom } from "../../toolbar/Label";
import { ViewAtom } from "../../viewport/state/atoms";
import { useGapDrag } from "./useGapDrag";
import { OVERLAY_Z_CANVAS_CONTROLS } from "../../popovers/overlayZIndex";

const ACCENT = "rgb(59 130 246)";
const LINE_LENGTH = 20; // visible marker length along the cross-axis

export function GapDragControl() {
  const { id, dom } = useNode(node => ({
    dom: node.dom,
  }));

  const { isSelected, isLocked } = useEditor((_, query) => ({
    isSelected: query.getEvent("selected").contains(id),
    // Linked-component clones (relationType "full" or "content") re-derive
    // their props from the master each render, so any className the user
    // would write here gets thrown away. Hide the control entirely.
    isLocked: checkIfAncestorLinked(id, query),
  }));

  const {
    actions: { setProp },
  } = useNode();
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(EditModifiersAtom).dark ?? false;
  const classPrefixView = editorCanvasViewToClassPrefixKey(view);

  const { gapHoverInfo, isDragging, handleMouseDown } = useGapDrag({
    dom: dom as HTMLElement | null,
    isSelected,
    classPrefixView,
    classDark,
    setProp,
  });

  const portalTarget = typeof document !== "undefined" ? document.getElementById("viewport") : null;
  const showActive = (gapHoverInfo?.show || isDragging) && gapHoverInfo?.gapRect;
  if (!portalTarget || !isSelected || isLocked || !showActive || !gapHoverInfo?.gapRect)
    return null;

  const portalRect = portalTarget.getBoundingClientRect();
  const ox = -portalRect.left + portalTarget.scrollLeft;
  const oy = -portalRect.top + portalTarget.scrollTop;

  const isVertical = gapHoverInfo.direction === "vertical";
  const gr = gapHoverInfo.gapRect;
  // Span the full gap on the gap axis; pad on the perpendicular for grab tolerance
  // when the gap is very thin (1–2px).
  const fillX = isVertical ? gr.x + ox - Math.max(0, (8 - gr.width) / 2) : gr.x + ox;
  const fillY = isVertical ? gr.y + oy : gr.y + oy - Math.max(0, (8 - gr.height) / 2);
  const fillW = isVertical ? Math.max(gr.width, 8) : gr.width;
  const fillH = isVertical ? gr.height : Math.max(gr.height, 8);

  return createPortal(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      data-exclude-gap-detection
      data-node-control="true"
      onMouseDown={handleMouseDown}
      style={{
        position: "absolute",
        left: fillX,
        top: fillY,
        width: fillW,
        height: fillH,
        backgroundColor: isDragging ? "rgba(59, 130, 246, 0.35)" : "rgba(59, 130, 246, 0.18)",
        cursor: isVertical ? "ew-resize" : "ns-resize",
        zIndex: OVERLAY_Z_CANVAS_CONTROLS,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: isDragging ? "none" : "background-color 0.12s ease",
      }}
    >
      {/* Centered line marker */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: isVertical ? 2 : LINE_LENGTH,
          height: isVertical ? LINE_LENGTH : 2,
          background: ACCENT,
          borderRadius: 1,
          opacity: isDragging ? 1 : 0.85,
          pointerEvents: "none",
        }}
      />
      {/* Pixel readout */}
      <span
        style={{
          position: "absolute",
          ...(isVertical
            ? { left: "50%", top: "50%", transform: "translate(-50%, calc(-50% - 16px))" }
            : { left: "50%", top: "50%", transform: "translate(calc(-50% + 18px), -50%)" }),
          fontSize: 11,
          fontWeight: 600,
          color: "#1d4ed8",
          backgroundColor: "rgba(255,255,255,0.95)",
          padding: "1px 5px",
          borderRadius: 3,
          fontFamily: "system-ui, -apple-system, sans-serif",
          pointerEvents: "none",
          userSelect: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      >
        {Math.round(gapHoverInfo.currentGap)}px
      </span>
    </div>,
    portalTarget
  );
}
