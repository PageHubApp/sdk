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
  getDragOrigin,
  getCommittedAlignment,
  getAlignmentDom,
  getParentFlexDirection,
} from "./findPosition2D";
import { getBesidePreviewLabel } from "./layoutInference";
import { OVERLAY_Z_DRAG } from "../overlays/overlayZIndex";

// ── Editor accent ────────────────────────────────────────────────────
const EDITOR_ACCENT = "rgb(59 130 246)"; // Tailwind blue-500
const EDITOR_ERROR = "rgb(239 68 68)"; // Tailwind red-500

// ── Shared label ──────────────────────────────────────────────────────

interface DropLabelProps {
  text: string;
  top: number;
  left: number;
  borderColor?: string;
  transform?: string;
  width?: string;
}

function DropLabel({
  text,
  top,
  left,
  borderColor = "currentColor",
  transform,
  width,
}: DropLabelProps) {
  return (
    <div
      className="pagehub-drop-indicator-label"
      style={{
        position: "fixed",
        top,
        left,
        transform,
        zIndex: OVERLAY_Z_DRAG,
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
  const color = indicator?.error ? indicatorOptions?.error || "rgb(153 27 27)" : EDITOR_ACCENT;

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

function ParentOutline({
  parentDom,
  accent = EDITOR_ACCENT,
}: {
  parentDom: HTMLElement;
  accent?: string;
}) {
  const info = getDOMInfo(parentDom);
  return (
    <RenderIndicator
      className="pagehub-parent-outline"
      style={{
        top: `${info.top}px`,
        left: `${info.left}px`,
        width: `${info.outerWidth}px`,
        height: `${info.outerHeight}px`,
        backgroundColor: "transparent",
        border: `2px solid ${accent}`,
        borderRadius: "4px",
        pointerEvents: "none",
        boxSizing: "border-box",
        transition:
          "top 0.1s ease-out, left 0.1s ease-out, width 0.1s ease-out, height 0.1s ease-out",
      }}
      parentDom={parentDom}
    />
  );
}

// ── Reorder slot indicators ───────────────────────────────────────────

/** Horizontal bar for flex-col reorder (existing behavior). */
const SECTION_PARENT_TYPES = new Set(["page", "header", "footer"]);
const COL_SLOT_THICKNESS = 2;
const COL_SECTION_ZONE_HEIGHT = 40;
const COL_SECTION_BAR_THICKNESS = 2;
/** Subtle vertical ticks at the ends of the horizontal slot (reads as insertion, stays thin). */
const COL_SLOT_END_CAP_W = 2;
const COL_SLOT_END_CAP_H = 8;
const COL_SLOT_MIN_WIDTH_FOR_END_CAPS = 28;

/** Row reorder: small horizontal ticks at top/bottom of the vertical insertion line. */
const ROW_SLOT_END_CAP_LEN = 10;
const ROW_SLOT_END_CAP_THICK = 2;
const ROW_SLOT_MIN_HEIGHT_FOR_END_CAPS = 24;

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

  // Section drops keep the 40px visual reservation (faint zone) with a solid bar
  // centered on the boundary. Non-section reorders are a single accent bar + optional end caps.
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
  const showEndCaps = slotWidth >= COL_SLOT_MIN_WIDTH_FOR_END_CAPS;

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
      {showEndCaps && (
        <>
          <RenderIndicator
            className="pagehub-reorder-slot-cap"
            style={{
              top: `${boundary - COL_SLOT_END_CAP_H / 2}px`,
              left: `${slotLeft - COL_SLOT_END_CAP_W / 2}px`,
              width: `${COL_SLOT_END_CAP_W}px`,
              height: `${COL_SLOT_END_CAP_H}px`,
              backgroundColor: contrast,
              borderRadius: "1px",
              pointerEvents: "none",
              transition: "top 0.1s ease-out, left 0.1s ease-out",
            }}
            parentDom={parent.dom}
          />
          <RenderIndicator
            className="pagehub-reorder-slot-cap"
            style={{
              top: `${boundary - COL_SLOT_END_CAP_H / 2}px`,
              left: `${slotLeft + slotWidth - COL_SLOT_END_CAP_W / 2}px`,
              width: `${COL_SLOT_END_CAP_W}px`,
              height: `${COL_SLOT_END_CAP_H}px`,
              backgroundColor: contrast,
              borderRadius: "1px",
              pointerEvents: "none",
              transition: "top 0.1s ease-out, left 0.1s ease-out",
            }}
            parentDom={parent.dom}
          />
        </>
      )}
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

  const lineW = 3;
  const cx = slotLeft + lineW / 2;
  const showRowCaps = slotHeight >= ROW_SLOT_MIN_HEIGHT_FOR_END_CAPS;

  return (
    <>
      <RenderIndicator
        className="pagehub-reorder-slot"
        style={{
          top: `${slotTop}px`,
          left: `${slotLeft}px`,
          width: `${lineW}px`,
          height: `${slotHeight}px`,
          backgroundColor: contrast,
          opacity: 0.55,
          borderRadius: "1.5px",
          pointerEvents: "none",
          transition: "top 0.1s ease-out, left 0.1s ease-out, height 0.1s ease-out",
        }}
        parentDom={parent.dom}
      />
      {showRowCaps && (
        <>
          <RenderIndicator
            className="pagehub-reorder-slot-cap"
            style={{
              top: `${slotTop - ROW_SLOT_END_CAP_THICK / 2}px`,
              left: `${cx - ROW_SLOT_END_CAP_LEN / 2}px`,
              width: `${ROW_SLOT_END_CAP_LEN}px`,
              height: `${ROW_SLOT_END_CAP_THICK}px`,
              backgroundColor: contrast,
              borderRadius: "1px",
              pointerEvents: "none",
              transition: "top 0.1s ease-out, left 0.1s ease-out",
            }}
            parentDom={parent.dom}
          />
          <RenderIndicator
            className="pagehub-reorder-slot-cap"
            style={{
              top: `${slotTop + slotHeight - ROW_SLOT_END_CAP_THICK / 2}px`,
              left: `${cx - ROW_SLOT_END_CAP_LEN / 2}px`,
              width: `${ROW_SLOT_END_CAP_LEN}px`,
              height: `${ROW_SLOT_END_CAP_THICK}px`,
              backgroundColor: contrast,
              borderRadius: "1px",
              pointerEvents: "none",
              transition: "top 0.1s ease-out, left 0.1s ease-out",
            }}
            parentDom={parent.dom}
          />
        </>
      )}
    </>
  );
}

function ReorderSlot({ indicator, accent = EDITOR_ACCENT }: { indicator: any; accent?: string }) {
  const { placement } = indicator;
  const { where, currentNode, parent } = placement;
  if (!parent?.dom) return null;

  const parentInfo = getDOMInfo(parent.dom);
  const contrast = accent;
  const direction = getParentFlexDirection(parent.dom);

  const props = { where, currentNode, parent, parentInfo, contrast };
  return direction === "row" ? <RowReorderSlot {...props} /> : <ColReorderSlot {...props} />;
}

// ── Ghost preview ─────────────────────────────────────────────────────

function GhostPreview({
  indicator,
  query,
  accent = EDITOR_ACCENT,
}: {
  indicator: any;
  query: any;
  accent?: string;
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
      ghostLeft =
        where === "beside-left"
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
      ghostLeft =
        where === "before" ? nodeInfo.left - ghostW - 4 : nodeInfo.left + nodeInfo.outerWidth + 4;
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
        ghostTop =
          where === "before" ? nodeInfo.top - ghostH - 4 : nodeInfo.top + nodeInfo.outerHeight + 4;
      } else {
        ghostTop = parentInfo.top + parentInfo.padding.top;
      }
      ghostLeft = contentLeft + (contentWidth - ghostW) / 2;
    }
  }

  const contrast = accent;

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

  // CraftJS sets indicator.error when the drop is invalid (e.g. dragging Text
  // into a Table that only accepts TableRows). Flip every chrome element red
  // so the user sees the no-drop state on the zone, not just the cursor.
  const accent = indicator?.error ? EDITOR_ERROR : EDITOR_ACCENT;

  // Ghost preview shows on all drag paths
  const ghost = indicator ? (
    <GhostPreview indicator={indicator} query={query} accent={accent} />
  ) : null;
  // Parent outline shows on all drag paths — solid 2px ring around the drop target's parent
  const parentDom = placement?.parent?.dom as HTMLElement | undefined;
  const parentOutline = parentDom ? <ParentOutline parentDom={parentDom} accent={accent} /> : null;

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

  // Reorder slot indicator (default — before/after placement). Renders even when an
  // alignment intent is also committed, since alignment is auxiliary info — the line
  // is the primary "where it lands" feedback.
  if (indicator && (where === "before" || where === "after")) {
    return (
      <>
        {parentOutline}
        <ReorderSlot indicator={indicator} accent={accent} />
        {ghost}
      </>
    );
  }

  // Alignment-only path (no specific reorder slot — cursor is in middle-third zone).
  // Parent outline + ghost preview shifting toward the alignment zone is enough
  // visual feedback; no text labels.
  if (alignmentIntent && indicator?.placement?.parent?.dom) {
    return (
      <>
        {parentOutline}
        {ghost}
      </>
    );
  }

  // Ghost only (no other indicator matched)
  if (ghost) return ghost;

  return null;
}
