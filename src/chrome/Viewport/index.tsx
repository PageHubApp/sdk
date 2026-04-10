import sluggit from "slug";
import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { Tooltip } from "components/layout/Tooltip";
import { useRouter, router } from "next/router";
import React, { useEffect, useState } from "react";
import { TbCode } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { ShowGridLinesAtom } from "utils/atoms";
import {
  IsolateAtom,
  OnlineAtom,
  ScreenshotAtom,
  SideBarAtom,
  SideBarOpen,
  ViewModeAtom,
  isolatePageAlt,
} from "utils/lib";
import { FloatingWidget } from "../FloatingWidget";
import { ProximityHoverManager } from "../NodeControllers/ProximityHoverManager";
import { useAutoOpenSidebar } from "../hooks/useAutoOpenSidebar";
import { useComponentSync } from "../hooks/useComponentSync";
import { ViewSelectionAtom } from "../Toolbar/Label";
import { DeviceOffline } from "../Toolbar/DeviceOffline";
import { ComponentEditorTabs } from "./ComponentEditorTabs";
import { DeviceScrollbar } from "./DeviceScrollbar";
import { DeviceSelector } from "./DeviceSelector";
import { DeviceZoom } from "./DeviceZoom";
import { useSDK } from "../../context";
import { MinimumSizeOverlay } from "./MinimumSizeOverlay";
import { ViewportMeta } from "./ViewportMeta";
import { useNodeDropStyling } from "./hooks/useNodeDropStyling";
import { useViewportKeyboard } from "./hooks/useViewportKeyboard";
import { phStorage } from "../../utils/phStorage";

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
import { useEditorStore } from "../../store";
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

  // ─── Composed hooks ───
  useComponentSync();
  useAutoOpenSidebar();
  useNodeDropStyling();
  const { handleKeyDown, handleDoubleClick, handleBodyKeyDown } = useViewportKeyboard();

  // ─── Init ───
  useEffect(() => {
    if (!window) return;
    window.requestAnimationFrame(() => {
      setTimeout(() => setOptions(options => { options.enabled = true; }), 200);
    });
  }, [setOptions]);

  // ─── Atoms ───
  const classDarkEdit = useAtomValue(ViewSelectionAtom).dark ?? false;
  const [showGridLines, setShowGridLines] = useAtomState(ShowGridLinesAtom);
  const [isolate, setIsolate] = useAtomState(IsolateAtom);
  const viewMode = useAtomValue(ViewModeAtom);
  const [unsavedChanges, setUnsavedChanged] = useAtomState(UnsavedChangesAtom);
  const view = useAtomValue(ViewAtom);
  const { setView: setStoreView, setPreview: setStorePreview } = useEditorStore();
  const [device, setDevice] = useAtomState(DeviceAtom);
  const deviceDimensions = useAtomValue(DeviceDimensionsAtom);
  const deviceZoom = useAtomValue(DeviceZoomAtom);
  const [preview, setPreview] = useAtomState(PreviewAtom);
  const setEnabled = useSetAtomState(EnabledAtom);
  const isolated = useAtomValue(IsolateAtom);
  const lastActive = useAtomValue(require("utils/lib").LastctiveAtom);
  const screenshot = useAtomValue(ScreenshotAtom);
  const [online, setOnline] = useAtomState(OnlineAtom);
  const sideBarOpen = useAtomValue(SideBarOpen);
  const sideBarLeft = useAtomValue(SideBarAtom);
  const setInitialLoadComplete = useSetAtomState(InitialLoadCompleteAtom);
  const nextRouter = useRouter();
  const { emitter } = useSDK();

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
    return () => { if (typeof window !== "undefined") delete (window as any).__CRAFT_EDITOR__; };
  }, [query]);

  // ─── Sync atoms → store ───
  useEffect(() => { setStoreView(view); }, [view, setStoreView]);
  useEffect(() => { setStorePreview(preview); }, [preview, setStorePreview]);
  useEffect(() => { setDevice(view === "mobile"); }, [view, setDevice]);

  // ─── Init localStorage ───
  useEffect(() => { phStorage.set("clipboard", {}); }, []);

  // ─── Online/offline ───
  useEffect(() => {
    const handler = (event: Event) => {
      setOnline(event.type === "online");
      if (event.type === "online") setUnsavedChanged(false);
    };
    setOnline(window.navigator.onLine);
    window.addEventListener("online", handler);
    window.addEventListener("offline", handler);
    return () => { window.removeEventListener("online", handler); window.removeEventListener("offline", handler); };
  }, []);

  // ─── URL-based page isolation ───
  useEffect(() => {
    const pathParts = nextRouter.asPath.split("/").filter(p => p && !p.startsWith("?"));
    const root = query.node(ROOT_NODE).get();
    if (!root) return;

    const handlePageSwitch = (targetPageId: string | null) => {
      if (unsavedChanges && Object.keys(unsavedChanges).length > 0) {
        emitter.emit("save", { isDraft: true });
        setUnsavedChanged(null);
      }
      isolatePageAlt(isolate, query, targetPageId, actions, setIsolate, true);
    };

    if (pathParts.length >= 3) {
      const pageSlug = pathParts[pathParts.length - 1];
      const matchingPage = root.data.nodes.find((nodeId: string) => {
        const node = query.node(nodeId).get();
        if (node?.data?.props?.type === "page") {
          return sluggit(node.data.custom?.displayName, "-") === pageSlug;
        }
        return false;
      });
      if (matchingPage && matchingPage !== isolate) {
        setTimeout(() => handlePageSwitch(matchingPage), 500);
      }
    } else if (pathParts.length <= 2) {
      const homePageId = root.data.nodes.find((nodeId: string) => {
        const node = query.node(nodeId).get();
        return node?.data?.props?.type === "page" && node?.data?.props?.isHomePage;
      });
      if (homePageId && homePageId !== isolate) {
        setTimeout(() => handlePageSwitch(homePageId), 500);
      }
    }
  }, [nextRouter.asPath]);

  // ─── Unsaved changes warning ───
  const hasDirtyChanges = unsavedChanges && (typeof unsavedChanges !== "object" || Object.keys(unsavedChanges).length > 0);

  useEffect(() => {
    if (!hasDirtyChanges) return;
    const warningText = "Leave site? Changes you made may not be saved.";

    const handleWindowClose = (e: BeforeUnloadEvent) => { e.preventDefault(); return (e.returnValue = warningText); };
    const handleBrowseAway = (url: string) => {
      const currentParts = router.asPath.split("/").filter(p => p && !p.startsWith("?"));
      const newParts = url.split("/").filter(p => p && !p.startsWith("?"));
      if (currentParts.length >= 2 && newParts.length >= 2 && currentParts[0] === "build" && newParts[0] === "build" && currentParts[1] === newParts[1]) return;
      if (window.confirm(warningText)) return;
      router.events.emit("routeChangeError");
    };

    window.addEventListener("beforeunload", handleWindowClose);
    router.events.on("routeChangeStart", handleBrowseAway);
    return () => { window.removeEventListener("beforeunload", handleWindowClose); router.events.off("routeChangeStart", handleBrowseAway); };
  }, [hasDirtyChanges, router]);

  // ─── Keyboard body listener ───
  useEffect(() => {
    document.addEventListener("keydown", handleBodyKeyDown);
    return () => document.removeEventListener("keydown", handleBodyKeyDown);
  }, []);

  // ─── View classes ───
  const desktopOuter = enabled ? "flex h-full overflow-hidden flex-row flex-1 min-w-0" : "flex h-full flex-row min-w-0 w-full";
  const desktopInner = enabled
    ? "flex-1 min-w-0 relative scrollbar-light bg-base-100 overflow-y-auto overflow-x-hidden"
    : "w-full h-full overflow-auto relative";

  const deviceClasses = {
    mobile: [
      "mx-auto flex z-2 transition overflow-hidden shrink-0 p-[6px] rounded-[44px] bg-[#1a1a1a] border-[3px] border-[#2a2a2a] shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_20px_60px_-10px_rgba(0,0,0,0.5),0_0_40px_-5px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] relative",
      "w-full h-full flex overflow-auto rounded-[38px] relative bg-base-100 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    ],
    desktop: [
      enabled ? "flex h-full overflow-hidden flex-row w-full absolute top-0 left-0 right-0 bottom-0" : "",
      enabled ? `w-full h-full overflow-auto ${viewMode === "component" ? "mt-[49px]" : ""} ` : "w-full h-full overflow-auto",
    ],
  };

  let viewClasses: Record<string, string[]> = {
    mobile: [
      `flex overflow-hidden flex-row mx-auto w-${enabled ? "[380px]" : "full"} h-full `,
      enabled ? "w-full rounded-lg overflow-y-auto overflow-x-hidden scrollbar-light bg-base-100 relative" : "w-full h-full overflow-auto relative",
    ],
    desktop: [desktopOuter, desktopInner],
  };

  viewClasses.sm = getEditorTabletCanvasClasses(enabled, EDITOR_CANVAS_BREAKPOINT_PX.sm);
  ["md", "lg", "xl", "2xl"].forEach(bp => {
    viewClasses[bp] = getEditorWidthOnlyCanvasClasses(enabled, desktopOuter, desktopInner, (EDITOR_CANVAS_BREAKPOINT_PX as Record<string, number>)[bp]);
  });

  if (device) viewClasses = deviceClasses;
  const activeClass = viewClasses[view] ?? viewClasses.desktop;

  const bezelX = (6 + 3) * 2;
  const bezelY = (6 + 3) * 2;
  const deviceStyles = device && view === "mobile"
    ? { width: `${deviceDimensions.width + bezelX}px`, height: `${deviceDimensions.height + bezelY}px`, zoom: deviceZoom, "--device-zoom-inverse": 1 / deviceZoom } as React.CSSProperties
    : {};

  // ─── Render ───
  return (
    <>
      <ViewportMeta />
      {enabled && <ProximityHoverManager />}
      <div
        className={`flex h-full overflow-hidden flex-1 min-w-0 w-full ${
          (device && view === "mobile") || isEditorCanvasBreakpointView(view)
            ? "items-center justify-center bg-neutral/50"
            : "flex-row"
        }`}
        data-container={true}
      >
        {/* Preview edit button */}
        {!enabled && !screenshot && (
          <FloatingWidget storageKey="preview-edit" defaultCorner={sideBarLeft ? "top-left" : "top-right"}>
            <Tooltip content="Edit" placement="bottom" arrow={false}>
              <button
                className="btn cursor-pointer select-none rounded-full bg-primary p-4 text-2xl text-primary-content shadow-lg"
                aria-label="Edit page"
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
                    if (viewport) { viewport.scrollTop = scrollTop; viewport.scrollLeft = scrollLeft; }
                  });
                }}
              >
                <TbCode />
              </button>
            </Tooltip>
          </FloatingWidget>
        )}

        {enabled && !online && <DeviceOffline />}

        {enabled && (
          <div className={`absolute top-0 ${sideBarOpen && sideBarLeft ? "left-[360px]" : "left-0"} right-0 z-40 ${viewMode === "component" ? "" : "hidden"}`}>
            <ComponentEditorTabs />
          </div>
        )}

        {enabled && device && view === "mobile" && (
          <div className={`absolute top-4 ${sideBarOpen && sideBarLeft ? "left-[360px]" : "left-0"} right-0 z-50`}>
            <div className="mx-auto flex w-fit items-center gap-4 rounded-lg bg-neutral/95 px-4 py-2 shadow-lg backdrop-blur-sm">
              <DeviceSelector onClose={() => setDevice(false)} />
              <div className="h-4 w-px bg-border" />
              <DeviceZoom />
            </div>
          </div>
        )}

        <div className={`${activeClass[0]} w-full`} style={deviceStyles}>
          {device && view === "mobile" && (
            <div className="pointer-events-none absolute left-0 right-0 top-[14px] z-60 flex justify-center">
              <div className="h-[30px] w-[105px] rounded-full bg-[#0a0a0a]" />
            </div>
          )}
          <div
            id="viewport"
            role="application"
            onKeyDown={handleKeyDown}
            onDoubleClick={handleDoubleClick}
            data-isolated={!!isolated}
            tabIndex={0}
            className={`${activeClass[1]} w-full${classDarkEdit ? " dark" : ""}`}
            ref={(ref: any) => connectors.select(connectors.hover(ref, null), null)}
            style={viewMode === "component" && !device && !preview ? { marginTop: "49px" } : undefined}
          >
            {children}
          </div>
          {device && view === "mobile" && (
            <div className="pointer-events-none absolute bottom-[14px] left-0 right-0 z-60 flex justify-center">
              <div className="h-[5px] w-[120px] rounded-full bg-foreground/30" />
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
            style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 9997 }}
          />
        )}
      </div>

      {enabled && <MinimumSizeOverlay />}
    </>
  );
}
