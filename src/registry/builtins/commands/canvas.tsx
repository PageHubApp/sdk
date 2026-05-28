/**
 * `ph.canvas.*` commands — view mode, device toggles, zoom, gridlines,
 * breakpoint / device guides.
 */
import React from "react";
import {
  TbBoxModel2,
  TbDeviceMobile,
  TbEyeOff,
  TbFileText,
} from "react-icons/tb";
import type { CommandDef } from "../../types";
import { setAtomExternal, getAtomExternal } from "../../../utils/atoms/external";
import {
  ViewAtom,
  DeviceAtom,
  ResponsiveAtom,
  ShowBreakpointMarkersAtom,
  ShowDeviceGuidesAtom,
  BreakpointZoomAtom,
  DeviceZoomAtom,
} from "../../../chrome/viewport/state/atoms";
import {
  ShowGridLinesAtom,
  ShowHiddenAtom,
  ViewModeAtom,
} from "../../../utils/atoms";
import { applyCanvasVisibility } from "../../../utils/component/componentIsolation";
import { phStorage } from "../../../utils/phStorage";
import { isInsideTextEditingSurfaceCtx } from "./helpers";

/** Flip canvas page<->component view mode and refresh visibility. */
function toggleViewModeRun(query: any, actions: any): void {
  if (!actions || !query) return;
  const current = getAtomExternal(ViewModeAtom) ?? "page";
  const next = current === "page" ? "canvas" : "page";
  setAtomExternal(ViewModeAtom, next);
  actions.selectNode?.(null);
  if (next === "page") {
    import("../../../utils/page/pageManagement")
      .then(({ isolatePageInTree }) => {
        try {
          isolatePageInTree(query, actions, null, () => {});
        } catch (err) {
          console.error("[ph.commands] isolatePageInTree failed:", err);
        }
      })
      .catch(err => {
        console.error("[ph.commands] page/pageManagement import failed:", err);
      });
  }
  applyCanvasVisibility(query, actions, { mode: next });
}

/**
 * Active zoom atom is whichever CanvasZoom mount has `data-canvas-zoom-*=true`.
 * Mirrors the inline window-level listener in CanvasZoom.tsx so chord / palette
 * dispatch goes through the same path.
 */
function zoomStep(direction: 1 | -1 | 0): void {
  if (typeof document === "undefined") return;
  // Determine which CanvasZoom mount is live.
  const deviceLive = document.querySelector(`[data-canvas-zoom-device-menu="true"]`);
  const atomKey: "device" | "breakpoint" = deviceLive ? "device" : "breakpoint";
  const atomTpl = atomKey === "device" ? DeviceZoomAtom : BreakpointZoomAtom;
  const current = getAtomExternal<number>(atomTpl) ?? 1;
  let next: number;
  if (direction === 0) {
    next = 1;
  } else {
    // Inlined nextZoomPreset to avoid a cross-import; both paths share semantics.
    const presets = [
      0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 3, 5, 7.5, 10,
    ];
    const idx = presets.findIndex(v => v >= current);
    const ni =
      direction === 1
        ? Math.min(idx + 1, presets.length - 1)
        : Math.max(idx - 1, 0);
    next = presets[ni];
  }
  setAtomExternal(atomTpl, next);
  try {
    const storageKey =
      atomKey === "device" ? "editor-device-zoom" : "editor-breakpoint-zoom";
    phStorage.set(storageKey, String(next));
    phStorage.set(`${storageKey}-fit`, "false");
  } catch {}
}

/** Toggle `data-show-gridlines` on `#viewport` and persist the atom. */
function toggleGridLinesRun(): void {
  const next = !(getAtomExternal<boolean>(ShowGridLinesAtom) ?? false);
  setAtomExternal(ShowGridLinesAtom, next);
  if (typeof document !== "undefined") {
    document.getElementById("viewport")?.setAttribute("data-show-gridlines", String(next));
  }
}

/** Toggle `data-show-hidden` on `#viewport` and persist the atom. */
function toggleHiddenRun(): void {
  const next = !(getAtomExternal<boolean>(ShowHiddenAtom) ?? true);
  setAtomExternal(ShowHiddenAtom, next);
  if (typeof document !== "undefined") {
    document.getElementById("viewport")?.setAttribute("data-show-hidden", String(next));
  }
}

export const CANVAS_COMMANDS: CommandDef[] = [
  {
    id: "ph.canvas.setView",
    title: (_ctx, args) => {
      const view = (args as unknown as { view?: string } | undefined)?.view ?? "default";
      return `Set view: ${view}`;
    },
    category: "View",
    icon: <TbDeviceMobile />,
    run: (_ctx, args) => {
      const view = (args as unknown as { view?: string } | undefined)?.view;
      if (!view) return;
      setAtomExternal(ViewAtom, view as any);
    },
  },
  {
    id: "ph.canvas.toggleDevice",
    title: "Toggle device",
    category: "View",
    icon: <TbDeviceMobile />,
    run: () => {
      setAtomExternal(DeviceAtom, (prev: boolean) => !prev);
    },
  },
  {
    id: "ph.canvas.toggleResponsive",
    title: "Toggle responsive",
    category: "View",
    run: () => {
      setAtomExternal(ResponsiveAtom, (prev: boolean) => !prev);
    },
  },
  {
    id: "ph.canvas.toggleViewMode",
    title: ctx => (ctx.viewMode === "canvas" ? "Switch to page editor" : "Switch to components editor"),
    category: "View",
    icon: ctx => (ctx.viewMode === "canvas" ? <TbFileText /> : <TbBoxModel2 />),
    run: ctx => {
      const { query, actions } = ctx as { query: any; actions: any };
      toggleViewModeRun(query, actions);
    },
  },
  {
    id: "ph.canvas.toggleGridLines",
    title: "Toggle grid lines",
    category: "View",
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    run: () => {
      toggleGridLinesRun();
    },
  },
  {
    id: "ph.canvas.toggleBreakpointMarkers",
    title: "Toggle breakpoint lines",
    category: "View",
    run: () => {
      const next = !(getAtomExternal<boolean>(ShowBreakpointMarkersAtom) ?? false);
      setAtomExternal(ShowBreakpointMarkersAtom, next);
      try {
        phStorage.set("show-breakpoint-markers", String(next));
      } catch {}
    },
  },
  {
    id: "ph.canvas.toggleDeviceGuides",
    title: "Toggle device guides",
    category: "View",
    run: () => {
      const next = !(getAtomExternal<boolean>(ShowDeviceGuidesAtom) ?? false);
      setAtomExternal(ShowDeviceGuidesAtom, next);
      try {
        phStorage.set("show-device-guides", String(next));
      } catch {}
    },
  },
  {
    id: "ph.canvas.toggleHidden",
    title: "Toggle hidden components",
    category: "View",
    icon: <TbEyeOff />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    run: () => {
      toggleHiddenRun();
    },
  },
  {
    id: "ph.canvas.zoomIn",
    title: "Zoom in",
    category: "View",
    when: ctx => ctx.mouseOver !== "topbar" && ctx.mouseOver !== "sidebar",
    run: () => zoomStep(1),
    paletteHide: true,
  },
  {
    id: "ph.canvas.zoomOut",
    title: "Zoom out",
    category: "View",
    when: ctx => ctx.mouseOver !== "topbar" && ctx.mouseOver !== "sidebar",
    run: () => zoomStep(-1),
    paletteHide: true,
  },
  {
    id: "ph.canvas.zoomReset",
    title: "Reset zoom",
    category: "View",
    run: () => zoomStep(0),
    paletteHide: true,
  },
];
