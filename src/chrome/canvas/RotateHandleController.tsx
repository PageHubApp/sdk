/**
 * RotateHandleController — Framer-style rotation handle.
 *
 * No DOM. Detects when the cursor is within ~10px of the bottom-left corner of
 * the selected element and flips the cursor to a "refresh-style" curved-arrow
 * rotate icon. Mousedown in the zone starts a rotation drag (atan2 around the
 * element center). Free rotation by default; hold Shift to snap to 15°.
 *
 * Same gate as BorderResizeController. Sets the shared edgeResizeState flag so
 * PaddingOverlay doesn't fight for the cursor zone.
 */

import { useEditor } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { twMerge } from "tailwind-merge";
import { useAtomValue } from "@zedux/react";
import { ViewSelectionAtom } from "../toolbar/Label";
import { ViewAtom } from "../viewport/atoms";
import {
  editorCanvasViewToClassPrefixKey,
  buildVariantPrefix,
} from "../../utils/tailwind/className";
import { checkIfAncestorLinked } from "../../utils/component/componentUtils";
import { setEdgeResizeActive } from "./edgeResizeState";
import { getNodeGeometry } from "./nodeGeometry";
import { isRotateActive, setRotateActive } from "./rotateActiveState";
import { OVERLAY_Z_CANVAS_CONTROLS } from "../overlays/overlayZIndex";

const SKIP_DISPLAY_NAMES = new Set(["Container", "Background"]);
const SKIP_TYPES = new Set(["page", "header", "footer"]);
const CORNER_RADIUS = 18; // px around bottom-left corner that triggers rotate cursor
const SNAP_DEG = 15; // hold Shift to snap

const isDev = process.env.NODE_ENV === "development";
const log = isDev
  ? (label: string, data?: Record<string, any>) => console.log(`[rotate] ${label}`, data ?? "")
  : () => {};

// Custom rotate cursor — extracted CgCornerDoubleDownRight path, scaled down
// inside the 24×24 viewBox, with a white halo around the shape (paint-order:
// stroke fill renders the white stroke first, the black fill on top, leaving
// the outer half of the stroke visible as a halo against any background —
// same trick the OS uses for cursor visibility).
//
// Wrapped at runtime in a `<g transform="rotate(...)">` so the cursor visually
// spins with the element's current rotation.
const _baseCursorSvg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">` +
  `<g transform="translate(2.4 2.4) scale(0.8)">` +
  `<path d="M12.6004 7.67915L7.63814 2.74194L2.70093 7.7042L4.11871 9.11483L6.52249 6.69886L6.5075 12.7348C6.50092 15.3857 8.64461 17.5401 11.2956 17.5467L17.224 17.5614L14.9855 19.8638L16.4195 21.258L21.299 16.239L16.2801 11.3595L14.8859 12.7934L17.3217 15.1616L11.3015 15.1467C9.97605 15.1434 8.9042 14.0662 8.9075 12.7407L8.92214 6.84077L11.1898 9.09694L12.6004 7.67915Z" ` +
  `fill="black" stroke="white" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke"/>` +
  `</g></svg>`;

function buildRotateCursorUrl(angle: number): string {
  if (!_baseCursorSvg || typeof window === "undefined") return "grab";
  // Inject a rotation around the cursor's hotspot center (10,10 of the 20×20 SVG).
  const rotated = _baseCursorSvg
    .replace(/<svg([^>]*)>/, `<svg$1><g transform="rotate(${angle} 10 10)">`)
    .replace(/<\/svg>$/, "</g></svg>");
  const b64 = window.btoa(rotated);
  return `url("data:image/svg+xml;base64,${b64}") 10 10, grab`;
}

function setRotateCursorAngle(angle: number): void {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--ph-rotate-cursor", buildRotateCursorUrl(angle));
}

let rotateCursorInjected = false;
function ensureRotateCursorVar(): void {
  if (rotateCursorInjected || typeof document === "undefined") return;
  rotateCursorInjected = true;
  setRotateCursorAngle(0);
}

function stripRotation(className: string | undefined): string {
  return (className || "")
    .replace(/\brotate-\[[^\]]+\]/g, "")
    .replace(/\brotate-\d+\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isInCornerZone(el: HTMLElement, x: number, y: number): boolean {
  // Bottom-left corner in element-local coords is (-w/2, +h/2). Convert cursor
  // to local first so the zone tracks the rotated corner.
  const g = getNodeGeometry(el);
  const lp = g.toLocal(x, y);
  const dx = lp.x - -(g.w / 2);
  const dy = lp.y - g.h / 2;
  return dx * dx + dy * dy <= CORNER_RADIUS * CORNER_RADIUS;
}

export function RotateHandleController() {
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
      isLocked: checkIfAncestorLinked(id, query),
    };
  });

  const { actions } = useEditor();
  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classPrefixView = editorCanvasViewToClassPrefixKey(view);

  // Inject --ph-rotate-cursor on first mount.
  useEffect(() => {
    ensureRotateCursorVar();
  }, []);

  const dragRef = useRef<{
    cx: number;
    cy: number;
    startAngle: number;
    startRotation: number;
    finalRotation: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  // Live rotation snapshot + mouse position used by the floating degree pill.
  const [liveAngle, setLiveAngle] = useState(0);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const isRotatable =
    !!selectedId &&
    !!dom &&
    !isLocked &&
    !SKIP_DISPLAY_NAMES.has(displayName ?? "") &&
    !SKIP_TYPES.has(propsType ?? "");

  // ── Hover: flip cursor when near bottom-left corner ──────────────────
  useEffect(() => {
    if (!isRotatable || !dom || dragging) return;
    const el = dom as HTMLElement;
    let inZone = false;

    const onMove = (e: MouseEvent) => {
      const next = isInCornerZone(el, e.clientX, e.clientY);
      if (next === inZone) return;
      inZone = next;
      if (next) {
        setRotateCursorAngle(getNodeGeometry(el).angle);
        document.body.dataset.phRotate = "true";
        setEdgeResizeActive(true);
      } else {
        delete document.body.dataset.phRotate;
        setEdgeResizeActive(false);
      }
    };

    document.addEventListener("mousemove", onMove);
    return () => {
      document.removeEventListener("mousemove", onMove);
      // When this effect tears down because `dragging` flipped to true, the
      // mousedown handler has already armed body[data-ph-rotate] + the active
      // flags. Don't wipe them — the active-drag effect now owns the cursor
      // and clears them on mouseup. Only clean up when no rotation is in flight
      // (e.g. unmount, deselect, hover-leave-then-resync).
      if (!isRotateActive()) {
        delete document.body.dataset.phRotate;
        setEdgeResizeActive(false);
      }
    };
  }, [isRotatable, dom, dragging]);

  // ── Mousedown capture: if in corner zone, start rotation drag ────────
  useEffect(() => {
    if (!isRotatable || !dom) return;
    const el = dom as HTMLElement;

    const onDown = (e: MouseEvent) => {
      if (!isInCornerZone(el, e.clientX, e.clientY)) return;
      e.preventDefault();
      e.stopPropagation();

      const g = getNodeGeometry(el);
      // Read live rotation from computed transform so we pick up whatever's
      // currently applied (whether via className OR inline style from a prior drag).
      const startRotation = g.angle;
      const startAngle = Math.atan2(e.clientY - g.cy, e.clientX - g.cx) * (180 / Math.PI);
      dragRef.current = {
        cx: g.cx,
        cy: g.cy,
        startAngle,
        startRotation,
        finalRotation: startRotation,
      };
      log("start", {
        nodeId: selectedId,
        startRotation,
        startAngle,
        center: { cx: g.cx, cy: g.cy },
        elSize: { w: g.w, h: g.h },
        computedTransform: window.getComputedStyle(el).transform,
        currentInlineTransform: el.style.transform,
        currentTransformOrigin: el.style.transformOrigin,
      });
      setDragging(true);
      setLiveAngle(Math.round(startRotation));
      setMousePos({ x: e.clientX, y: e.clientY });
      setEdgeResizeActive(true);
      setRotateActive(true);
      document.body.dataset.phRotate = "true";
    };

    document.addEventListener("mousedown", onDown, true);
    return () => document.removeEventListener("mousedown", onDown, true);
  }, [isRotatable, dom]);

  // ── Active drag: track mousemove, write inline transform ─────────────
  useEffect(() => {
    if (!dragging || !dom) return;
    const el = dom as HTMLElement;
    const prevTransformOrigin = el.style.transformOrigin;
    el.style.transformOrigin = "center center";

    let lastCursorAngleStep = Math.round(dragRef.current?.startRotation ?? 0);

    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setMousePos({ x: e.clientX, y: e.clientY });
      const angle = Math.atan2(e.clientY - d.cy, e.clientX - d.cx) * (180 / Math.PI);
      let next = d.startRotation + (angle - d.startAngle);
      if (e.shiftKey) next = Math.round(next / SNAP_DEG) * SNAP_DEG;
      d.finalRotation = next;
      // Use the CSS `rotate` property (same property Tailwind v4's `rotate-[Ndeg]`
      // class writes to). Don't use `transform` — that would compound with the
      // class-based rotate after release.
      (el.style as any).rotate = `${next}deg`;

      // Spin the cursor to match. Throttle by snapping to integer degrees so
      // we only regenerate the data URL when the rounded angle changes.
      const step = Math.round(next);
      if (step !== lastCursorAngleStep) {
        lastCursorAngleStep = step;
        setRotateCursorAngle(step);
        setLiveAngle(step);
      }
    };

    const moveLogTick = setInterval(() => {
      const d = dragRef.current;
      if (!d) return;
      log("tick", {
        finalRotation: d.finalRotation,
        elInlineTransform: el.style.transform,
        computedTransform: window.getComputedStyle(el).transform,
      });
    }, 200);

    const onUp = () => {
      clearInterval(moveLogTick);
      const d = dragRef.current;
      dragRef.current = null;
      setDragging(false);
      setMousePos(null);
      setEdgeResizeActive(false);
      setRotateActive(false);
      delete document.body.dataset.phRotate;
      el.style.transformOrigin = prevTransformOrigin;
      if (!d || !selectedId) return;

      const final = Math.round(d.finalRotation);
      const prefix = buildVariantPrefix(classPrefixView, classDark);
      const cls = final === 0 ? "" : `${prefix}rotate-[${final}deg]`;

      log("up", { nodeId: selectedId, finalRotation: final, cls });

      // Write the rotation to className only — Tailwind's `rotate-[Ndeg]`
      // produces the same `rotate:` CSS property our drag preview wrote.
      // Inline `el.style.rotate` is cleared so the className becomes the
      // single source of truth (no double-application).
      actions.setProp(selectedId, (p: any) => {
        const stripped = stripRotation(p.className || "");
        p.className = cls ? twMerge(stripped, cls) : stripped;
      });
      (el.style as any).rotate = "";

      requestAnimationFrame(() => {
        log("post-commit", {
          inlineRotate: (el.style as any).rotate,
          computedRotate: (window.getComputedStyle(el) as any).rotate,
          computedTransform: window.getComputedStyle(el).transform,
        });
      });
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [dragging, dom, selectedId, actions, classPrefixView, classDark]);

  // ── Floating degree pill (drag-only, follows the cursor) ─────────────
  // No rotation, no portal into #viewport — `position: fixed` against the
  // browser viewport sidesteps the editor's CSS zoom + ancestor transforms.
  if (!dragging || !mousePos || typeof document === "undefined") return null;
  const pillDeg = ((Math.round(liveAngle) % 360) + 360) % 360;
  return ReactDOM.createPortal(
    <div
      style={{
        position: "fixed",
        left: mousePos.x + 14,
        top: mousePos.y + 14,
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
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        zIndex: OVERLAY_Z_CANVAS_CONTROLS,
      }}
    >
      {pillDeg}°
    </div>,
    document.body
  );
}
