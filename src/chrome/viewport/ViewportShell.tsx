import sluggit from "slug";
import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import Router from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { TbCode } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { ToolboxMenu, toolboxMenuInitialState } from "../rendering/toolboxMenuAtom";
import { ToolboxContexual } from "./ToolboxContextual";
import { ShowGridLinesAtom } from "../../utils/atoms";
import {
  EDITOR_ALL_PAGES_STORAGE,
  IsolateAtom,
  LastActiveAtom,
  OnlineAtom,
  ScreenshotAtom,
  SideBarAtom,
  SideBarOpen,
  ViewModeAtom,
  getDefaultEditorPageId,
  isolatePageAlt,
  isolatePageLazy,
  listPageNodeIds,
} from "../../utils/lib";
import { FloatingWidget } from "../floating/FloatingWidget";
import { ProximityHoverManager } from "../canvas/ProximityHoverManager";
import { useAutoOpenSidebar } from "../hooks/useAutoOpenSidebar";
import { useComponentSync } from "../hooks/useComponentSync";
import { ViewSelectionAtom } from "../toolbar/Label";
import { DeviceOffline } from "../toolbar/DeviceOffline";
import { ComponentEditorTabs } from "./ComponentEditorTabs";
import { DeviceScrollbar } from "./DeviceScrollbar";
import { DeviceSelector } from "./DeviceSelector";
import { DeviceZoom } from "./DeviceZoom";
import { useSDK } from "../../core/context";
import { ViewportMeta } from "./ViewportMeta";
import { useNodeDropStyling } from "./hooks/useNodeDropStyling";
import { useEditorDocumentKeydown } from "../hooks/useEditorDocumentKeydown";
import { useViewportClickDeselect } from "./hooks/useViewportClickDeselect";
import { useViewportKeyboard } from "./hooks/useViewportKeyboard";
import { phStorage } from "../../utils/phStorage";
import { useEditorToolbarOverlayLayout } from "../../utils/hooks/useEditorToolbarOverlayLayout";
import { initPageNavigation, updateOnIsolate, usePageNavigation } from "../../utils/pageNavigation";
import { LoadingBar } from "../primitives/LoadingBar";

import {
  PreviewAtom,
  ViewAtom,
  DeviceAtom,
  DeviceDimensionsAtom,
  DeviceZoomAtom,
  EnabledAtom,
  InitialLoadCompleteAtom,
  UnsavedChangesAtom,
} from "./atoms";
import { useEditorStore } from "../../core/store";
import {
  EDITOR_CANVAS_BREAKPOINT_PX,
  isEditorCanvasBreakpointView,
} from "../../utils/tailwind/className";
import {
  getEditorTabletCanvasClasses,
  getEditorWidthOnlyCanvasClasses,
} from "./editorCanvasLayout";

export function Viewport({ children }: { children: React.ReactNode }) {
  const {
    enabled,
    connectors,
    actions: { setOptions },
  } = useEditor(state => ({ enabled: state.options.enabled }));

  const { actions, query } = useEditor();

  const editorPageIdsKey = useEditor((state: any) => {
    const root = state.nodes[ROOT_NODE];
    if (!root?.data?.nodes) return "";
    return root.data.nodes
      .filter((id: string) => state.nodes[id]?.data?.props?.type === "page")
      .join(",");
  });

  // ─── Composed hooks ───
  useComponentSync();
  useAutoOpenSidebar();
  useNodeDropStyling();
  const { handleKeyDown, handleDoubleClick, handleBodyKeyDown } = useViewportKeyboard();
  const { handleViewportClick } = useViewportClickDeselect();
  useEditorDocumentKeydown();

  // ─── Init ───
  useEffect(() => {
    if (!window) return;
    window.requestAnimationFrame(() => {
      setTimeout(
        () =>
          setOptions(options => {
            options.enabled = true;
          }),
        200
      );
    });
  }, [setOptions]);

  // ─── Atoms ───
  const classDarkEdit = useAtomValue(ViewSelectionAtom).dark ?? false;
  const [showGridLines, setShowGridLines] = useAtomState(ShowGridLinesAtom);
  const [isolate, setIsolate] = useAtomState(IsolateAtom);
  const viewMode = useAtomValue(ViewModeAtom);
  const [unsavedChangesRaw, setUnsavedChanged] = useAtomState(UnsavedChangesAtom);
  const unsavedChanges = unsavedChangesRaw as unknown as string | null;
  const view = useAtomValue(ViewAtom);
  const { setView: setStoreView, setPreview: setStorePreview } = useEditorStore();
  const [device, setDevice] = useAtomState(DeviceAtom);
  const deviceDimensions = useAtomValue(DeviceDimensionsAtom);
  const deviceZoom = useAtomValue(DeviceZoomAtom);
  const [preview, setPreview] = useAtomState(PreviewAtom);
  const setEnabled = useSetAtomState(EnabledAtom);
  const isolated = useAtomValue(IsolateAtom);
  const lastActive = useAtomValue(LastActiveAtom);
  const screenshot = useAtomValue(ScreenshotAtom);
  const [online, setOnline] = useAtomState(OnlineAtom);
  const sideBarOpen = useAtomValue(SideBarOpen);
  const sideBarLeft = useAtomValue(SideBarAtom);
  const isToolbarOverlayLayout = useEditorToolbarOverlayLayout();
  const sidebarOccupiesLeftGutter = sideBarOpen && sideBarLeft && !isToolbarOverlayLayout;
  const setInitialLoadComplete = useSetAtomState(InitialLoadCompleteAtom);
  const { emitter, config } = useSDK();
  const { activePageId } = usePageNavigation();
  const setToolboxMenu = useSetAtomState(ToolboxMenu);

  /** Same rules as native context menu: opens element menu at pointer; skips text fields. */
  const tryOpenCanvasNodeContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): boolean => {
      if (!enabled) return false;
      const target = e.target as HTMLElement;
      if (target.closest(".ProseMirror")) return false;
      if (target.closest('[contenteditable="true"]')) return false;
      if (target.closest("input, textarea, select")) return false;

      const nodeEl = target.closest("[node-id]");
      let nodeId = nodeEl?.getAttribute("node-id");
      if (!nodeId) return false;

      // Letterboxing / short pages: clicks land on ROOT Background instead of the page surface.
      if (nodeId === ROOT_NODE && isolate && isolate !== EDITOR_ALL_PAGES_STORAGE) {
        const iso = query.node(isolate).get();
        if (iso?.data?.props?.type === "page") {
          nodeId = isolate;
        }
      }

      const node = query.node(nodeId).get();
      if (!node) return false;

      e.preventDefault();
      e.stopPropagation();

      actions.selectNode(nodeId);

      const parentNode = node.data.parent ? query.node(node.data.parent).get() : null;
      setToolboxMenu({
        ...toolboxMenuInitialState,
        enabled: true,
        x: e.clientX,
        y: e.clientY,
        id: nodeId,
        name: String(node.data.name || ""),
        parent: parentNode
          ? {
              name: String(parentNode.data.name || ""),
              displayName: String(
                (parentNode.data.custom?.displayName as string) ||
                  (parentNode.data.displayName as string) ||
                  parentNode.data.name ||
                  ""
              ),
              props: parentNode.data.props || {},
            }
          : { ...toolboxMenuInitialState.parent },
      });
      return true;
    },
    [enabled, query, actions, setToolboxMenu, isolate]
  );

  const handleViewportContextMenuCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      tryOpenCanvasNodeContextMenu(e);
    },
    [tryOpenCanvasNodeContextMenu]
  );

  const handleViewportDoubleClickCapture = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (tryOpenCanvasNodeContextMenu(e)) {
        handleDoubleClick(e);
      }
    },
    [tryOpenCanvasNodeContextMenu, handleDoubleClick]
  );

  // ─── Grid lines ───
  useEffect(() => {
    const saved = phStorage.get("grid-lines");
    if (saved !== null) setShowGridLines(saved === "true");
  }, [setShowGridLines]);

  useEffect(() => {
    const viewport = document.getElementById("viewport");
    if (viewport) viewport.setAttribute("data-show-gridlines", showGridLines.toString());
    phStorage.set("grid-lines", showGridLines.toString());
  }, [showGridLines]);

  // ─── Expose query for style guide resolution ───
  useEffect(() => {
    if (typeof window !== "undefined") (window as any).__CRAFT_EDITOR__ = { query };
    return () => {
      if (typeof window !== "undefined") delete (window as any).__CRAFT_EDITOR__;
    };
  }, [query]);

  // ─── Sync atoms → store ───
  useEffect(() => {
    setStoreView(view);
  }, [view, setStoreView]);
  useEffect(() => {
    setStorePreview(preview);
  }, [preview, setStorePreview]);
  useEffect(() => {
    setDevice(view === "mobile");
  }, [view, setDevice]);

  // ─── Init localStorage ───
  useEffect(() => {
    phStorage.set("clipboard", {});
  }, []);

  // ─── Online/offline ───
  useEffect(() => {
    const handler = (event: Event) => {
      setOnline(event.type === "online");
      if (event.type === "online") setUnsavedChanged(null);
    };
    setOnline(window.navigator.onLine);
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    return () => {
      window.removeEventListener("online", handler);
      window.removeEventListener("offline", handler);
    };
  }, []);

  // ─── Page navigation store init ───
  const navInitRef = useRef(false);

  // ─── Page loading state ───
  const [pageLoading, setPageLoading] = useState(false);
  const [pageLoadDone, setPageLoadDone] = useState(false);

  // Build the isolation callback — extracted so it can be refreshed
  const makeOnIsolate = useCallback(
    () => async (pageId: string | null) => {
      if (config.callbacks.fetchPage) {
        setPageLoading(true);
        setPageLoadDone(false);
        const fetched = await isolatePageLazy(pageId, query, actions, setIsolate, config.callbacks.fetchPage);
        setPageLoadDone(true);
        // Let the loading bar animate to 100% before hiding
        if (!fetched) {
          setPageLoading(false);
          setPageLoadDone(false);
        }
        return;
      }
      isolatePageAlt(isolate, query, pageId, actions, setIsolate, true);
    },
    [config.callbacks.fetchPage, query, actions, setIsolate, isolate],
  );

  // Keep the nav store's onIsolate callback fresh (avoids stale closures)
  useEffect(() => {
    if (navInitRef.current) updateOnIsolate(makeOnIsolate());
  }, [makeOnIsolate]);

  useEffect(() => {
    if (navInitRef.current) return;
    const root = query.node(ROOT_NODE).get();
    if (!root) return;
    const pageIds = listPageNodeIds(query);
    if (pageIds.length === 0) return;

    navInitRef.current = true;

    // Check localStorage for a previously isolated page
    const rawStored = phStorage.get("isolated");
    if (rawStored === EDITOR_ALL_PAGES_STORAGE) {
      phStorage.remove("isolated");
    }
    const storedId = rawStored && rawStored !== "null" && pageIds.includes(rawStored) ? rawStored : null;

    const initialPageId = initPageNavigation({
      urlStrategy: config.urlStrategy || null,
      resolvePageIdFromSlug: (slug: string) => {
        const r = query.node(ROOT_NODE).get();
        if (!r?.data?.nodes) return null;
        return r.data.nodes.find((nodeId: string) => {
          const node = query.node(nodeId).get();
          if (node?.data?.props?.type === "page") {
            return sluggit(node.data.custom?.displayName, "-") === slug;
          }
          return false;
        }) || null;
      },
      getHomePageId: () => getDefaultEditorPageId(query),
      onIsolate: makeOnIsolate(),
    });

    // Prefer: URL page > localStorage page > nav store's pick (home page)
    const targetPage = initialPageId || storedId || getDefaultEditorPageId(query);
    if (targetPage && targetPage !== isolate) {
      const onIsolate = makeOnIsolate();
      setTimeout(() => onIsolate(targetPage), 0);
    }
  }, [editorPageIdsKey, query, actions, setIsolate, isolate, config.urlStrategy, makeOnIsolate]);

  // ─── Unsaved changes warning ───
  // Page switches use pushState (not Next.js router), so routeChangeStart
  // only fires for genuine navigations away from the editor.
  const hasDirtyChanges = typeof unsavedChanges === "string" && unsavedChanges.length > 0;

  useEffect(() => {
    if (!hasDirtyChanges) return;
    const warningText = "Leave site? Changes you made may not be saved.";

    const handleWindowClose = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return (e.returnValue = warningText);
    };
    const handleBrowseAway = () => {
      if (window.confirm(warningText)) return;
      Router.events.emit("routeChangeError");
    };

    window.addEventListener("beforeunload", handleWindowClose);
    Router.events.on("routeChangeStart", handleBrowseAway);
    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
      Router.events.off("routeChangeStart", handleBrowseAway);
    };
  }, [hasDirtyChanges]);

  // ─── Keyboard body listener ───
  useEffect(() => {
    document.addEventListener("keydown", handleBodyKeyDown);
    return () => document.removeEventListener("keydown", handleBodyKeyDown);
  }, []);

  // ─── View classes ───
  const desktopOuter = enabled
    ? "flex h-full overflow-hidden flex-row flex-1 min-w-0"
    : "flex h-full flex-row min-w-0 w-full";
  const desktopInner = enabled
    ? "flex-1 min-w-0 relative scrollbar-light bg-base-100 overflow-y-auto overflow-x-hidden"
    : "w-full h-full overflow-auto relative";

  const deviceClasses = {
    mobile: [
      "mx-auto flex z-2 transition overflow-hidden shrink-0 p-[6px] rounded-[44px] bg-[#1a1a1a] border-[3px] border-[#2a2a2a] shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_20px_60px_-10px_rgba(0,0,0,0.5),0_0_40px_-5px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] relative",
      "w-full h-full flex overflow-auto rounded-[38px] relative bg-base-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    ],
    desktop: [
      enabled
        ? "flex h-full overflow-hidden flex-row w-full absolute top-0 left-0 right-0 bottom-0"
        : "",
      enabled
        ? `w-full h-full overflow-auto ${viewMode === "component" ? "mt-[49px]" : ""} `
        : "w-full h-full overflow-auto",
    ],
  };

  let viewClasses: Record<string, string[]> = {
    mobile: [
      `flex overflow-hidden flex-row mx-auto w-${enabled ? "[380px]" : "full"} h-full `,
      enabled
        ? "w-full rounded-lg overflow-y-auto overflow-x-hidden scrollbar-light bg-base-100 relative"
        : "w-full h-full overflow-auto relative",
    ],
    desktop: [desktopOuter, desktopInner],
  };

  viewClasses.sm = getEditorTabletCanvasClasses(enabled, EDITOR_CANVAS_BREAKPOINT_PX.sm);
  ["md", "lg", "xl", "2xl"].forEach(bp => {
    viewClasses[bp] = getEditorWidthOnlyCanvasClasses(
      enabled,
      desktopOuter,
      desktopInner,
      (EDITOR_CANVAS_BREAKPOINT_PX as Record<string, number>)[bp]
    );
  });

  if (device) viewClasses = deviceClasses;
  const activeClass = viewClasses[view] ?? viewClasses.desktop;

  const bezelX = (6 + 3) * 2;
  const bezelY = (6 + 3) * 2;
  const deviceStyles =
    device && view === "mobile"
      ? ({
          width: `${deviceDimensions.width + bezelX}px`,
          height: `${deviceDimensions.height + bezelY}px`,
          zoom: deviceZoom,
          "--device-zoom-inverse": 1 / deviceZoom,
        } as React.CSSProperties)
      : {};

  // ─── Render ───
  return (
    <>
      <ViewportMeta />
      {enabled && <ProximityHoverManager />}
      <div
        className={`relative flex h-full w-full min-w-0 flex-1 overflow-hidden ${
          (device && view === "mobile") || isEditorCanvasBreakpointView(view)
            ? "bg-neutral/50 items-center justify-center"
            : "flex-row"
        }`}
        data-container={true}
      >
        <LoadingBar
          active={pageLoading}
          done={pageLoadDone}
          overlay
          onComplete={() => { setPageLoading(false); setPageLoadDone(false); }}
        />
        {/* Preview edit button */}
        {!enabled && !screenshot && (
          <FloatingWidget
            storageKey="preview-edit"
            defaultCorner={sideBarLeft ? "top-left" : "top-right"}
          >
            <button
              className="btn bg-primary text-primary-content cursor-pointer rounded-full p-4 text-2xl shadow-lg select-none"
              aria-label="Edit page"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Edit"
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
              onClick={() => {
                  const viewport = document.getElementById("viewport");
                  const scrollTop = viewport?.scrollTop ?? 0;
                  const scrollLeft = viewport?.scrollLeft ?? 0;
                  setOptions(options => {
                    options.enabled = true;
                    setPreview(false);
                    setTimeout(() => {
                      if (!lastActive) return;
                      const node = query.node(lastActive).get();
                      if (node) actions.selectNode(lastActive);
                    }, 0);
                  });
                  requestAnimationFrame(() => {
                    if (viewport) {
                      viewport.scrollTop = scrollTop;
                      viewport.scrollLeft = scrollLeft;
                    }
                  });
                }}
              >
                <TbCode />
              </button>
          </FloatingWidget>
        )}

        {enabled && !online && <DeviceOffline />}

        {enabled && (
          <div
            className={`absolute top-0 ${sidebarOccupiesLeftGutter ? "left-[360px]" : "left-0"} right-0 z-40 ${viewMode === "component" ? "" : "hidden"}`}
          >
            <ComponentEditorTabs />
          </div>
        )}

        {enabled && device && view === "mobile" && (
          <div
            className={`absolute top-4 ${sidebarOccupiesLeftGutter ? "left-[360px]" : "left-0"} right-0 z-50`}
          >
            <div className="bg-neutral/95 mx-auto flex w-fit items-center gap-4 rounded-lg px-4 py-2 shadow-lg backdrop-blur-sm">
              <DeviceSelector onClose={() => setDevice(false)} />
              <div className="bg-border h-4 w-px" />
              <DeviceZoom />
            </div>
          </div>
        )}

        <div className={`${activeClass[0]} w-full`} style={deviceStyles}>
          {device && view === "mobile" && (
            <div className="pointer-events-none absolute top-[14px] right-0 left-0 z-60 flex justify-center">
              <div className="h-[30px] w-[105px] rounded-full bg-[#0a0a0a]" />
            </div>
          )}
          <div
            id="viewport"
            role="application"
            onKeyDown={handleKeyDown}
            onClick={handleViewportClick}
            onDoubleClick={handleDoubleClick}
            onDoubleClickCapture={handleViewportDoubleClickCapture}
            onContextMenuCapture={handleViewportContextMenuCapture}
            data-isolated={!!isolated}
            tabIndex={0}
            className={`${activeClass[1]} w-full${classDarkEdit ? "dark" : ""}`}
            ref={(ref: any) => connectors.select(connectors.hover(ref, null), null)}
            style={
              viewMode === "component" && !device && !preview ? { marginTop: "49px" } : undefined
            }
          >
            {children}
          </div>
          {device && view === "mobile" && (
            <div className="pointer-events-none absolute right-0 bottom-[14px] left-0 z-60 flex justify-center">
              <div className="bg-foreground/30 h-[5px] w-[120px] rounded-full" />
            </div>
          )}
        </div>

        {device && view === "mobile" && enabled && (
          <DeviceScrollbar
            deviceWidth={deviceDimensions.width + bezelX}
            deviceHeight={deviceDimensions.height + bezelY}
            deviceZoom={deviceZoom}
            sideBarOpen={sideBarOpen}
            sideBarLeft={sideBarLeft}
          />
        )}

        {device && view === "mobile" && (
          <div id="device-tools-portal" className="pointer-events-none absolute inset-0 z-100" />
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
              zIndex: 9997,
            }}
          />
        )}

        {enabled ? <ToolboxContexual /> : null}
      </div>
    </>
  );
}
