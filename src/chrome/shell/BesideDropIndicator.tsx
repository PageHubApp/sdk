import { useEditor } from "@craftjs/core";
import { RenderIndicator, getDOMInfo } from "@craftjs/utils";
import React from "react";
import ReactDOM from "react-dom";

function getIndicatorColor(indicator: any, indicatorOptions: any) {
  return indicator?.error ? indicatorOptions?.error || "rgb(153 27 27)" : indicatorOptions?.success || "currentColor";
}

export function BesideDropIndicator() {
  const { indicator, indicatorOptions } = useEditor((state) => ({
    indicator: state.indicator,
    indicatorOptions: state.options.indicator,
  }));

  if (!indicator) return null;

  const { where, currentNode, parent } = indicator.placement;
  if ((where !== "beside-left" && where !== "beside-right") || !currentNode?.dom) {
    return null;
  }

  const nodeInfo = getDOMInfo(currentNode.dom);
  const color = getIndicatorColor(indicator, indicatorOptions);
  const overlayWidth = Math.max(72, Math.min(nodeInfo.outerWidth * 0.42, 220));
  const overlayLeft =
    where === "beside-left" ? nodeInfo.left : nodeInfo.left + nodeInfo.outerWidth - overlayWidth;
  const barLeft = where === "beside-left" ? nodeInfo.left : nodeInfo.left + nodeInfo.outerWidth - 4;
  const labelLeft =
    where === "beside-left"
      ? Math.min(nodeInfo.left + 16, nodeInfo.left + nodeInfo.outerWidth - 110)
      : Math.max(nodeInfo.left + nodeInfo.outerWidth - 110, nodeInfo.left + 16);

  const label = (
    <div
      className="pagehub-beside-indicator-label"
      style={{
        position: "fixed",
        top: nodeInfo.top + 12,
        left: labelLeft,
        zIndex: 100000,
        pointerEvents: "none",
        background: color,
        color: "#fff",
        borderRadius: 0,
        padding: "6px 10px",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.02em",
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
      }}
    >
      Place beside
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
          opacity: indicator.error ? 0.18 : 0.14,
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
