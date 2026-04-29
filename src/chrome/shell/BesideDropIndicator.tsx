import { useEditor } from "@craftjs/core";
import { RenderIndicator, getDOMInfo } from "@craftjs/utils";
import React from "react";
import ReactDOM from "react-dom";
import { getBesidePreviewLabel } from "./layoutInference";
import { OVERLAY_Z_DRAG } from "../overlays/overlayZIndex";

function getIndicatorColor(indicator: any, indicatorOptions: any) {
  return indicator?.error
    ? indicatorOptions?.error || "rgb(153 27 27)"
    : indicatorOptions?.success || "currentColor";
}

export function BesideDropIndicator() {
  const { indicator, indicatorOptions, query } = useEditor((state, query) => ({
    indicator: state.indicator,
    indicatorOptions: state.options.indicator,
    query,
  }));

  if (!indicator) return null;

  const { where, currentNode, parent } = indicator.placement;
  if ((where !== "beside-left" && where !== "beside-right") || !currentNode?.dom) {
    return null;
  }

  const nodeInfo = getDOMInfo(currentNode.dom);
  const color = getIndicatorColor(indicator, indicatorOptions);
  const labelText =
    parent?.id && currentNode?.id
      ? getBesidePreviewLabel(query, query.node(parent.id).get(), query.node(currentNode.id).get())
      : "Place beside";
  const overlayWidth = 32;
  const overlayLeft =
    where === "beside-left" ? nodeInfo.left : nodeInfo.left + nodeInfo.outerWidth - overlayWidth;
  const barLeft = where === "beside-left" ? nodeInfo.left : nodeInfo.left + nodeInfo.outerWidth - 4;
  const label = (
    <div
      className="pagehub-beside-indicator-label"
      style={{
        position: "fixed",
        top: nodeInfo.top + 12,
        left: overlayLeft + 12,
        zIndex: OVERLAY_Z_DRAG,
        pointerEvents: "none",
        background: "rgba(255,255,255,0.96)",
        color: "#111",
        borderRadius: 0,
        border: `1px solid ${color}`,
        padding: "6px 8px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        width: `${Math.max(48, overlayWidth - 24)}px`,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        textAlign: "center",
      }}
    >
      {labelText}
    </div>
  );
  const labelRoot = parent?.dom?.ownerDocument?.body || document.body;

  return (
    <>
      <RenderIndicator
        className="pagehub-beside-indicator-overlay"
        style={{
          top: `${nodeInfo.top}px`,
          left: `${overlayLeft}px`,
          width: `${overlayWidth}px`,
          height: `${nodeInfo.outerHeight}px`,
          backgroundColor: color,
          opacity: indicator.error ? 0.18 : 0.07,
          borderRadius: 0,
          borderColor: color,
          borderStyle: "dashed",
          borderWidth: "2px",
        }}
        parentDom={parent?.dom}
      />
      <RenderIndicator
        className="pagehub-beside-indicator-bar"
        style={{
          top: `${nodeInfo.top - 2}px`,
          left: `${barLeft}px`,
          width: "4px",
          height: `${nodeInfo.outerHeight + 4}px`,
          backgroundColor: color,
          borderRadius: 0,
          boxShadow: "0 0 0 4px rgba(255,255,255,0.45), 0 6px 18px rgba(0,0,0,0.18)",
        }}
        parentDom={parent?.dom}
      />
      {ReactDOM.createPortal(label, labelRoot)}
    </>
  );
}
