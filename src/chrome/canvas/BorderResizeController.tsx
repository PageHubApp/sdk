/**
 * BorderResizeController — Framer-style edge resize.
 *
 * Mounts globally (next to DropZoneIndicator). Watches the currently selected
 * node and, when the cursor is within 2px of its left/right/bottom edge, flips
 * the cursor to ew-resize/ns-resize (no overlay strip — direct cursor on the
 * element). Click-drag from that band starts a resize. On release, the inline
 * width/height is converted to a snapped Tailwind class.
 *
 * Gated: skips Container, Background, and section-level layout primitives
 * (type=page/header/footer). Containers auto-size to children — resizing them
 * by drag breaks layout.
 */

import { useEditor } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ViewSelectionAtom } from "../toolbar/Label";
import { ViewAtom } from "../viewport/atoms";
import { editorCanvasViewToClassPrefixKey, buildVariantPrefix } from "../../utils/tailwind/className";
import { useAtomValue } from "@zedux/react";
import { setEdgeResizeActive } from "./edgeResizeState";

const SKIP_DISPLAY_NAMES = new Set(["Container", "Background"]);
const SKIP_TYPES = new Set(["page", "header", "footer"]);
const BORDER_BAND = 6; // px from edge to flip cursor

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
  const r = el.getBoundingClientRect();
  if (x < r.left - BORDER_BAND || x > r.right + BORDER_BAND) return null;
  if (y < r.top - BORDER_BAND || y > r.bottom + BORDER_BAND) return null;

  const fromRight = Math.abs(x - r.right);
  const fromBottom = Math.abs(y - r.bottom);

  if (fromRight <= BORDER_BAND && y >= r.top && y <= r.bottom) return "right";
  if (fromBottom <= BORDER_BAND && x >= r.left && x <= r.right) return "bottom";
  return null;
}

// ── Component ───────────────────────────────────────────────────────────

export function BorderResizeController() {
  const { selectedId, displayName, propsType, dom } = useEditor((state, query) => {
    const all = query.getEvent("selected").all();
    const id = all[0];
    if (!id) return { selectedId: null, displayName: null, propsType: null, dom: null };
    const node = query.node(id).get();
    return {
      selectedId: id,
      displayName: (node?.data?.custom?.displayName as string) || node?.data?.displayName || null,
      propsType: node?.data?.props?.type ?? null,
      dom: node?.dom ?? null,
    };
  });

  const { actions } = useEditor();
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classPrefixView = editorCanvasViewToClassPrefixKey(view);

  const [draggingSide, setDraggingSide] = useState<Side | null>(null);
  const dragRef = useRef<{
    side: Side;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
    finalW: number;
    finalH: number;
  } | null>(null);

  const isResizable =
    selectedId &&
    dom &&
    !SKIP_DISPLAY_NAMES.has(displayName ?? "") &&
    !SKIP_TYPES.has(propsType ?? "");

  // ── Hover: flip cursor on the selected element when near edge ────────
  useEffect(() => {
    if (!isResizable || !dom || draggingSide) return;
    const el = dom as HTMLElement;
    const prevCursor = el.style.cursor;

    const onMove = (e: MouseEvent) => {
      const side = detectEdge(el, e.clientX, e.clientY);
      if (!side) {
        if (el.style.cursor === "ew-resize" || el.style.cursor === "ns-resize") {
          el.style.cursor = prevCursor;
        }
        setEdgeResizeActive(false);
        return;
      }
      el.style.cursor = side === "bottom" ? "ns-resize" : "ew-resize";
      setEdgeResizeActive(true);
    };

    document.addEventListener("mousemove", onMove);
    return () => {
      document.removeEventListener("mousemove", onMove);
      el.style.cursor = prevCursor;
      setEdgeResizeActive(false);
    };
  }, [isResizable, dom, draggingSide]);

  // ── Mousedown capture: start drag if cursor is on a resize edge ──────
  useEffect(() => {
    if (!isResizable || !dom) return;
    const el = dom as HTMLElement;

    const onDown = (e: MouseEvent) => {
      const side = detectEdge(el, e.clientX, e.clientY);
      if (!side) return;
      e.preventDefault();
      e.stopPropagation();
      const r = el.getBoundingClientRect();
      dragRef.current = {
        side,
        startX: e.clientX,
        startY: e.clientY,
        startW: r.width,
        startH: r.height,
        finalW: r.width,
        finalH: r.height,
      };
      setDraggingSide(side);
      setEdgeResizeActive(true);
      document.body.style.cursor = side === "bottom" ? "ns-resize" : "ew-resize";
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
      if (d.side === "bottom") {
        const next = Math.max(0, d.startH + (e.clientY - d.startY));
        const snapped = heightClass(next);
        el.style.height = `${snapped.px}px`;
        d.finalH = snapped.px;
      } else {
        const next = Math.max(0, d.startW + (e.clientX - d.startX));
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
      document.body.style.cursor = "";
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

  return null;
}
