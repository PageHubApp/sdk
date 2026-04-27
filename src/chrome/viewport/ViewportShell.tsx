import sluggit from "slug";
import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import Router from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { TbPencil, TbX } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { ToolboxMenu, toolboxMenuInitialState } from "../rendering/toolboxMenuAtom";
import { ToolboxContexual } from "./ToolboxContextual";
import { ShowGridLinesAtom } from "../../utils/atoms";
import {
  EDITOR_ALL_PAGES_STORAGE,
  hasPageIsolation,
  IsolateAtom,
  LastActiveAtom,
  OnlineAtom,
  ScreenshotAtom,
  SideBarAtom,
  SideBarOpen,
  ViewModeAtom,
  getDefaultEditorPageId,
  isolatePageInTree,
  isolatePageLazy,
  listPageNodeIds,
} from "../../utils/lib";
import { FloatingWidget } from "../floating/FloatingWidget";
import { useAutoOpenSidebar } from "../hooks/useAutoOpenSidebar";
import { useComponentSync } from "../hooks/useComponentSync";
import { EditModifiersAtom } from "../toolbar/Label";
import { DeviceOffline } from "../toolbar/DeviceOffline";
import { ComponentCanvasViewport } from "./ComponentCanvasViewport";
import { CanvasScopeBand } from "./CanvasScopeBand";
import { DeviceScrollbar } from "./DeviceScrollbar";
import { DeviceSelector } from "./DeviceSelector";
import { CanvasZoom } from "./CanvasZoom";
import { SideBySideFrame, resolveSecondaryWidthPx } from "./SideBySideFrame";
import { useSDK } from "../../core/context";
import { ViewportMeta } from "./ViewportMeta";
import { useEditorDocumentKeydown } from "../hooks/useEditorDocumentKeydown";
import { useViewportClickDeselect } from "./hooks/useViewportClickDeselect";
import { useViewportKeyboard } from "./hooks/useViewportKeyboard";
import { phStorage } from "../../utils/phStorage";
import { initPageNavigation, updateOnIsolate, usePageNavigation } from "../../utils/pageNavigation";
import { LoadingBar } from "../primitives/LoadingBar";

import {
  AppliedBreakpointsAtom,
  type AppliedBreakpointsShape,
  BreakpointWidthOverrideAtom,
  BreakpointZoomAtom,
  PendingBreakpointOverrideAtom,
  PreviewAtom,
  ResponsiveAtom,
  ShowBreakpointMarkersAtom,
  SideBySideAtom,
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
  getCanvasBreakpointPx,
  isEditorCanvasBreakpointView,
} from "../../utils/tailwind/className";
import { getEditorWidthOnlyCanvasClasses } from "./editorCanvasLayout";
import { DEVICE_FRAME_BY_VIEW, getDeviceFrameSpec } from "./deviceFrames";
import {
  rewriteBreakpoints,
  rewriteMediaToContainer,
  type BpKey,
} from "../../utils/breakpointRewrite";

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

  const themeBreakpoints = useEditor((state: any) => {
    return state.nodes[ROOT_NODE]?.data?.props?.theme?.breakpoints as
      | Record<string, number>
      | undefined;
  }) as Record<string, number> | undefined;

  // ─── Composed hooks ───
  useComponentSync();
  useAutoOpenSidebar();
  const { handleKeyDown, handleDoubleClick, handleBodyKeyDown } = useViewportKeyboard();
  const { handleViewportClick } = useViewportClickDeselect();
  useEditorDocumentKeydown();

  // Enable CraftJS editing after initial paint settles (avoids flash of unstyled nodes)
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
  const editModifiers = useAtomValue(EditModifiersAtom);
  const classDarkEdit = editModifiers.dark ?? false;
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
  const [breakpointZoom, setBreakpointZoom] = useAtomState(BreakpointZoomAtom);
  const [breakpointWidthOverride, setBreakpointWidthOverride] = useAtomState(
    BreakpointWidthOverrideAtom
  );
  const responsive = useAtomValue(ResponsiveAtom);
  const showBreakpointMarkers = useAtomValue(ShowBreakpointMarkersAtom);
  const [pendingBreakpointOverride, setPendingBreakpointOverride] = useAtomState(
    PendingBreakpointOverrideAtom
  );
  const [appliedBreakpoints, setAppliedBreakpoints] = useAtomState(AppliedBreakpointsAtom);
  const [preview, setPreview] = useAtomState(PreviewAtom);
  const setEnabled = useSetAtomState(EnabledAtom);
  const sideBySide = useAtomValue(SideBySideAtom);
  const isolated = useAtomValue(IsolateAtom);
  const lastActive = useAtomValue(LastActiveAtom);
  const screenshot = useAtomValue(ScreenshotAtom);
  const [online, setOnline] = useAtomState(OnlineAtom);
  const sideBarOpen = useAtomValue(SideBarOpen);
  const sideBarLeft = useAtomValue(SideBarAtom);
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
      if (nodeId === ROOT_NODE && hasPageIsolation(isolate)) {
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

  // ─── Init localStorage ───
  // (Phase 2 deleted the canvas → scope chip sync effect — the canvas viewport
  // IS the scope now; no separate atom to mirror.)
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

  // ─── Side-by-side scroll mirror (Phase 3) ───
  // Both frames share scroll state but each has its own DOM scroll container.
  // The primary viewport handler mirrors scrollTop into secondary; the secondary
  // mirrors back. `isMirroring` flag prevents an infinite ping-pong.
  const scrollMirrorRef = useRef<{
    primary: HTMLDivElement | null;
    secondary: HTMLDivElement | null;
    isMirroring: boolean;
  }>({ primary: null, secondary: null, isMirroring: false });

  // ─── Page loading state (single enum instead of two booleans) ───
  const [pageLoad, setPageLoad] = useState<"idle" | "loading" | "done">("idle");

  const handleLoadComplete = useCallback(() => setPageLoad("idle"), []);

  // Safety net: reset if LoadingBar's onComplete never fires (unmount mid-animation)
  useEffect(() => {
    if (pageLoad !== "done") return;
    const id = setTimeout(() => setPageLoad("idle"), 2000);
    return () => clearTimeout(id);
  }, [pageLoad]);

  // Isolation callback — called by the nav store when a page switch is requested
  const onIsolate = useCallback(
    async (pageId: string | null) => {
      if (config.callbacks.fetchPage) {
        setPageLoad("loading");
        const fetched = await isolatePageLazy(
          pageId,
          query,
          actions,
          setIsolate,
          config.callbacks.fetchPage
        );
        setPageLoad(fetched ? "done" : "idle");
        return;
      }
      isolatePageInTree(query, actions, pageId, setIsolate);
    },
    [config.callbacks.fetchPage, query, actions, setIsolate, isolate]
  );

  // Keep the nav store's callback fresh (avoids stale closures)
  useEffect(() => {
    if (navInitRef.current) updateOnIsolate(onIsolate);
  }, [onIsolate]);

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
    const storedId =
      rawStored && rawStored !== "null" && pageIds.includes(rawStored) ? rawStored : null;

    const initialPageId = initPageNavigation({
      urlStrategy: config.urlStrategy || null,
      resolvePageIdFromSlug: (slug: string) => {
        const r = query.node(ROOT_NODE).get();
        if (!r?.data?.nodes) return null;
        return (
          r.data.nodes.find((nodeId: string) => {
            const node = query.node(nodeId).get();
            if (node?.data?.props?.type === "page") {
              const customSlug = node.data.props?.pageSlug;
              return (customSlug || sluggit(node.data.custom?.displayName, "-")) === slug;
            }
            return false;
          }) || null
        );
      },
      getHomePageId: () => getDefaultEditorPageId(query),
      onIsolate,
    });

    // Prefer: URL page > localStorage page > nav store's pick (home page).
    // Initial page is already in the tree from SSR — just isolate, don't fetch.
    const targetPage = initialPageId || storedId || getDefaultEditorPageId(query);
    if (targetPage && targetPage !== isolate) {
      // Defer to next tick so CraftJS tree is fully mounted before hiding pages
      setTimeout(() => {
        isolatePageInTree(query, actions, targetPage, setIsolate);
      }, 0);
    }
  }, [editorPageIdsKey, query, actions, setIsolate, isolate, config.urlStrategy, onIsolate]);

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

  // ─── Reset breakpoint zoom when view changes ───
  // A 50% zoom set for 2XL would shrink MD unnecessarily — start each view fresh.
  useEffect(() => {
    setBreakpointZoom(1);
  }, [view, setBreakpointZoom]);

  // ─── View classes ───
  const desktopOuter = enabled
    ? "flex h-full overflow-hidden flex-row flex-1 min-w-0"
    : "flex h-full flex-row min-w-0 w-full";
  const desktopInner = enabled
    ? "flex-1 min-w-0 relative scrollbar-light bg-base-100 overflow-y-auto overflow-x-hidden"
    : "w-full h-full overflow-auto relative";

  // Resolve canvas breakpoint widths from site theme (falls back to defaults).
  const resolvedBreakpointPx = getCanvasBreakpointPx({ breakpoints: themeBreakpoints });

  // Resolve a device frame spec when Device mode is on and view is a real breakpoint.
  // (`view === "desktop"` has no frame; popover already redirects to mobile in that case.)
  const deviceFrame =
    device && isEditorCanvasBreakpointView(view)
      ? getDeviceFrameSpec(
          view,
          // Only the phone frame respects user-customizable phone dimensions.
          DEVICE_FRAME_BY_VIEW[view] === "phone" ? deviceDimensions : undefined,
          resolvedBreakpointPx
        )
      : null;
  const isPhoneFrame = deviceFrame?.kind === "phone";

  let viewClasses: Record<string, string[]> = {
    desktop: [desktopOuter, desktopInner],
  };
  ["mobile", "sm", "md", "lg", "xl", "2xl"].forEach(bp => {
    viewClasses[bp] = getEditorWidthOnlyCanvasClasses(enabled);
  });
  if (deviceFrame) {
    viewClasses[view] = [deviceFrame.outerClassName, deviceFrame.innerClassName];
  } else if (device) {
    // Device toggle on but breakpoint not resolvable — fall back to fluid desktop.
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

  // ─── Breakpoint canvas width (drag-resizable) ───
  const breakpointWidthPx = breakpointActive
    ? (breakpointWidthOverride[view] ??
      (resolvedBreakpointPx as Record<string, number>)[view])
    : null;
  // Responsive ON: clamp to editor area (`min(100%, X)`) so the canvas never overflows.
  // Responsive OFF: force exact breakpoint width — parent gets `overflow-auto` so the
  // canvas can scroll horizontally when wider than the editor area.
  const canvasOuterStyle: React.CSSProperties =
    breakpointWidthPx != null
      ? responsive
        ? { ...deviceStyles, maxWidth: `min(100%, ${breakpointWidthPx}px)` }
        : { ...deviceStyles, width: `${breakpointWidthPx}px`, maxWidth: "none", flexShrink: 0 }
      : deviceStyles;

  const handlePointerDownEdge = useCallback(
    (side: "left" | "right") => (e: React.PointerEvent) => {
      if (!breakpointActive || !breakpointWidthPx) return;
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = breakpointWidthPx;
      const z = canvasZoomActive && breakpointZoom !== 1 ? breakpointZoom : 1;
      const minW = 240;
      const maxW = 3840;
      const onMove = (ev: PointerEvent) => {
        const dxScreen = ev.clientX - startX;
        // Drag is symmetric (canvas is mx-auto centered): each side moves half the cursor delta.
        // Right handle: cursor moving right grows the canvas; left handle: cursor moving left grows it.
        const delta = (side === "right" ? dxScreen : -dxScreen) * 2;
        const next = Math.max(minW, Math.min(maxW, Math.round(startWidth + delta / z)));
        setBreakpointWidthOverride(prev => ({ ...prev, [view]: next }));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("blur", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      window.addEventListener("blur", onUp);
    },
    [breakpointActive, breakpointWidthPx, breakpointZoom, canvasZoomActive, setBreakpointWidthOverride, view]
  );

  // ─── Breakpoint marker drag (per Tailwind breakpoint sm/md/lg/xl/2xl) ───
  // Live-preview goes to PendingBreakpointOverrideAtom (no commit). Pointer-up
  // commits to ROOT.props.theme.breakpoints via a single history entry, then
  // rewrites the in-page <style id="tailwind-compiled"> in place.
  const breakpointMarkerOrder = ["sm", "md", "lg", "xl", "2xl"] as const;
  type BpKey = (typeof breakpointMarkerOrder)[number];

  const getCommittedBpPx = useCallback(
    (bp: BpKey): number => {
      const fromTheme = themeBreakpoints?.[bp];
      if (typeof fromTheme === "number") return fromTheme;
      return EDITOR_CANVAS_BREAKPOINT_PX[bp];
    },
    [themeBreakpoints]
  );

  const getEffectiveBpPx = useCallback(
    (bp: BpKey): number => pendingBreakpointOverride[bp] ?? getCommittedBpPx(bp),
    [pendingBreakpointOverride, getCommittedBpPx]
  );

  const handleMarkerPointerDown = useCallback(
    (bp: BpKey) => (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = getEffectiveBpPx(bp);
      const z = canvasZoomActive && breakpointZoom !== 1 ? breakpointZoom : 1;
      // Clamp inside neighboring breakpoints (keep ordering monotonically increasing).
      const idx = breakpointMarkerOrder.indexOf(bp);
      const prev = idx > 0 ? breakpointMarkerOrder[idx - 1] : null;
      const next = idx < breakpointMarkerOrder.length - 1 ? breakpointMarkerOrder[idx + 1] : null;
      const minW = prev ? getCommittedBpPx(prev) + 1 : 240;
      const maxW = next ? getCommittedBpPx(next) - 1 : 3840;

      const onMove = (ev: PointerEvent) => {
        const dxScreen = ev.clientX - startX;
        const nextPx = Math.max(
          minW,
          Math.min(maxW, Math.round(startWidth + dxScreen / z))
        );
        setPendingBreakpointOverride(prevState => ({ ...prevState, [bp]: nextPx }));
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        window.removeEventListener("blur", onUp);

        // Read the final pending value before clearing.
        let finalPx: number | undefined;
        setPendingBreakpointOverride(prevState => {
          finalPx = prevState[bp];
          const { [bp]: _drop, ...rest } = prevState;
          return rest;
        });
        if (typeof finalPx !== "number" || finalPx === startWidth) return;

        // Commit: persist to ROOT.props.theme.breakpoints as one history entry.
        // (Single setProp is naturally one undo step — no need for history.merge.)
        actions.setProp(ROOT_NODE, (props: any) => {
          if (!props.theme) props.theme = {};
          if (!props.theme.breakpoints) props.theme.breakpoints = {};
          props.theme.breakpoints[bp] = finalPx;
        });

        // Rewrite the live <style id="tailwind-compiled"> from currently-applied
        // values to the new committed values, in place.
        const styleEl = document.getElementById("tailwind-compiled") as HTMLStyleElement | null;
        if (styleEl) {
          const fromBps = appliedBreakpoints;
          const toBps = { ...fromBps, [bp]: finalPx };
          // Editor-only: also normalize any new `@media` to `@container` so
          // dynamic classes added during editing land in the same container-query
          // namespace as SSR-baked CSS.
          styleEl.textContent = rewriteMediaToContainer(
            rewriteBreakpoints(styleEl.textContent || "", fromBps, toBps)
          );
          setAppliedBreakpoints(toBps);
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      window.addEventListener("blur", onUp);
    },
    [
      actions,
      appliedBreakpoints,
      breakpointZoom,
      canvasZoomActive,
      getCommittedBpPx,
      getEffectiveBpPx,
      setAppliedBreakpoints,
      setPendingBreakpointOverride,
    ]
  );

  const resetMarkerBreakpoint = useCallback(
    (bp: BpKey) => () => {
      const defaultPx = EDITOR_CANVAS_BREAKPOINT_PX[bp];
      const current = themeBreakpoints?.[bp];
      if (current === undefined || current === defaultPx) return;

      // Remove the override from theme.breakpoints (delete the key, keep others).
      actions.setProp(ROOT_NODE, (props: any) => {
        if (props.theme?.breakpoints) {
          delete props.theme.breakpoints[bp];
          if (Object.keys(props.theme.breakpoints).length === 0) delete props.theme.breakpoints;
        }
      });

      const styleEl = document.getElementById("tailwind-compiled") as HTMLStyleElement | null;
      if (styleEl) {
        const fromBps = appliedBreakpoints;
        const toBps = { ...fromBps, [bp]: defaultPx };
        styleEl.textContent = rewriteMediaToContainer(
          rewriteBreakpoints(styleEl.textContent || "", fromBps, toBps)
        );
        setAppliedBreakpoints(toBps);
      }
    },
    [actions, appliedBreakpoints, setAppliedBreakpoints, themeBreakpoints]
  );

  // On mount: seed AppliedBreakpointsAtom from theme.breakpoints + apply rewrite
  // to the SSR-baked <style> tag in case it didn't run with current theme.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const styleEl = document.getElementById("tailwind-compiled") as HTMLStyleElement | null;
    if (!styleEl) return;
    const target: AppliedBreakpointsShape = {
      sm: themeBreakpoints?.sm ?? 640,
      md: themeBreakpoints?.md ?? 768,
      lg: themeBreakpoints?.lg ?? 1024,
      xl: themeBreakpoints?.xl ?? 1280,
      "2xl": themeBreakpoints?.["2xl"] ?? 1536,
    };
    // Only rewrite if appliedBreakpoints differs from target.
    const sameAsApplied = (Object.keys(target) as Array<keyof typeof target>).every(
      k => appliedBreakpoints[k] === target[k]
    );
    if (!sameAsApplied) {
      styleEl.textContent = rewriteMediaToContainer(
        rewriteBreakpoints(styleEl.textContent || "", appliedBreakpoints, target)
      );
      setAppliedBreakpoints(target);
    }
    // Run only when committed theme.breakpoints changes (not on every appliedBreakpoints write).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    themeBreakpoints?.sm,
    themeBreakpoints?.md,
    themeBreakpoints?.lg,
    themeBreakpoints?.xl,
    themeBreakpoints?.["2xl"],
  ]);

  const resetBreakpointWidth = useCallback(() => {
    if (!breakpointActive) return;
    setBreakpointWidthOverride(prev => {
      if (!(view in prev)) return prev;
      const { [view]: _drop, ...rest } = prev;
      return rest;
    });
  }, [breakpointActive, setBreakpointWidthOverride, view]);

  // ─── Render ───
  return (
    <>
      <ViewportMeta />
      <div
        className={`relative flex h-full w-full min-w-0 flex-1 ${
          breakpointActive && !responsive ? "overflow-x-auto overflow-y-hidden" : "overflow-hidden"
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
        {enabled && <CanvasScopeBand />}
        {/* Preview edit button */}
        {!enabled && !screenshot && (
          <FloatingWidget
            storageKey="preview-edit"
            defaultCorner={sideBarLeft ? "top-left" : "top-right"}
          >
            <button
              className="bg-neutral text-neutral-content hover:bg-neutral/90 inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg transition-colors select-none [&_svg]:size-[14px]"
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
                  if (viewport) {
                    viewport.scrollTop = scrollTop;
                    viewport.scrollLeft = scrollLeft;
                  }
                });
              }}
            >
              <TbPencil />
              Edit
            </button>
          </FloatingWidget>
        )}

        {enabled && !online && <DeviceOffline />}

        {enabled && viewMode === "canvas" && (
          <ComponentCanvasViewport className="absolute inset-0 z-30" />
        )}

        {enabled && deviceFrame && (
          <div className="absolute top-4 right-0 left-0 z-50">
            <div className="bg-neutral/95 mx-auto flex w-fit items-center gap-4 rounded-xl px-4 py-2 shadow-lg backdrop-blur-sm">
              {isPhoneFrame ? (
                <DeviceSelector onClose={() => setDevice(false)} />
              ) : (
                <div className="text-neutral-content flex items-center gap-2 text-xs">
                  <span className="font-medium capitalize">{deviceFrame.kind}</span>
                  <span className="opacity-70">
                    {deviceFrame.innerWidth} × {deviceFrame.innerHeight}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDevice(false)}
                    className="hover:text-base-content ml-2 transition-colors"
                    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                    data-tooltip-content="Exit device mode"
                    aria-label="Exit device mode"
                  >
                    <TbX className="size-4" />
                  </button>
                </div>
              )}
              <div className="bg-border h-4 w-px" />
              <CanvasZoom
                zoomAtom={DeviceZoomAtom}
                fitMode={{
                  kind: "both",
                  targetW: deviceFrame.innerWidth + deviceFrame.bezelX,
                  targetH: deviceFrame.innerHeight + deviceFrame.bezelY,
                  chromeOffsetW: 220,
                  chromeOffsetH: 220,
                  max: 1,
                }}
                activeKey="device"
                storageKey="editor-device-zoom"
              />
            </div>
          </div>
        )}

        <div className={`${activeClass[0]} w-full relative`} style={canvasOuterStyle}>
          {deviceFrame?.decoration === "notch" && (
            <div className="pointer-events-none absolute top-[14px] right-0 left-0 z-60 flex justify-center">
              <div className="h-[30px] w-[105px] rounded-full bg-[#0a0a0a]" />
            </div>
          )}
          {deviceFrame?.decoration === "camera-top" && (
            <div className="pointer-events-none absolute top-[6px] right-0 left-0 z-60 flex justify-center">
              <div className="size-1.5 rounded-full bg-[#0a0a0a]" />
            </div>
          )}
          {deviceFrame?.decoration === "camera-side" && (
            <div className="pointer-events-none absolute top-0 bottom-0 left-[6px] z-60 flex items-center">
              <div className="size-1.5 rounded-full bg-[#0a0a0a]" />
            </div>
          )}
          {enabled && breakpointActive && (
            <>
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize canvas (drag) — double-click to reset"
                onPointerDown={handlePointerDownEdge("left")}
                onDoubleClick={resetBreakpointWidth}
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content={`${breakpointWidthPx}px — drag to resize, double-click to reset`}
                data-tooltip-place="right"
                className="group absolute top-0 left-0 z-40 flex h-full w-5 -translate-x-full cursor-ew-resize items-center justify-center select-none"
              >
                <div className="bg-base-content/30 group-hover:bg-base-content/60 h-10 w-1 rounded-full transition-colors" />
              </div>
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize canvas (drag) — double-click to reset"
                onPointerDown={handlePointerDownEdge("right")}
                onDoubleClick={resetBreakpointWidth}
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content={`${breakpointWidthPx}px — drag to resize, double-click to reset`}
                data-tooltip-place="left"
                className="group absolute top-0 right-0 z-40 flex h-full w-5 translate-x-full cursor-ew-resize items-center justify-center select-none"
              >
                <div className="bg-base-content/30 group-hover:bg-base-content/60 h-10 w-1 rounded-full transition-colors" />
              </div>
            </>
          )}
          {enabled && !device && showBreakpointMarkers && (
            <>
              {breakpointMarkerOrder.map(bp => {
                const px = getEffectiveBpPx(bp);
                const isPending = pendingBreakpointOverride[bp] !== undefined;
                const isCustom = themeBreakpoints?.[bp] !== undefined;
                return (
                  <div
                    key={bp}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`Breakpoint ${bp.toUpperCase()} at ${px}px — drag to adjust, double-click to reset`}
                    onPointerDown={handleMarkerPointerDown(bp)}
                    onDoubleClick={resetMarkerBreakpoint(bp)}
                    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                    data-tooltip-content={`${bp.toUpperCase()} · ${px}px — drag to adjust${isCustom ? ", double-click to reset" : ""}`}
                    data-tooltip-place="right"
                    className="group absolute top-0 bottom-0 z-30 w-3 -translate-x-1/2 cursor-ew-resize select-none"
                    style={{ left: `${px}px` }}
                  >
                    <div
                      className="pointer-events-none absolute inset-y-0 left-1/2"
                      style={{
                        borderLeft: isPending
                          ? "1px dashed rgba(99,102,241,0.9)"
                          : isCustom
                            ? "1px dashed rgba(99,102,241,0.6)"
                            : "1px dashed rgba(120,120,120,0.45)",
                      }}
                    />
                    <span
                      className={`pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 rounded bg-base-200 px-1 font-mono text-[10px] leading-none whitespace-nowrap ${
                        isPending || isCustom
                          ? "text-primary"
                          : "text-base-content/70 group-hover:text-base-content"
                      }`}
                    >
                      {bp.toUpperCase()} · {px}
                    </span>
                  </div>
                );
              })}
            </>
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
            ref={(ref: any) => {
              connectors.select(connectors.hover(ref, null), null);
              // Phase 3: register primary container for scroll-sync.
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
          {deviceFrame?.decoration === "notch" && (
            <div className="pointer-events-none absolute right-0 bottom-[14px] left-0 z-60 flex justify-center">
              <div className="bg-foreground/30 h-[5px] w-[120px] rounded-full" />
            </div>
          )}
          {deviceFrame?.decoration === "laptop-chin" && (
            <div className="pointer-events-none absolute right-0 bottom-[8px] left-0 z-60 flex justify-center">
              <div className="h-[3px] w-[120px] rounded-full bg-[#3a3a3a]" />
            </div>
          )}
          {deviceFrame?.decoration === "monitor-stand" && (
            <div className="pointer-events-none absolute right-0 bottom-[10px] left-0 z-60 flex justify-center">
              <div className="h-[2px] w-[180px] rounded-full bg-[#3a3a3a]" />
            </div>
          )}
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

        {/* Phase 3: side-by-side read-only mirror (when enabled) */}
        {enabled && sideBySide.enabled && !deviceFrame && (
          <SideBySideFrame
            secondaryView={sideBySide.secondaryView}
            widthPx={resolveSecondaryWidthPx(sideBySide.secondaryView, themeBreakpoints)}
            scrollMirrorRef={scrollMirrorRef}
          />
        )}

        {deviceFrame && (
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
