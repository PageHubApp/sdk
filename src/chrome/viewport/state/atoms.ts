import { atom } from "@zedux/react";
import type { ViewMode } from "../../../core/store";
import { phStorage } from "../../../utils/phStorage";

export const TbActiveMenuAtom = atom("TbActiveMenuAtom", null);

export const TbActiveItemAtom = atom("TbActiveItemAtom", 0);

export const TbActiveSubItemAtom = atom("TbActiveSubItemAtom", 0);

export const PreviewAtom = atom("preview", false);

export const ViewportScrollAtom = atom("vpscroll", false);

export const MouseInEditor = atom("mousein", false);

/** Serialized graph when dirty, or null when clean (see `editor.tsx` unsaved listener). */
export const UnsavedChangesAtom = atom<any>("unsavedchanges", null);

/**
 * Default canvas view: `desktop` (fluid full-width) on a wide screen, `mobile`
 * on a touch/narrow screen. Both routes cause class writes to target the BASE
 * (mobile-first) layer — keeps the cascade clean by default and matches the
 * new "viewport = edit scope" model. Users explicitly switch to sm/md/lg/xl/2xl
 * when they want to override at a breakpoint. Editor-only state — client-side
 * window check is safe (no SSR hydration concern).
 */
const defaultCanvasView = (): ViewMode => {
  if (typeof window === "undefined") return "desktop";
  return window.innerWidth < 768 ? "mobile" : "desktop";
};

export const ViewAtom = atom<ViewMode>("view", defaultCanvasView());

export const ToolbarTitleAtom = atom("ttt", "");

export const TabAtom = atom("editorTab", "");

export const DeviceAtom = atom("device", false);

/**
 * When true (default): canvas clamps to the editor area — picking a breakpoint narrows
 * the viewport but never overflows. When false: canvas renders at the exact selected
 * breakpoint width and overflows the editor when needed (scroll-to-pan).
 */
export const ResponsiveAtom = atom("responsive", true);

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

/** Per-breakpoint width overrides (drag-resize). Not persisted. */
export const BreakpointWidthOverrideAtom = atom<Record<string, number>>(
  "breakpointWidthOverride",
  {}
);

/** Show dotted breakpoint marker lines on the canvas. Persisted via phStorage. */
export const ShowBreakpointMarkersAtom = atom(
  "showBreakpointMarkers",
  (() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = phStorage.get("show-breakpoint-markers");
      if (saved === "true") return true;
      if (saved === "false") return false;
    } catch {}
    return false;
  })()
);

/** Show non-draggable device reference guides (iPhone, iPad, etc) on the canvas. Persisted via phStorage. */
export const ShowDeviceGuidesAtom = atom(
  "showDeviceGuides",
  (() => {
    if (typeof window === "undefined") return false;
    try {
      const saved = phStorage.get("show-device-guides");
      if (saved === "true") return true;
      if (saved === "false") return false;
    } catch {}
    return false;
  })()
);

/**
 * Transient drag-preview value per breakpoint (px). Empty when no drag in progress.
 * Markers read from this for live cursor-tracking; class behavior reads from
 * `theme.breakpoints` (only changes on commit). Resets after pointer-up.
 */
export const PendingBreakpointOverrideAtom = atom<Record<string, number>>(
  "pendingBreakpointOverride",
  {}
);

/**
 * What's currently applied to the in-page `<style id="tailwind-compiled">` block.
 * Tracked so client-side `rewriteBreakpoints` can compute deltas (rewrite from
 * "currently applied" → "newly committed") on each drag commit.
 *
 * Defaults are seeded on mount from theme.breakpoints, falling back to Tailwind's defaults.
 */
export type AppliedBreakpointsShape = {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  "2xl": number;
};
export const AppliedBreakpointsAtom = atom<AppliedBreakpointsShape>("appliedBreakpoints", {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
});

export const EnabledAtom = atom("enabled", true);

export const InitialLoadCompleteAtom = atom("initialLoadComplete", false);

export const ComponentCanvasZoomAtom = atom(
  "componentCanvasZoom",
  readSavedZoom("editor-component-canvas-zoom", 0.5)
);

export const ComponentCanvasPanAtom = atom("componentCanvasPan", { x: 80, y: 80 });

/**
 * Per-field breakpoint indicator chip density preference.
 *  - `auto`   → render only when there's something to say (silent-when-clean).
 *  - `always` → render every chip, faint hollow ring at base.
 *  - `off`    → never render.
 * Persisted via phStorage so user pref survives page reloads.
 */
export type IndicatorDensity = "auto" | "always" | "off";
export const IndicatorDensityAtom = atom<IndicatorDensity>(
  "indicatorDensity",
  (() => {
    try {
      const saved = typeof window !== "undefined" ? phStorage.get("indicator-density") : null;
      if (saved === "auto" || saved === "always" || saved === "off") return saved;
    } catch {}
    return "auto";
  })()
);

/**
 * Optional side-by-side editing mode. When `enabled`, ViewportShell renders a
 * second read-only frame mirroring the primary canvas at `secondaryView` width.
 * Always disabled by default; flag-off path is bit-identical to today.
 */
export type SideBySideShape = {
  enabled: boolean;
  secondaryView: ViewMode;
};
export const SideBySideAtom = atom<SideBySideShape>("sideBySide", {
  enabled: false,
  secondaryView: "mobile",
});
