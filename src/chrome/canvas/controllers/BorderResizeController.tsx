/**
 * BorderResizeController — Framer-style edge resize.
 *
 * Mounts globally (next to DropZoneIndicator). Watches the currently selected
 * node and, when the cursor is within 6px of its right/bottom edge, flips
 * the cursor to ew-resize/ns-resize (no overlay strip — direct cursor on the
 * element). Click-drag from that band starts a resize. On release, the inline
 * width/height is converted to a snapped Tailwind class.
 *
 * Renders a hover affordance (thin blue line along the active edge + size pill)
 * via a rotated wrapper portaled into #viewport, modeled on GapDragControl.
 *
 * Gated: skips Container, Background, and section-level layout primitives
 * (type=page/header/footer). Containers auto-size to children — resizing them
 * by drag breaks layout.
 */

import { useEditor } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { twMerge } from "tailwind-merge";
import { EditModifiersAtom } from "../../toolbar/Label";
import { ViewAtom } from "../../viewport/state/atoms";
import {
  editorCanvasViewToClassPrefixKey,
  buildVariantPrefix,
} from "../../../utils/tailwind/className";
import { checkIfAncestorLinked } from "../../../utils/component/componentUtils";
import { useAtomValue } from "@zedux/react";
import { setEdgeResizeActive } from "../state/edgeResizeState";
import { getNodeGeometry, projectToLocalAxis } from "../state/nodeGeometry";
import { getNodeOverlayPosition } from "../state/nodeOverlayPosition";
import { isRotateActive, subscribeRotate } from "../state/rotateActiveState";
import { OVERLAY_Z_CANVAS_CONTROLS } from "../../popovers/overlayZIndex";

const SKIP_DISPLAY_NAMES = new Set(["Container", "Background"]);
const SKIP_TYPES = new Set(["page", "header", "footer"]);
const BORDER_BAND = 6; // px from edge to flip cursor
const ROTATE_CORNER_RADIUS = 18; // skip resize zone inside this radius of bottom-left
// corner — RotateHandleController owns it.

const ACCENT = "rgb(59 130 246)"; // matches --ph-editor-accent

type Side = "right" | "bottom";

// Always write arbitrary pixel values — no fraction or Tailwind-spacing snap.
function widthClass(px: number) {
  const v = Math.max(0, Math.round(px));
  return { cls: `w-[${v}px]`, px: v };
}
function heightClass(px: number) {
  const v = Math.max(0, Math.round(px));
  return { cls: `h-[${v}px]`, px: v };
}

// ── Edge detection ──────────────────────────────────────────────────────

function detectEdge(el: HTMLElement, x: number, y: number): Side | null {
  // Convert cursor into the element's local (un-rotated) frame so detection
  // tracks rotated edges instead of the AABB.
  const g = getNodeGeometry(el);
  const lp = g.toLocal(x, y);
  const halfW = g.w / 2;
  const halfH = g.h / 2;

  if (lp.x < -halfW - BORDER_BAND || lp.x > halfW + BORDER_BAND) return null;
  if (lp.y < -halfH - BORDER_BAND || lp.y > halfH + BORDER_BAND) return null;

  // Bottom-left corner (in local coords) reserved for the rotate handle.
  const dx = lp.x - -halfW;
  const dy = lp.y - halfH;
  if (dx * dx + dy * dy <= ROTATE_CORNER_RADIUS * ROTATE_CORNER_RADIUS) return null;

  const fromRight = Math.abs(lp.x - halfW);
  const fromBottom = Math.abs(lp.y - halfH);

  if (fromRight <= BORDER_BAND && lp.y >= -halfH && lp.y <= halfH) return "right";
  if (fromBottom <= BORDER_BAND && lp.x >= -halfW && lp.x <= halfW) return "bottom";
  return null;
}

// ── Component ───────────────────────────────────────────────────────────

export function BorderResizeController() {
  const { selectedId, displayName, propsType, dom, isLocked } = useEditor((state, query) => {
    const all = query.getEvent("selected").all();
    const id = all[0];
    if (!id)
      return { selectedId: null, displayName: null, propsType: null, dom: null, isLocked: false };
    const node = query.node(id).get();
    return {
      selectedId: id,
      displayName: (node?.data?.custom?.displayName as string) || node?.data?.displayName || null,
      propsType: node?.data?.props?.type ?? null,
      dom: node?.dom ?? null,
      // Linked-component clones (relationType "full" or "content") re-derive
      // className from master, so resize writes never persist. Hide controls.
      isLocked: checkIfAncestorLinked(id, query),
    };
  });

  const { actions } = useEditor();
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(EditModifiersAtom).dark ?? false;
  const classPrefixView = editorCanvasViewToClassPrefixKey(view);

  const [hoveredSide, setHoveredSide] = useState<Side | null>(null);
  const [draggingSide, setDraggingSide] = useState<Side | null>(null);
  const dragRef = useRef<{
    side: Side;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    angle: number;
    finalW: number;
    finalH: number;
  } | null>(null);

  const isResizable =
    selectedId &&
    dom &&
    !isLocked &&
    !SKIP_DISPLAY_NAMES.has(displayName ?? "") &&
    !SKIP_TYPES.has(propsType ?? "");

  // ── Hover: set body[data-ph-edge] so a global CSS rule forces the cursor ─
  // (setting cursor on the element doesn't override children with their own
  // cursor: pointer / etc — a body-level !important rule does.)
  useEffect(() => {
    if (!isResizable || !dom || draggingSide) return;
    const el = dom as HTMLElement;

    const clearHover = () => {
      if (document.body.dataset.phEdge) {
        delete document.body.dataset.phEdge;
        setEdgeResizeActive(false);
      }
      setHoveredSide(prev => (prev ? null : prev));
    };

    const onMove = (e: MouseEvent) => {
      // Rotation drag in flight — let the rotate controller own the cursor
      // entirely; don't fight for the edge band the user might cross.
      if (isRotateActive()) {
        clearHover();
        return;
      }
      // Only run edge detection when the cursor is inside #viewport (the canvas).
      // Without this, the listener fires for sidebar/toolbox mousemoves and can
      // flip cursor / set body[data-ph-edge], which interferes with sidebar drag.
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest("#viewport")) {
        clearHover();
        return;
      }
      const side = detectEdge(el, e.clientX, e.clientY);
      if (!side) {
        clearHover();
        return;
      }
      document.body.dataset.phEdge = side;
      setEdgeResizeActive(true);
      setHoveredSide(prev => (prev === side ? prev : side));
    };

    // Also flush hover state the moment a rotation starts, so a stale
    // affordance doesn't linger until the next mousemove tick.
    const unsubRotate = subscribeRotate(rotating => {
      if (rotating) clearHover();
    });

    document.addEventListener("mousemove", onMove);
    return () => {
      document.removeEventListener("mousemove", onMove);
      unsubRotate();
      delete document.body.dataset.phEdge;
      setEdgeResizeActive(false);
      setHoveredSide(null);
    };
  }, [isResizable, dom, draggingSide]);

  // ── Mousedown capture: start drag if cursor is on a resize edge ──────
  useEffect(() => {
    if (!isResizable || !dom) return;
    const el = dom as HTMLElement;

    const onDown = (e: MouseEvent) => {
      if (isRotateActive()) return;
      // Capture-phase listener — gate to canvas so sidebar/toolbox mousedowns
      // (which start native HTML5 drags) aren't preventDefault'd by us.
      const t = e.target as HTMLElement | null;
      if (!t || !t.closest("#viewport")) return;
      const side = detectEdge(el, e.clientX, e.clientY);
      if (!side) return;
      e.preventDefault();
      e.stopPropagation();
      const g = getNodeGeometry(el);
      dragRef.current = {
        side,
        startX: e.clientX,
        startY: e.clientY,
        startW: g.w,
        startH: g.h,
        angle: g.angle,
        finalW: g.w,
        finalH: g.h,
      };
      setDraggingSide(side);
      setEdgeResizeActive(true);
      document.body.dataset.phEdge = side;
    };

    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [isResizable, dom]);

  // ── Active drag: track mousemove, write inline style ─────────────────
  useEffect(() => {
    if (!draggingSide || !dom || !selectedId) return;
    const el = dom as HTMLElement;

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      // Project mouse delta onto the element's rotated local axis so dragging
      // the visually-rotated edge grows the dimension along that edge.
      const local = projectToLocalAxis(e.clientX - d.startX, e.clientY - d.startY, d.angle);
      if (d.side === "bottom") {
        const next = Math.max(0, d.startH + local.dy);
        const snapped = heightClass(next);
        el.style.height = `${snapped.px}px`;
        d.finalH = snapped.px;
      } else {
        const next = Math.max(0, d.startW + local.dx);
        const snapped = widthClass(next);
        el.style.width = `${snapped.px}px`;
        d.finalW = snapped.px;
      }
    };

    const onUp = () => {
      const d = dragRef.current;
      dragRef.current = null;
      setDraggingSide(null);
      setEdgeResizeActive(false);
      delete document.body.dataset.phEdge;
      if (!d) return;

      const prefix = buildVariantPrefix(classPrefixView, classDark);
      if (d.side === "bottom") {
        el.style.height = "";
        const snapped = heightClass(d.finalH);
        actions.setProp(selectedId, (p: any) => {
          p.className = twMerge(p.className || "", prefix + snapped.cls);
        });
      } else {
        el.style.width = "";
        const snapped = widthClass(d.finalW);
        actions.setProp(selectedId, (p: any) => {
          p.className = twMerge(p.className || "", prefix + snapped.cls);
        });
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [draggingSide, dom, selectedId, actions, classPrefixView, classDark]);

  // ── Live tick for the affordance readout (drag changes geometry) ─────
  const [, forceRender] = useState(0);
  useEffect(() => {
    if (!hoveredSide && !draggingSide) return;
    const id = setInterval(() => forceRender(n => n + 1), 50);
    return () => clearInterval(id);
  }, [hoveredSide, draggingSide]);

  // ── Render hover affordance ──────────────────────────────────────────
  const activeSide = draggingSide || hoveredSide;
  if (!isResizable || !dom || !activeSide || isLocked) return null;
  const portalTarget = typeof document !== "undefined" ? document.getElementById("viewport") : null;
  if (!portalTarget) return null;

  const pos = getNodeOverlayPosition(dom as HTMLElement, portalTarget);
  const isRight = activeSide === "right";
  const dim = isRight ? Math.round(pos.width) : Math.round(pos.height);

  return ReactDOM.createPortal(
    <div
      data-exclude-gap-detection
      data-node-control="true"
      style={{
        position: "absolute",
        left: pos.left,
        top: pos.top,
        width: pos.width,
        height: pos.height,
        transform: `rotate(${pos.angle}deg)`,
        transformOrigin: "center center",
        pointerEvents: "none",
        zIndex: OVERLAY_Z_CANVAS_CONTROLS,
      }}
    >
      {/* Edge line */}
      <div
        style={{
          position: "absolute",
          ...(isRight
            ? { right: -1, top: 0, width: 2, height: "100%" }
            : { bottom: -1, left: 0, height: 2, width: "100%" }),
          background: ACCENT,
          opacity: 0.85,
          borderRadius: 1,
        }}
      />
      {/* Center handle dot */}
      <div
        style={{
          position: "absolute",
          ...(isRight
            ? { right: -3, top: "50%", marginTop: -3 }
            : { bottom: -3, left: "50%", marginLeft: -3 }),
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "white",
          border: `1.5px solid ${ACCENT}`,
        }}
      />
      {/* Size pill */}
      <div
        style={{
          position: "absolute",
          ...(isRight
            ? { left: "100%", top: "50%", transform: "translate(8px, -50%)" }
            : { top: "100%", left: "50%", transform: "translate(-50%, 8px)" }),
          fontSize: 11,
          fontWeight: 600,
          color: "#1d4ed8",
          backgroundColor: "rgba(255,255,255,0.95)",
          padding: "1px 5px",
          borderRadius: 3,
          fontFamily: "system-ui, -apple-system, sans-serif",
          userSelect: "none",
          whiteSpace: "nowrap",
          boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        }}
      >
        {dim}px
      </div>
    </div>,
    portalTarget
  );
}
