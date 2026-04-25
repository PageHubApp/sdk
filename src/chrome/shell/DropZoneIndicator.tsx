/**
 * DropZoneIndicator — unified drag preview for beside + cross-axis alignment.
 *
 * Beside: Craft `where` beside-left/right. Alignment: `getCommittedAlignment()` from
 * findPosition2D → spatial/detectAlignCrossFromDrag (direction + parent middle-third).
 * Single detector path — no separate dwell/zone AlignmentDropIndicator.
 */

import { useEditor } from "@craftjs/core";
import { RenderIndicator, getDOMInfo } from "@craftjs/utils";
import React from "react";
import ReactDOM from "react-dom";
import {
  getAlignmentPreviewLabel,
  wouldUseInnerAlignment,
  type AlignmentIntent,
} from "./alignmentInference";
import { getDragOrigin, getCommittedAlignment, getAlignmentDom, getParentFlexDirection } from "./findPosition2D";
import { getBesidePreviewLabel } from "./layoutInference";

// ── Contrast color helper ────────────────────────────────────────────
// Reads the effective background color of a DOM element (walks parents
// if transparent) and returns black or white for maximum contrast.
// Cached by element — only recomputes when the element ref changes.

// WeakMap — entries are GC'd when the DOM element is collected, no manual cleanup needed.
const _contrastCache = new WeakMap<HTMLElement, string>();

// Singleton canvas context for normalizing any CSS color (oklch, lab, etc.) to hex
// Singleton 1px canvas — converts any CSS color (oklch, lab, etc.) to raw RGBA bytes.
let _colorCtx: CanvasRenderingContext2D | null = null;
function cssColorToRGBA(color: string): [number, number, number, number] | null {
  if (!_colorCtx) {
    const c = document.createElement("canvas");
    c.width = 1;
    c.height = 1;
    _colorCtx = c.getContext("2d", { willReadFrequently: true });
  }
  if (!_colorCtx) return null;
  _colorCtx.clearRect(0, 0, 1, 1);
  _colorCtx.fillStyle = color;
  _colorCtx.fillRect(0, 0, 1, 1);
  const d = _colorCtx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2], d[3]];
}

function getEffectiveBgColor(el: HTMLElement): [number, number, number] | null {
  let current: HTMLElement | null = el;
  while (current) {
    const bg = window.getComputedStyle(current).backgroundColor;
    if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
      const rgba = cssColorToRGBA(bg);
      if (rgba && rgba[3] > 75) { // alpha > ~30% means visually opaque enough
        return [rgba[0], rgba[1], rgba[2]];
      }
    }
    current = current.parentElement;
  }
  return null;
}

function getContrastColor(el: HTMLElement | null | undefined): string {
  if (!el) return "#111";
  const cached = _contrastCache.get(el);
  if (cached) return cached;

  const rgb = getEffectiveBgColor(el);
  if (!rgb) {
    _contrastCache.set(el, "#111");
    return "#111";
  }

  // Relative luminance (sRGB)
  const [r, g, b] = rgb.map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const color = L > 0.4 ? "#111" : "#fff";
  _contrastCache.set(el, color);
  return color;
}

/** Contrasting halo shadow — white on dark, dark on light. */
function getContrastShadow(el: HTMLElement | null | undefined): string {
  const color = getContrastColor(el);
  const halo = color === "#fff" ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.25)";
  return `0 0 0 3px ${halo}`;
}

// ── Shared label ──────────────────────────────────────────────────────

interface DropLabelProps {
  text: string;
  top: number;
  left: number;
  borderColor?: string;
  transform?: string;
  width?: string;
}

function DropLabel({ text, top, left, borderColor = "currentColor", transform, width }: DropLabelProps) {
  return (
    <div
      className="pagehub-drop-indicator-label"
      style={{
        position: "fixed",
        top,
        left,
        transform,
        zIndex: 100000,
        pointerEvents: "none",
        background: "rgba(255,255,255,0.96)",
        color: "#111",
        borderRadius: 0,
        border: `1px solid ${borderColor}`,
        padding: "6px 8px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        whiteSpace: "nowrap",
        textAlign: "center",
        width,
        overflow: width ? "hidden" : undefined,
        textOverflow: width ? "ellipsis" : undefined,
      }}
    >
      {text}
    </div>
  );
}

// ── Beside indicator overlay ──────────────────────────────────────────

function BesideOverlay({
  indicator,
  indicatorOptions,
  query,
}: {
  indicator: any;
  indicatorOptions: any;
  query: any;
}) {
  const { where, currentNode, parent } = indicator.placement;
  if ((where !== "beside-left" && where !== "beside-right") || !currentNode?.dom) {
    return null;
  }

  const nodeInfo = getDOMInfo(currentNode.dom);
  const contrastCol = getContrastColor(currentNode.dom);
  const color = indicator?.error
    ? indicatorOptions?.error || "rgb(153 27 27)"
    : contrastCol;

  const labelText =
    parent?.id && currentNode?.id
      ? getBesidePreviewLabel(query, query.node(parent.id).get(), query.node(currentNode.id).get())
      : "Place beside";

  const barWidth = 2;
  const barLeft =
    where === "beside-left"
      ? nodeInfo.left - barWidth / 2
      : nodeInfo.left + nodeInfo.outerWidth - barWidth / 2;
  const labelRoot = parent?.dom?.ownerDocument?.body || document.body;

  return (
    <>
      <RenderIndicator
        className="pagehub-beside-indicator-bar"
        style={{
          top: `${nodeInfo.top}px`,
          left: `${barLeft}px`,
          width: `${barWidth}px`,
          height: `${nodeInfo.outerHeight}px`,
          backgroundColor: color,
          borderRadius: 0,
          pointerEvents: "none",
        }}
        parentDom={parent?.dom}
      />
      {ReactDOM.createPortal(
        <DropLabel
          text={labelText}
          top={nodeInfo.top + 12}
          left={barLeft + (where === "beside-left" ? 8 : -8)}
          borderColor={color}
          transform={where === "beside-right" ? "translateX(-100%)" : undefined}
        />,
        labelRoot
      )}
    </>
  );
}

// ── Parent outline ────────────────────────────────────────────────────
// Solid 2px ring around the drop target's parent. Renders for every drop path
// (beside / alignment / reorder) so the user sees scope at a glance.

function ParentOutline({ parentDom }: { parentDom: HTMLElement }) {
  const info = getDOMInfo(parentDom);
  const contrast = getContrastColor(parentDom);
  return (
    <RenderIndicator
      className="pagehub-parent-outline"
      style={{
        top: `${info.top}px`,
        left: `${info.left}px`,
        width: `${info.outerWidth}px`,
        height: `${info.outerHeight}px`,
        backgroundColor: "transparent",
        border: `2px solid ${contrast}`,
        borderRadius: "4px",
        pointerEvents: "none",
        boxSizing: "border-box",
        transition: "top 0.1s ease-out, left 0.1s ease-out, width 0.1s ease-out, height 0.1s ease-out",
      }}
      parentDom={parentDom}
    />
  );
}

// ── Alignment indicator overlay ───────────────────────────────────────

function AlignmentOverlay({
  intent,
  renderDom,
  isInner,
}: {
  intent: AlignmentIntent;
  renderDom: HTMLElement;
  isInner: boolean;
}) {
  const rect = renderDom.getBoundingClientRect();
  const labelText = getAlignmentPreviewLabel(intent, isInner);
  const isCenter = intent.zone === "center";
  const contrast = getContrastColor(renderDom);

  let overlayTop: number, overlayLeft: number, overlayWidth: number, overlayHeight: number;

  if (intent.axis === "horizontal") {
    const zoneW = 32;
    overlayTop = rect.top;
    overlayHeight = rect.height;
    overlayWidth = zoneW;
    overlayLeft = intent.zone === "start" ? rect.left : rect.left + rect.width - zoneW;
  } else {
    const zoneH = 32;
    overlayLeft = rect.left;
    overlayWidth = rect.width;
    overlayHeight = zoneH;
    overlayTop = intent.zone === "start" ? rect.top : rect.top + rect.height - zoneH;
  }

  const labelLeft = isCenter ? rect.left + rect.width / 2 : overlayLeft + overlayWidth / 2;
  const labelTop = isCenter ? rect.top + rect.height / 2 - 12 : overlayTop + 12;
  const labelRoot = renderDom.ownerDocument?.body || document.body;

  return (
    <>
      {!isCenter && (
        <RenderIndicator
          className="pagehub-alignment-indicator-overlay"
          style={{
            top: `${overlayTop}px`,
            left: `${overlayLeft}px`,
            width: `${overlayWidth}px`,
            height: `${overlayHeight}px`,
            backgroundColor: contrast,
            opacity: 0.08,
            borderRadius: 0,
            borderColor: contrast,
            borderStyle: "dashed",
            borderWidth: "1px",
            pointerEvents: "none",
          }}
          parentDom={renderDom}
        />
      )}
      {ReactDOM.createPortal(
        <DropLabel text={labelText} top={labelTop} left={labelLeft} borderColor={contrast} transform="translateX(-50%)" />,
        labelRoot
      )}
    </>
  );
}

// ── Reorder slot indicators ───────────────────────────────────────────

/** Horizontal bar for flex-col reorder (existing behavior). */
const SECTION_PARENT_TYPES = new Set(["page", "header", "footer"]);
const COL_SLOT_THICKNESS = 2;
const COL_SECTION_ZONE_HEIGHT = 40;
const COL_SECTION_BAR_THICKNESS = 2;

function ColReorderSlot({
  where,
  currentNode,
  parent,
  parentInfo,
  contrast,
}: {
  where: string;
  currentNode: any;
  parent: any;
  parentInfo: ReturnType<typeof getDOMInfo>;
  contrast: string;
}) {
  const slotLeft = parentInfo.left + parentInfo.padding.left;
  const slotWidth =
    parentInfo.outerWidth -
    parentInfo.padding.left -
    parentInfo.padding.right -
    parentInfo.margin.left -
    parentInfo.margin.right;

  // Section drops keep the 40px visual reservation (faint zone) with a 2px solid bar
  // centered on the boundary. Non-section reorders are just a 2px solid line.
  const isSectionDrop = SECTION_PARENT_TYPES.has(parent?.data?.props?.type);

  let boundary: number;
  if (currentNode?.dom) {
    const nodeInfo = getDOMInfo(currentNode.dom);
    boundary = where === "before" ? nodeInfo.top : nodeInfo.top + nodeInfo.outerHeight;
  } else {
    boundary = parentInfo.top + parentInfo.padding.top;
  }

  const barThickness = isSectionDrop ? COL_SECTION_BAR_THICKNESS : COL_SLOT_THICKNESS;
  const barTop = boundary - barThickness / 2;

  return (
    <>
      {isSectionDrop && (
        <RenderIndicator
          className="pagehub-reorder-slot-zone"
          style={{
            top: `${boundary - COL_SECTION_ZONE_HEIGHT / 2}px`,
            left: `${slotLeft}px`,
            width: `${slotWidth}px`,
            height: `${COL_SECTION_ZONE_HEIGHT}px`,
            backgroundColor: contrast,
            opacity: 0.06,
            borderRadius: "8px",
            pointerEvents: "none",
            transition: "top 0.1s ease-out, left 0.1s ease-out, width 0.1s ease-out",
          }}
          parentDom={parent.dom}
        />
      )}
      <RenderIndicator
        className="pagehub-reorder-slot"
        style={{
          top: `${barTop}px`,
          left: `${slotLeft}px`,
          width: `${slotWidth}px`,
          height: `${barThickness}px`,
          backgroundColor: contrast,
          opacity: 1,
          borderRadius: 0,
          pointerEvents: "none",
          transition: "top 0.1s ease-out, left 0.1s ease-out, width 0.1s ease-out",
        }}
        parentDom={parent.dom}
      />
    </>
  );
}

/** Vertical bar for flex-row reorder. */
function RowReorderSlot({
  where,
  currentNode,
  parent,
  parentInfo,
  contrast,
}: {
  where: string;
  currentNode: any;
  parent: any;
  parentInfo: ReturnType<typeof getDOMInfo>;
  contrast: string;
}) {
  const slotTop = parentInfo.top + parentInfo.padding.top;
  const slotHeight =
    parentInfo.outerHeight -
    parentInfo.padding.top -
    parentInfo.padding.bottom -
    parentInfo.margin.top -
    parentInfo.margin.bottom;

  let slotLeft: number;
  if (currentNode?.dom) {
    const nodeInfo = getDOMInfo(currentNode.dom);
    slotLeft = where === "before" ? nodeInfo.left - 1 : nodeInfo.left + nodeInfo.outerWidth - 1;
  } else {
    slotLeft = parentInfo.left + parentInfo.padding.left;
  }

  return (
    <RenderIndicator
      className="pagehub-reorder-slot"
      style={{
        top: `${slotTop}px`,
        left: `${slotLeft}px`,
        width: "3px",
        height: `${slotHeight}px`,
        backgroundColor: contrast,
        opacity: 0.55,
        borderRadius: "1.5px",
        pointerEvents: "none",
        boxShadow: getContrastShadow(parent.dom),
        transition: "top 0.1s ease-out, left 0.1s ease-out, height 0.1s ease-out",
      }}
      parentDom={parent.dom}
    />
  );
}

function ReorderSlot({ indicator }: { indicator: any }) {
  const { placement } = indicator;
  const { where, currentNode, parent } = placement;
  if (!parent?.dom) return null;

  const parentInfo = getDOMInfo(parent.dom);
  const contrast = getContrastColor(parent.dom);
  const direction = getParentFlexDirection(parent.dom);

  const props = { where, currentNode, parent, parentInfo, contrast };
  return direction === "row" ? <RowReorderSlot {...props} /> : <ColReorderSlot {...props} />;
}

// ── Ghost preview ─────────────────────────────────────────────────────

function GhostPreview({
  indicator,
  query,
}: {
  indicator: any;
  query: any;
}) {
  const origin = getDragOrigin();
  if (!origin?.nodeId) return null;

  const originNode = query.node(origin.nodeId).get();
  const originDom = originNode?.dom as HTMLElement | undefined;
  if (!originDom) return null;

  const { placement } = indicator;
  const { where, currentNode, parent } = placement;
  if (!parent?.dom) return null;

  const originRect = originDom.getBoundingClientRect();
  const parentDom = parent.dom as HTMLElement;
  const isRow = getParentFlexDirection(parentDom) === "row";
  const parentInfo = getDOMInfo(parentDom);

  const ghostW = originRect.width;
  const ghostH = originRect.height;

  let ghostTop: number;
  let ghostLeft: number;

  if (where === "beside-left" || where === "beside-right") {
    // Beside: show ghost next to the target child
    if (currentNode?.dom) {
      const nodeInfo = getDOMInfo(currentNode.dom);
      ghostTop = nodeInfo.top;
      ghostLeft = where === "beside-left"
        ? nodeInfo.left - ghostW - 8
        : nodeInfo.left + nodeInfo.outerWidth + 8;
    } else {
      return null;
    }
  } else if (isRow) {
    // Row layout: ghost positioned horizontally
    if (currentNode?.dom) {
      const nodeInfo = getDOMInfo(currentNode.dom);
      ghostTop = nodeInfo.top;
      ghostLeft = where === "before"
        ? nodeInfo.left - ghostW - 4
        : nodeInfo.left + nodeInfo.outerWidth + 4;
    } else {
      ghostTop = parentInfo.top + parentInfo.padding.top;
      ghostLeft = parentInfo.left + parentInfo.padding.left;
    }
  } else {
    // Column layout
    const committed = getCommittedAlignment();
    const alignZone = committed?.intent?.axis === "horizontal" ? committed.intent.zone : null;
    const contentLeft = parentInfo.left + parentInfo.padding.left;
    const contentWidth = parentInfo.outerWidth - parentInfo.padding.left - parentInfo.padding.right;

    if (alignZone) {
      // Alignment is primary — ghost stays at origin's vertical position, shifts horizontally
      ghostTop = originRect.top;
      if (alignZone === "start") {
        ghostLeft = contentLeft;
      } else if (alignZone === "end") {
        ghostLeft = contentLeft + contentWidth - ghostW;
      } else {
        ghostLeft = contentLeft + (contentWidth - ghostW) / 2;
      }
    } else {
      // Pure reorder — ghost at the insertion point
      if (currentNode?.dom) {
        const nodeInfo = getDOMInfo(currentNode.dom);
        ghostTop = where === "before"
          ? nodeInfo.top - ghostH - 4
          : nodeInfo.top + nodeInfo.outerHeight + 4;
      } else {
        ghostTop = parentInfo.top + parentInfo.padding.top;
      }
      ghostLeft = contentLeft + (contentWidth - ghostW) / 2;
    }
  }

  const contrast = getContrastColor(parentDom);

  return (
    <RenderIndicator
      className="pagehub-ghost-preview"
      style={{
        top: `${ghostTop}px`,
        left: `${ghostLeft}px`,
        width: `${ghostW}px`,
        height: `${ghostH}px`,
        backgroundColor: contrast,
        opacity: 0.08,
        border: `2px dashed ${contrast}`,
        borderRadius: "4px",
        pointerEvents: "none",
        transition: "top 0.1s ease-out, left 0.1s ease-out",
      }}
      parentDom={parentDom}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────

export function DropZoneIndicator() {
  const { indicator, indicatorOptions, query } = useEditor((state, query) => ({
    indicator: state.indicator,
    indicatorOptions: state.options.indicator,
    query,
  }));

  // ── Resolve indicator state ───────────────────────────────────────
  const placement = indicator?.placement;
  const where = placement?.where;
  const isBeside = where === "beside-left" || where === "beside-right";

  // Cross-axis: getCommittedAlignment(). Primary placement tier: getLastResolvedIntent() (exported from findPosition2D).
  const committedAlignment = getCommittedAlignment();
  const alignmentIntent = committedAlignment?.intent ?? null;
  const alignmentDom = getAlignmentDom();

  // ── Render ────────────────────────────────────────────────────────

  // Ghost preview shows on all drag paths
  const ghost = indicator ? <GhostPreview indicator={indicator} query={query} /> : null;
  // Parent outline shows on all drag paths — solid 2px ring around the drop target's parent
  const parentDom = placement?.parent?.dom as HTMLElement | undefined;
  const parentOutline = parentDom ? <ParentOutline parentDom={parentDom} /> : null;

  // Beside indicator takes priority (immediate, no dwell)
  if (isBeside && indicator) {
    return (
      <>
        {parentOutline}
        <BesideOverlay indicator={indicator} indicatorOptions={indicatorOptions} query={query} />
        {ghost}
      </>
    );
  }

  // Direction-based alignment indicator
  if (alignmentIntent && indicator?.placement?.parent?.dom) {
    const origin = getDragOrigin();
    const originNode = origin?.nodeId ? query.node(origin.nodeId).get() : null;
    const originDom = originNode?.dom as HTMLElement | undefined;

    if (originDom) {
      const rect = originDom.getBoundingClientRect();
      const contrast = getContrastColor(indicator.placement.parent.dom);
      const labelText =
        alignmentIntent.axis === "horizontal"
          ? alignmentIntent.zone === "start"
            ? "Align left"
            : alignmentIntent.zone === "end"
              ? "Align right"
              : "Center"
          : alignmentIntent.zone === "start"
            ? "Align top"
            : alignmentIntent.zone === "end"
              ? "Align bottom"
              : "Center";

      const labelRoot = originDom.ownerDocument?.body || document.body;

      return (
        <>
          {parentOutline}
          {/* Highlight the node being aligned */}
          <RenderIndicator
            className="pagehub-align-indicator"
            style={{
              top: `${rect.top}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              height: `${rect.height}px`,
              backgroundColor: contrast,
              opacity: 0.06,
              borderRadius: "4px",
              border: `1px dashed ${contrast}`,
              pointerEvents: "none",
              transition: "all 0.1s ease-out",
            }}
            parentDom={indicator.placement.parent.dom}
          />
          {ReactDOM.createPortal(
            <DropLabel
              text={labelText}
              top={rect.top + rect.height / 2 - 12}
              left={rect.left + rect.width / 2}
              borderColor={contrast}
              transform="translateX(-50%)"
            />,
            labelRoot
          )}
          {ghost}
        </>
      );
    }
  }

  // Reorder slot indicator (default — before/after placement)
  if (indicator && (where === "before" || where === "after")) {
    return (
      <>
        {parentOutline}
        <ReorderSlot indicator={indicator} />
        {ghost}
      </>
    );
  }

  // Ghost only (no other indicator matched)
  if (ghost) return ghost;

  return null;
}
