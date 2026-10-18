import { useEditor } from "@craftjs/core";
import { canvasScopeProps } from "../../../utils/canvasScope";
import { ROOT_NODE } from "@craftjs/utils";
import React, { useCallback, useRef } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import {
  IsolateAtom,
  LastActiveAtom,
  OnlineAtom,
  ScreenshotAtom,
  ShowGridLinesAtom,
  SideBarAtom,
  SideBarOpen,
  ViewModeAtom,
  useSetAtomState,
} from "../../../utils/atoms";
import { OVERLAY_Z_CANVAS_CONTROLS } from "../../popovers/overlayZIndex";
import { useSDK } from "../../../core/context";
import {
  getCanvasBreakpointPx,
  isEditorCanvasBreakpointView,
} from "../../../utils/tailwind/className";
import { LoadingBar } from "../../primitives/LoadingBar";
import { CanvasScopeBand } from "../canvas/CanvasScopeBand";
import { ComponentCanvasViewport } from "../canvas/ComponentCanvasViewport";
import { DeviceScrollbar } from "../canvas/DeviceScrollbar";
import { DEVICE_FRAME_BY_VIEW, getDeviceFrameSpec } from "../canvas/deviceFrames";
import { SideBySideFrame, resolveSecondaryWidthPx } from "../canvas/SideBySideFrame";
import { ToolboxContextual } from "../ToolboxContextual/ToolboxContextual";
import { ViewportMeta } from "../canvas/ViewportMeta";
import { ViewportScopeCoachmark } from "../canvas/ViewportScopeCoachmark";
import { DeviceOffline } from "../../toolbar/DeviceOffline";
import { EditModifiersAtom } from "../../toolbar/Label";
import { useViewportClickDeselect } from "../hooks/useViewportClickDeselect";
import { usePageNavigation } from "../../../utils/page/pageNavigation";
import { getEditorWidthOnlyCanvasClasses } from "../canvas/editorCanvasLayout";
import {
  AppliedBreakpointsAtom,
  BreakpointWidthOverrideAtom,
  BreakpointZoomAtom,
  DeviceAtom,
  DeviceDimensionsAtom,
  DeviceZoomAtom,
  EnabledAtom,
  InitialLoadCompleteAtom,
  PendingBreakpointOverrideAtom,
  PreviewAtom,
  ResponsiveAtom,
  ShowBreakpointMarkersAtom,
  ShowDeviceGuidesAtom,
  SideBySideAtom,
  TabAtom,
  ViewAtom,
} from "../state/atoms";
import { BreakpointMarkers } from "./parts/BreakpointMarkers";
import { CanvasEdgeHandles } from "./parts/CanvasEdgeHandles";
import { DeviceFrameChrome } from "./parts/DeviceFrameChrome";
import {
  DeviceFrameBottomDecoration,
  DeviceFrameTopDecoration,
} from "./parts/DeviceFrameDecorations";
import { DeviceGuides } from "./parts/DeviceGuides";
import { PreviewEditButton } from "./parts/PreviewEditButton";
import { useBreakpointMarkerDrag } from "./hooks/useBreakpointMarkerDrag";
import { useCanvasEdgeResize } from "./hooks/useCanvasEdgeResize";
import { usePageLoadIndicator } from "./hooks/usePageLoadIndicator";
import { useViewportContextMenu } from "./hooks/useViewportContextMenu";

export function Viewport({ children }: { children: React.ReactNode }) {
  const {
    enabled,
    connectors,
    actions: { setOptions },
  } = useEditor(state => ({ enabled: state.options.enabled }));

  const { actions, query } = useEditor();

  const themeBreakpoints = useEditor((state: any) => {
    return state.nodes[ROOT_NODE]?.data?.props?.theme?.breakpoints as
      | Record<string, number>
      | undefined;
  }) as Record<string, number> | undefined;

  // Editor-wide effects (component sync, selection / Tiptap context, initial
  // page load, unsaved-changes prompt, …) run in `EditorServices`.
  const { handleViewportClick } = useViewportClickDeselect();

  // Double-click on a node label exits the active inspector tab; keep this
  // tiny inline handler — it's UX glue, not a chord.
  const setActiveTab = useSetAtomState(TabAtom);
  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      const nodeId = target.closest("[node-id]")?.getAttribute("node-id");
      if (nodeId) setTimeout(() => setActiveTab(""), 600);
    },
    [setActiveTab]
  );

  // ─── Atoms (reads only) ───
  const editModifiers = useAtomValue(EditModifiersAtom);
  const classDarkEdit = editModifiers.dark ?? false;
  const showGridLines = useAtomValue(ShowGridLinesAtom);
  const viewMode = useAtomValue(ViewModeAtom);
  const view = useAtomValue(ViewAtom);
  const [device, setDevice] = useAtomState(DeviceAtom);
  const deviceDimensions = useAtomValue(DeviceDimensionsAtom);
  const deviceZoom = useAtomValue(DeviceZoomAtom);
  const breakpointZoom = useAtomValue(BreakpointZoomAtom);
  const [breakpointWidthOverride, setBreakpointWidthOverride] = useAtomState(
    BreakpointWidthOverrideAtom
  );
  const responsive = useAtomValue(ResponsiveAtom);
  const showBreakpointMarkers = useAtomValue(ShowBreakpointMarkersAtom);
  const showDeviceGuides = useAtomValue(ShowDeviceGuidesAtom);
  const [pendingBreakpointOverride, setPendingBreakpointOverride] = useAtomState(
    PendingBreakpointOverrideAtom
  );
  const [appliedBreakpoints, setAppliedBreakpoints] = useAtomState(AppliedBreakpointsAtom);
  const [preview, setPreview] = useAtomState(PreviewAtom);
  useSetAtomState(EnabledAtom);
  const sideBySide = useAtomValue(SideBySideAtom);
  const isolated = useAtomValue(IsolateAtom);
  const lastActive = useAtomValue(LastActiveAtom);
  const screenshot = useAtomValue(ScreenshotAtom);
  useAtomValue(OnlineAtom); // keep subscription
  const online = useAtomValue(OnlineAtom);
  const sideBarOpen = useAtomValue(SideBarOpen);
  const sideBarLeft = useAtomValue(SideBarAtom);
  useSetAtomState(InitialLoadCompleteAtom);
  const { features } = useSDK();
  usePageNavigation();

  const { handleViewportContextMenuCapture, handleViewportDoubleClickCapture } =
    useViewportContextMenu({ enabled, handleDoubleClick });

  const { pageLoad, handleLoadComplete } = usePageLoadIndicator();

  // ─── Side-by-side scroll mirror ───
  // Both frames share scroll state but each has its own DOM scroll container.
  // The primary viewport handler mirrors scrollTop into secondary; the secondary
  // mirrors back. `isMirroring` flag prevents an infinite ping-pong.
  const scrollMirrorRef = useRef<{
    primary: HTMLDivElement | null;
    secondary: HTMLDivElement | null;
    isMirroring: boolean;
  }>({ primary: null, secondary: null, isMirroring: false });

  // ─── View classes ───
  const desktopOuter = enabled
    ? "flex h-full overflow-hidden flex-row flex-1 min-w-0"
    : "flex h-full flex-row min-w-0 w-full";
  const desktopInner = enabled
    ? "flex-1 min-w-0 relative scrollbar bg-base-100 overflow-y-auto overflow-x-hidden"
    : "w-full h-full overflow-auto relative";

  const resolvedBreakpointPx = getCanvasBreakpointPx({ breakpoints: themeBreakpoints });

  const deviceFrame =
    device && isEditorCanvasBreakpointView(view)
      ? getDeviceFrameSpec(
          view,
          DEVICE_FRAME_BY_VIEW[view] === "phone" ? deviceDimensions : undefined,
          resolvedBreakpointPx
        )
      : null;

  let viewClasses: Record<string, string[]> = {
    desktop: [desktopOuter, desktopInner],
  };
  ["mobile", "sm", "md", "lg", "xl", "2xl"].forEach(bp => {
    viewClasses[bp] = getEditorWidthOnlyCanvasClasses(enabled);
  });
  if (deviceFrame) {
    viewClasses[view] = [deviceFrame.outerClassName, deviceFrame.innerClassName];
  } else if (device) {
    viewClasses[view] = [desktopOuter, desktopInner];
  }
  const activeClass = viewClasses[view] ?? viewClasses.desktop;

  const breakpointActive = !device && isEditorCanvasBreakpointView(view);
  const canvasZoomActive = !device && (view === "desktop" || isEditorCanvasBreakpointView(view));
  const deviceStyles: React.CSSProperties = deviceFrame
    ? ({
        width: `${deviceFrame.innerWidth + deviceFrame.bezelX}px`,
        height: `${deviceFrame.innerHeight + deviceFrame.bezelY}px`,
        paddingTop: deviceFrame.framePadding.top,
        paddingRight: deviceFrame.framePadding.right,
        paddingBottom: deviceFrame.framePadding.bottom,
        paddingLeft: deviceFrame.framePadding.left,
        zoom: deviceZoom,
        "--device-zoom-inverse": 1 / deviceZoom,
      } as React.CSSProperties)
    : canvasZoomActive && breakpointZoom !== 1
      ? ({ zoom: breakpointZoom } as React.CSSProperties)
      : {};

  const breakpointWidthPx = breakpointActive
    ? (breakpointWidthOverride[view] ?? (resolvedBreakpointPx as Record<string, number>)[view])
    : null;
  const lockedWidth = features.canvasWidth;
  const canvasOuterStyle: React.CSSProperties = lockedWidth
    ? { width: `${lockedWidth}px`, maxWidth: "none", flex: `0 0 ${lockedWidth}px`, marginInline: "auto" }
    : breakpointWidthPx != null
      ? responsive
        ? { ...deviceStyles, maxWidth: `min(100%, ${breakpointWidthPx}px)` }
        : { ...deviceStyles, width: `${breakpointWidthPx}px`, maxWidth: "none", flexShrink: 0 }
      : deviceStyles;

  const { handlePointerDownEdge, resetBreakpointWidth } = useCanvasEdgeResize({
    breakpointActive,
    breakpointWidthPx,
    canvasZoomActive,
    breakpointZoom,
    view,
    setBreakpointWidthOverride,
  });

  const { getEffectiveBpPx, handleMarkerPointerDown, resetMarkerBreakpoint } =
    useBreakpointMarkerDrag({
      actions,
      themeBreakpoints,
      appliedBreakpoints,
      setAppliedBreakpoints,
      pendingBreakpointOverride,
      setPendingBreakpointOverride,
      canvasZoomActive,
      breakpointZoom,
    });

  return (
    <>
      <ViewportMeta />
      {/* min-h-0: a column flex item's auto min-height clamps to its own `height`,
          so with h-full the canvas never shrinks to make room for the docked
          AI panel below it — the column overflows and the shell scrolls. */}
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
        {/* Scope band + first-run coachmark are page-editor concerns.
            Component-editor mode (`viewMode === "canvas"`) edits a single
            isolated component and has its own mental model — suppress both
            so we don't shout "EDITING MD BREAKPOINT" over a component card. */}
        {enabled && viewMode !== "canvas" && <CanvasScopeBand />}
        <div
          className={`relative flex w-full min-w-0 flex-1 ${
            breakpointActive && !responsive
              ? "overflow-x-auto overflow-y-hidden"
              : "overflow-hidden"
          } ${
            deviceFrame || isEditorCanvasBreakpointView(view)
              ? "bg-neutral/50 items-center justify-center"
              : "flex-row"
          }`}
          data-container={true}
        >
          <LoadingBar
            active={pageLoad !== "idle"}
            done={pageLoad === "done"}
            overlay
            onComplete={handleLoadComplete}
          />
          {enabled && viewMode !== "canvas" && <ViewportScopeCoachmark />}
          {!enabled && !screenshot && (
            <PreviewEditButton
              sideBarLeft={sideBarLeft}
              lastActive={lastActive}
              query={query}
              actions={actions}
              setOptions={setOptions}
              setPreview={setPreview}
            />
          )}

          {enabled && !online && <DeviceOffline />}

          {enabled && viewMode === "canvas" && (
            <ComponentCanvasViewport className="absolute inset-0 z-30" />
          )}

          {enabled && deviceFrame && (
            <DeviceFrameChrome deviceFrame={deviceFrame} setDevice={setDevice} />
          )}

          <div className={`${activeClass[0]} relative w-full`} style={canvasOuterStyle}>
            <DeviceFrameTopDecoration decoration={deviceFrame?.decoration} />
            {enabled && breakpointActive && (
              <CanvasEdgeHandles
                breakpointWidthPx={breakpointWidthPx}
                handlePointerDownEdge={handlePointerDownEdge}
                resetBreakpointWidth={resetBreakpointWidth}
              />
            )}
            {enabled && !device && showBreakpointMarkers && (
              <BreakpointMarkers
                themeBreakpoints={themeBreakpoints}
                pendingBreakpointOverride={pendingBreakpointOverride}
                getEffectiveBpPx={getEffectiveBpPx}
                handleMarkerPointerDown={handleMarkerPointerDown}
                resetMarkerBreakpoint={resetMarkerBreakpoint}
              />
            )}
            {enabled && !device && showDeviceGuides && <DeviceGuides />}
            <div
              id="viewport"
              {...canvasScopeProps}
              role="application"
              onClick={handleViewportClick}
              onDoubleClick={handleDoubleClick}
              onDoubleClickCapture={handleViewportDoubleClickCapture}
              onContextMenuCapture={handleViewportContextMenuCapture}
              data-isolated={!!isolated}
              data-show-gridlines={showGridLines.toString()}
              tabIndex={0}
              className={`${activeClass[1]} w-full${classDarkEdit ? "dark" : ""}`}
              ref={(ref: any) => {
                connectors.select(connectors.hover(ref, null), null);
                scrollMirrorRef.current.primary = ref as HTMLDivElement | null;
              }}
              onScroll={
                sideBySide.enabled
                  ? e => {
                      const m = scrollMirrorRef.current;
                      if (m.isMirroring || !m.secondary) return;
                      m.isMirroring = true;
                      try {
                        m.secondary.scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
                      } finally {
                        requestAnimationFrame(() => {
                          m.isMirroring = false;
                        });
                      }
                    }
                  : undefined
              }
            >
              {children}
            </div>
            <DeviceFrameBottomDecoration decoration={deviceFrame?.decoration} />
          </div>

          {deviceFrame && enabled && (
            <DeviceScrollbar
              deviceWidth={deviceFrame.innerWidth + deviceFrame.bezelX}
              deviceHeight={deviceFrame.innerHeight + deviceFrame.bezelY}
              deviceZoom={deviceZoom}
              sideBarOpen={sideBarOpen}
              sideBarLeft={sideBarLeft}
            />
          )}

          {/* Side-by-side read-only mirror.
              Suppress in component-isolation mode (`viewMode === "canvas"`):
              the primary canvas isolates a single component but the mirror
              has no isolation logic — it would render the full page tree,
              making the page editor appear to "leak" behind the component editor. */}
          {enabled && sideBySide.enabled && !deviceFrame && viewMode !== "canvas" && (
            <SideBySideFrame
              secondaryView={sideBySide.secondaryView}
              widthPx={resolveSecondaryWidthPx(sideBySide.secondaryView, themeBreakpoints)}
              scrollMirrorRef={scrollMirrorRef}
            />
          )}

          {deviceFrame && (
            <div
              id="device-tools-portal"
              className="pointer-events-none absolute inset-0 z-100"
            />
          )}

          {enabled && (
            <svg
              id="measurement-lines-svg"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: OVERLAY_Z_CANVAS_CONTROLS,
              }}
            />
          )}

          {enabled ? <ToolboxContextual /> : null}
        </div>
      </div>
    </>
  );
}
