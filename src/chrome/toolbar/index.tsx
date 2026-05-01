import { NodeProvider, useEditor } from "@craftjs/core";
import React, { useCallback, useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { useAtomState, useAtomValue } from "@zedux/react";
import { SideBarAtom, SideBarOpen } from "../../utils/atoms";
import { useEditorToolbarOverlayLayout } from "../../utils/hooks/useEditorToolbarOverlayLayout";
import { PreviewAtom } from "../viewport/state/atoms";
import { isFlyoutBlockingToolColumn, usePanelUrl } from "../../utils/usePanelUrl";
import { ViewportTopBar } from "../viewport/ViewportTopBar/ViewportTopBar";
import { Inspector } from "./inspector/InspectorRegistry";
import { EditorEmptyState } from "./EditorEmptyState";
import { SidebarLayersPanel } from "./SidebarLayersPanel";
import { SidebarSwipeHint } from "./SidebarSwipeHint";
import { markManualSidebarClose } from "../hooks/useAutoOpenSidebar";

export * from "./primitives/ToolbarDashedButton";
export * from "./primitives/ToolbarSegmentedControl";
export * from "./ToolbarDropdown";
export * from "./ToolbarItem";
export * from "./ToolbarSection";

export const Toolbar = () => {
  const [sideBarOpen, setSideBarOpen] = useAtomState(SideBarOpen);
  const sideBarLeft = useAtomValue(SideBarAtom);
  const isOverlayLayout = useEditorToolbarOverlayLayout();
  const ref = useRef(null);

  const handleClickOutside = event => {
    if (ref.current && !ref.current.contains(event.target)) {
      // setSideBarOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside, true);

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [ref]);

  const preview = useAtomValue(PreviewAtom);
  const { panel } = usePanelUrl();
  const flyoutBlockingToolColumn = isFlyoutBlockingToolColumn(panel);

  const { selectedNodeId, actions: editorActions } = useEditor((state, query) => {
    const id = query.getEvent("selected").first() || null;
    if (id && !state.nodes[id]?.data) return { selectedNodeId: null };
    return { selectedNodeId: id };
  });

  // Mount Inspector ONCE. NodeProvider swaps the context id without
  // remounting children — useNode() inside picks up the new id reactively.
  const tool = selectedNodeId ? (
    <NodeProvider id={selectedNodeId}>
      <Inspector />
    </NodeProvider>
  ) : (
    <EditorEmptyState />
  );

  // Right sidebar: push to end of the flex row via CSS order (docked only)
  const orderClass = !isOverlayLayout && !sideBarLeft ? "order-last" : "";

  const isOpen = sideBarOpen && !preview;

  const layoutClass = isOverlayLayout
    ? twMerge("absolute inset-y-0 z-[60]", sideBarLeft ? "left-0" : "right-0")
    : "relative h-full shrink-0 grow-0 z-[60]";

  const sizeClass = isOpen
    ? isOverlayLayout
      ? "w-[min(360px,100vw)] opacity-100"
      : "w-[360px] opacity-100"
    : "w-0 opacity-0 pointer-events-none";

  // Closure-bound config for the native pointer listeners — read at gesture
  // start time so we don't reattach the React handler on every render.
  const cfgRef = useRef({ enabled: false, sideBarLeft: true });
  cfgRef.current.enabled = isOpen;
  cfgRef.current.sideBarLeft = sideBarLeft;

  const onSwipeStart = useCallback(
    (e: React.PointerEvent) => {
      if (!cfgRef.current.enabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-no-swipe-close]")) return;
      // Bail on form controls (text selection / value scrubbing must keep
      // working). Buttons are NOT in this list — most of the toolbar UI is
      // wrapped in buttons; the slop check below distinguishes a click from
      // a drag.
      if (target?.closest("input, textarea, select, [role='slider'], [contenteditable='true']")) {
        return;
      }

      const aside = ref.current as HTMLElement | null;
      if (!aside) return;

      // React portals bubble events through the React tree, not the DOM tree.
      // Floating popovers (FloatingPanel, dropdowns, color picker, dialogs)
      // render via createPortal but still propagate pointerdown up to this
      // aside handler. Filter to true DOM descendants so portaled UI is immune.
      if (target && !aside.contains(target)) return;

      // Edge-only zone: only engage swipe-to-close when the gesture starts
      // near the inside edge of the sidebar (the edge facing the canvas, where
      // the SidebarSwipeHint sits). Clicks/drags in the body of the panel —
      // including popover triggers, chips, accordions — are left alone.
      const EDGE_PX = 32;
      const rect = aside.getBoundingClientRect();
      const distFromInsideEdge = cfgRef.current.sideBarLeft
        ? rect.right - e.clientX
        : e.clientX - rect.left;
      if (distFromInsideEdge > EDGE_PX) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
      let decided: "h" | "v" | null = null;
      let lastDx = 0;

      const cleanup = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.removeEventListener("pointercancel", onUp);
      };

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);

        if (decided === null) {
          // Only engage once horizontal motion clearly dominates. If the user
          // is scrolling vertically, abandon so the browser can scroll
          // smoothly — but never lock to "v" on tiny diagonal jitter.
          if (ady > 24 && ady > adx * 1.5) {
            decided = "v";
            cleanup();
            return;
          }
          if (adx < 6 || adx < ady) return;
          decided = "h";
        }

        if (decided !== "h") return;
        ev.preventDefault();
        lastDx = dx;
        const closeDir = cfgRef.current.sideBarLeft ? -1 : 1;
        const travel = dx * closeDir;
        aside.style.transition = "none";
        aside.style.transform =
          travel > 0 ? `translateX(${closeDir * Math.min(travel, 360)}px)` : "";
      };

      const onUp = () => {
        cleanup();
        if (decided !== "h") {
          aside.style.transition = "";
          aside.style.transform = "";
          return;
        }
        const closeDir = cfgRef.current.sideBarLeft ? -1 : 1;
        const travel = lastDx * closeDir;
        const now = typeof performance !== "undefined" ? performance.now() : Date.now();
        const dt = Math.max(now - startTime, 1);
        const velocity = travel / dt; // px/ms in close direction
        const shouldClose = travel >= 50 || (travel >= 25 && velocity >= 0.3);

        if (shouldClose) {
          // Restore class-based transition (width/opacity) BEFORE flipping
          // state — otherwise the inline `transition: none` from the drag
          // suppresses the close animation and the panel snaps shut.
          // Leave transform applied so the panel doesn't visually snap back
          // to translate(0) before the width collapses; clear it post-close.
          aside.style.transition = "";
          markManualSidebarClose();
          editorActions.clearEvents();
          setSideBarOpen(false);
          window.setTimeout(() => {
            aside.style.transform = "";
          }, 260);
        } else {
          // Spring back: animate transform to 0.
          aside.style.transition = "transform 180ms ease-out";
          aside.style.transform = "";
          window.setTimeout(() => {
            aside.style.transition = "";
          }, 200);
        }
      };

      document.addEventListener("pointermove", onMove, { passive: false });
      document.addEventListener("pointerup", onUp);
      document.addEventListener("pointercancel", onUp);
    },
    [setSideBarOpen, editorActions]
  );

  return (
    <aside
      role="complementary"
      aria-label="Component settings"
      key="sideMenu"
      id="toolbar"
      className={twMerge(
        "text-sidebar-foreground border-sidebar-border flex flex-col overflow-hidden border-x shadow-lg transition-[width,opacity] duration-200",
        layoutClass,
        orderClass,
        sizeClass
      )}
      ref={ref}
      onPointerDown={onSwipeStart}
    >
      <ViewportTopBar />
      <div
        className="text-sidebar-foreground z-0 flex w-full flex-1 flex-col overflow-hidden antialiased select-none"
        aria-expanded={isOpen ? "true" : "false"}
      >
        <div
          className={`flex min-h-0 flex-1 flex-col overflow-hidden${
            flyoutBlockingToolColumn ? "pointer-events-none" : ""
          }`}
        >
          {tool}
        </div>
        <SidebarLayersPanel />
      </div>
      {isOverlayLayout && isOpen ? <SidebarSwipeHint sideBarLeft={sideBarLeft} /> : null}
    </aside>
  );
};
