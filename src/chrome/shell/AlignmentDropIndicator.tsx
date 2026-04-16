/**
 * AlignmentDropIndicator — shows alignment zone preview during drag.
 *
 * Reads CraftJS indicator state to know IF a drag is happening and which
 * parent container is the target. Listens for dragover events to get cursor
 * position. Computes alignment zone and renders a tinted overlay + label.
 *
 * Suppressed when beside detection is active (where = beside-*).
 */

import { useEditor } from "@craftjs/core";
import { RenderIndicator } from "@craftjs/utils";
import { useAtomValue } from "@zedux/react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { editorCanvasViewToClassPrefixKey } from "../../utils/tailwind/className";
import { ViewAtom } from "../viewport/atoms";
import { ViewSelectionAtom } from "../toolbar/Label";
import {
  detectAlignmentIntent,
  getAlignmentPreviewLabel,
  setAlignmentIntent,
  clearAlignmentIntent,
  type AlignmentIntent,
} from "./alignmentInference";

export function AlignmentDropIndicator() {
  const { indicator } = useEditor((state) => ({
    indicator: state.indicator,
  }));

  const view = useAtomValue(ViewAtom);
  const classDark = useAtomValue(ViewSelectionAtom).dark ?? false;
  const classPrefixView = editorCanvasViewToClassPrefixKey(view);

  const [intent, setIntent] = useState<AlignmentIntent | null>(null);
  const intentRef = useRef<AlignmentIntent | null>(null);
  const parentDomRef = useRef<HTMLElement | null>(null);

  // Determine if we should be active: drag in progress, not beside, has parent DOM
  const placement = indicator?.placement;
  const where = placement?.where;
  const isBeside = where === "beside-left" || where === "beside-right";
  const parentNode = placement?.parent;
  const parentDom = parentNode?.dom as HTMLElement | undefined;
  const isActive = !!indicator && !isBeside && !indicator.error && !!parentDom;

  // Track parent DOM changes
  useEffect(() => {
    parentDomRef.current = isActive && parentDom ? parentDom : null;
  }, [isActive, parentDom]);

  // dragover listener — compute alignment zone from cursor
  const onDragOver = useCallback(
    (e: DragEvent) => {
      const dom = parentDomRef.current;
      if (!dom || !parentNode) return;

      const next = detectAlignmentIntent(dom, parentNode, e.clientX, e.clientY);

      // Only update state when zone actually changes
      const prev = intentRef.current;
      if (next?.zone !== prev?.zone || next?.axis !== prev?.axis) {
        if (next) {
          console.log("[alignment-detect]", next.zone, next.axis, { parentId: parentNode?.id, view: classPrefixView });
        }
        intentRef.current = next;
        setAlignmentIntent(next, classPrefixView, classDark);
        setIntent(next);
      }
    },
    [parentNode, classPrefixView, classDark]
  );

  // Bind/unbind dragover listener
  useEffect(() => {
    if (!isActive) {
      // Clear local render state only — module-level intent is owned
      // by the drop handler in CustomEventHandlers which reads + clears it.
      intentRef.current = null;
      setIntent(null);
      return;
    }

    document.addEventListener("dragover", onDragOver, { passive: true });
    return () => {
      document.removeEventListener("dragover", onDragOver);
      intentRef.current = null;
      setIntent(null);
    };
  }, [isActive, onDragOver]);

  if (!isActive || !intent || !parentDom) return null;

  const rect = parentDom.getBoundingClientRect();
  const labelText = getAlignmentPreviewLabel(intent);

  // Compute overlay zone position
  let overlayTop: number, overlayLeft: number, overlayWidth: number, overlayHeight: number;

  if (intent.axis === "horizontal") {
    // flex-col: horizontal zones (left/center/right thirds)
    const zoneW = rect.width / 3;
    overlayTop = rect.top;
    overlayHeight = rect.height;
    overlayWidth = zoneW;
    overlayLeft =
      intent.zone === "start"
        ? rect.left
        : intent.zone === "end"
          ? rect.left + rect.width - zoneW
          : rect.left + zoneW;
  } else {
    // flex-row: vertical zones (top/center/bottom thirds)
    const zoneH = rect.height / 3;
    overlayLeft = rect.left;
    overlayWidth = rect.width;
    overlayHeight = zoneH;
    overlayTop =
      intent.zone === "start"
        ? rect.top
        : intent.zone === "end"
          ? rect.top + rect.height - zoneH
          : rect.top + zoneH;
  }

  // Label position — centered in the overlay zone
  const labelLeft = overlayLeft + overlayWidth / 2;
  const labelTop = overlayTop + 12;

  const labelRoot = parentDom.ownerDocument?.body || document.body;

  const label = (
    <div
      className="pagehub-alignment-indicator-label"
      style={{
        position: "fixed",
        top: labelTop,
        left: labelLeft,
        transform: "translateX(-50%)",
        zIndex: 100000,
        pointerEvents: "none",
        background: "rgba(255,255,255,0.96)",
        color: "#111",
        borderRadius: 0,
        border: "1px solid currentColor",
        padding: "6px 8px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.02em",
        boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
        whiteSpace: "nowrap",
        textAlign: "center",
      }}
    >
      {labelText}
    </div>
  );

  return (
    <>
      <RenderIndicator
        className="pagehub-alignment-indicator-overlay"
        style={{
          top: `${overlayTop}px`,
          left: `${overlayLeft}px`,
          width: `${overlayWidth}px`,
          height: `${overlayHeight}px`,
          backgroundColor: "currentColor",
          opacity: 0.08,
          borderRadius: 0,
          borderColor: "currentColor",
          borderStyle: "dashed",
          borderWidth: "1px",
          pointerEvents: "none",
        }}
        parentDom={parentDom}
      />
      {ReactDOM.createPortal(label, labelRoot)}
    </>
  );
}
