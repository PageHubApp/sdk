import { atom } from "@zedux/react";
import type { ViewMode } from "../../core/store";
import { phStorage } from "../../utils/phStorage";

export const TbActiveMenuAtom = atom("TbActiveMenuAtom", null);

export const TbActiveItemAtom = atom("TbActiveItemAtom", 0);

export const TbActiveSubItemAtom = atom("TbActiveSubItemAtom", 0);

export const PreviewAtom = atom("preview", false);

export const ViewportScrollAtom = atom("vpscroll", false);

export const MouseInEditor = atom("mousein", false);

/** Serialized graph when dirty, or null when clean (see `editor.tsx` unsaved listener). */
export const UnsavedChangesAtom = atom<any>("unsavedchanges", null);

export const ViewAtom = atom<ViewMode>("view", "desktop");

export const ToolbarTitleAtom = atom("ttt", "");

export const TabAtom = atom("editorTab", "");

export const DeviceAtom = atom("device", false);

export const DeviceDimensionsAtom = atom("deviceDimensions", { width: 390, height: 844, dpr: 3 });

function readSavedZoom(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(`ph-${key}`);
    if (raw === null) return fallback;
    const n = parseFloat(raw);
    return Number.isFinite(n) && n >= 0.25 && n <= 2 ? n : fallback;
  } catch {
    return fallback;
  }
}

export const DeviceZoomAtom = atom("deviceZoom", readSavedZoom("editor-device-zoom", 0.75));

export const BreakpointZoomAtom = atom(
  "breakpointZoom",
  readSavedZoom("editor-breakpoint-zoom", 0.75)
);

export const EnabledAtom = atom("enabled", true);

export const InitialLoadCompleteAtom = atom("initialLoadComplete", false);

export const ComponentCanvasZoomAtom = atom(
  "componentCanvasZoom",
  readSavedZoom("editor-component-canvas-zoom", 0.5)
);

export const ComponentCanvasPanAtom = atom("componentCanvasPan", { x: 80, y: 80 });

/** Sidebar editing mode — "content" hides advanced controls, "design" shows everything. */
export type EditorMode = "content" | "design";
export const EditorModeAtom = atom<EditorMode>(
  "editorMode",
  (() => {
    try {
      const saved = typeof window !== "undefined" ? phStorage.get("editor-mode") : null;
      if (saved === "content" || saved === "design") return saved;
    } catch {}
    return "content";
  })()
);
