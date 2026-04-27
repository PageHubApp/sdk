import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useAtomState, useAtomValue } from "@zedux/react";
import {
  TbArrowBackUp,
  TbArrowForwardUp,
  TbBoxModel2,
  TbChevronDown,
  TbCode,
  TbDeviceDesktop,
  TbDeviceMobile,
  TbEye,
  TbFileText,
  TbMenu2,
  TbPlayerPlay,
  TbPlus,
  TbX,
} from "react-icons/tb";
import {
  LayersDialogOpenAtom,
  SessionTokenAtom,
  SettingsAtom,
  ShowGridLinesAtom,
  useSetAtomState,
} from "../../utils/atoms";
import { ComponentsAtom, LastActiveAtom, SideBarAtom, ViewModeAtom } from "../../utils/lib";
import { applyCanvasVisibility } from "../../utils/componentIsolation";
import {
  EDITOR_CANVAS_BREAKPOINT_PX,
  getCanvasBreakpointPx,
  isEditorCanvasBreakpointView,
} from "../../utils/tailwind/className";
import {
  finalizeToolboxHistorySelectionSync,
  markToolboxHistorySelectionSync,
  usePanelUrl,
} from "../../utils/usePanelUrl";
import { lazy, Suspense } from "react";
import { SaveIndicator } from "../inline-tools/PublishButton";
import { ToolbarPortalDropdown } from "../inline-tools/ToolbarPortalDropdown";
import { MediaManagerModal } from "../toolbar/inputs/media/MediaManagerModal";

// Lazy: rarely-open modals — fetch on first open so HMR edits to them
// (and to FloatingPanel/PropertyRenderer chains they import) don't ripple
// through the always-mounted Header tree.
const LayersDialog = lazy(() =>
  import("../toolbar/dialogs/LayersDialog").then(m => ({ default: m.LayersDialog }))
);
const ModifiersModal = lazy(() =>
  import("./ModifiersModal").then(m => ({ default: m.ModifiersModal }))
);
import {
  BreakpointZoomAtom,
  DeviceAtom,
  DeviceDimensionsAtom,
  DeviceZoomAtom,
  EnabledAtom,
  PreviewAtom,
  ResponsiveAtom,
  SideBySideAtom,
  ViewAtom,
} from "./atoms";
import { CanvasZoom } from "./CanvasZoom";
import { DEVICE_FRAME_BY_VIEW, getDeviceFrameSpec } from "./deviceFrames";
import { ComponentSelector } from "./ComponentSelector";
import { EditorNavigation } from "./EditorNavigation";

import { NodeBreadcrumb } from "./NodeBreadcrumb";
import { SiteSettingsModal } from "./SiteSettingsModal";
import { ChipPopover } from "../toolbar/breakpoint-chip/ChipPopover";

import { useSDK } from "../../core/context";
import type { ViewMode as CanvasViewMode } from "../../core/store";
import { phStorage } from "../../utils/phStorage";
import { HeaderItem as Item } from "./header/HeaderItem";
import { useHeaderShortcuts } from "./header/useHeaderShortcuts";

// Re-export for external consumers
export { useComponentVisible } from "./header/useComponentVisible";

/**
 * Side-by-side mirror toggle. Lives inside the canvas-width dropdown.
 * Capped at 2 frames — the secondary is always read-only and the choice of
 * which bp it shows is independent of the primary canvas view.
 */
function SideBySideRow() {
  const [sbs, setSbs] = useAtomState(SideBySideAtom);
  const choices: { id: CanvasViewMode; label: string }[] = [
    { id: "mobile", label: "Mobile" },
    { id: "sm", label: "SM" },
    { id: "md", label: "MD" },
    { id: "lg", label: "LG" },
    { id: "xl", label: "XL" },
    { id: "2xl", label: "2XL" },
  ];
  return (
    <div className="border-base-300 mt-2 flex flex-col gap-1.5 border-t pt-2">
      <label className="flex cursor-pointer items-center gap-2 text-[11px]">
        <input
          type="checkbox"
          checked={sbs.enabled}
          onChange={e => setSbs(prev => ({ ...prev, enabled: e.target.checked }))}
          className="size-3.5 cursor-pointer"
        />
        <span className="font-semibold">Side-by-side mirror</span>
        <span className="text-neutral-content text-[10px]">read-only</span>
      </label>
      {sbs.enabled && (
        <div className="grid grid-cols-6 gap-1 pl-5">
          {choices.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSbs(prev => ({ ...prev, secondaryView: c.id }))}
              aria-pressed={sbs.secondaryView === c.id}
              className={`rounded-md border px-1 py-1 font-mono text-[10px] font-bold transition ${
                sbs.secondaryView === c.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-base-300 hover:bg-base-200 text-base-content"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const Header = () => {
  const { enabled, canUndo, canRedo, actions, query, componentFingerprint, themeBreakpoints } =
    useEditor((state, query) => {
      const root = state.nodes[ROOT_NODE];
      const fp =
        root?.data?.nodes
          ?.filter(id => state.nodes[id]?.data?.props?.type === "component")
          .map(id => {
            const cid = state.nodes[id]?.data?.nodes?.[0];
            return `${id}:${cid ? (state.nodes[cid]?.data?.nodes?.length ?? 0) : 0}`;
          })
          .join(",") || "";
      return {
        enabled: state.options.enabled,
        canUndo: query.history.canUndo(),
        canRedo: query.history.canRedo(),
        componentFingerprint: fp,
        themeBreakpoints: root?.data?.props?.theme?.breakpoints as
          | Record<string, number>
          | undefined,
      };
    });
  const { emitter } = useSDK();

  const setComponents = useSetAtomState(ComponentsAtom);

  // Load components by querying for type="component" nodes
  useEffect(() => {
    if (!query || !enabled) return;

    try {
      const rootNode = query.node(ROOT_NODE).get();
      const rootChildren = rootNode?.data?.nodes || [];

      // Find all Container nodes with type="component"
      const componentNodes = rootChildren
        .map(nodeId => {
          try {
            const node = query.node(nodeId).get();
            if (node?.data?.props?.type === "component") {
              // Get the first child of the component container (the actual content)
              const childNodeId = node.data.nodes?.[0];

              if (childNodeId) {
                // Serialize the child node tree for dragging
                const tree = query.node(childNodeId).toNodeTree();
                const nodePairs = Object.keys(tree.nodes).map(id => [
                  id,
                  query.node(id).toSerializedNode(),
                ]);
                const entries = Object.fromEntries(nodePairs);
                const serializedNodes = JSON.stringify(entries);

                return {
                  rootNodeId: childNodeId, // The actual content node
                  nodes: serializedNodes,
                  name:
                    node?.data?.custom?.displayName ||
                    node?.data?.displayName ||
                    "Unnamed Component",
                  isSection: node?.data?.props?.isSection || false, // Read isSection from container
                };
              }
            }
          } catch (e) {
            return null;
          }
          return null;
        })
        .filter(Boolean);

      setComponents(componentNodes);
    } catch (e) {
      console.error("❌ Error loading components:", e);
    }
  }, [query, enabled, setComponents, componentFingerprint]);

  const setActive = useSetAtomState(LastActiveAtom);

  const { isOpen, toggleToolboxInsert, open, close } = usePanelUrl();
  const [isMediaManagerModalOpen, setIsMediaManagerModalOpen] = useState(false);
  const [isLayersDialogOpen, setIsLayersDialogOpen] = useAtomState(LayersDialogOpenAtom);
  const [isSiteSettingsModalOpen, setIsSiteSettingsModalOpen] = useState(false);
  const [isModifiersModalOpen, setIsModifiersModalOpen] = useState(false);

  const setEnabled = useSetAtomState(EnabledAtom);

  const { features, config } = useSDK();
  const isTenant = features.directSave;
  const siteSettingsExtraTabs = config.editorChromeSlots?.siteSettingsExtraTabs;

  const [preview, setPreview] = useAtomState(PreviewAtom);

  const toggleEditorEnabled = () =>
    actions.setOptions(options => {
      // selectNode(ROOT_NODE);
      options.enabled = !enabled;

      if (!options.enabled) {
        const dom = document.getElementById("viewport");

        const arr_elms = dom.getElementsByTagName("*") || [];
        const elms_len = arr_elms.length;

        for (var i = 0; i < elms_len; i++) {
          [
            "data-bounding-box",
            "data-empty-state",
            "data-renderer",
            "contenteditable",
            "data-no-scrollbars",
            "draggable",
            "data-enabled",
            "data-selected",
            "data-border",
            "data-hover",
            "draggable",
            "main-node",
            "node-id",
          ].forEach(_ => arr_elms[i].removeAttribute(_));
        }
      }

      const active = query.getEvent("selected").first();
      setActive(active);

      setEnabled(options.enabled);
    });

  const [view, setView] = useAtomState(ViewAtom);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Theme management
  useEffect(() => {
    const savedTheme = phStorage.get("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    setIsDarkMode(shouldBeDark);

    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);

    // Suppress transitions during theme switch to avoid oklch interpolation artifacts
    document.documentElement.classList.add("theme-transition");

    if (newTheme) {
      document.documentElement.classList.add("dark");
      phStorage.set("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      phStorage.set("theme", "light");
    }

    // Re-enable transitions after repaint
    requestAnimationFrame(() => document.documentElement.classList.remove("theme-transition"));
  };

  const animate = false;

  const scrollSelectedNodeIntoView = () => {
    setTimeout(() => {
      const selected = document.querySelector('[data-selected="true"]');
      if (selected) selected.scrollIntoView();
    }, 200);
  };

  const headerCanvasDeviceRows = [
    {
      mode: "fluid" as const,
      label: "Responsive",
      sub: "Fluid canvas",
      description:
        "ON: canvas clamps to the editor area. OFF: canvas renders at the exact breakpoint width and overflows when the editor is narrower.",
    },
    {
      mode: "device" as const,
      label: "Device",
      sub: "Phone · tablet · monitor",
      description:
        "Pin to a real device frame at the selected breakpoint (phone, tablet, laptop, monitor).",
    },
  ];
  const breakpointDescriptions: Record<string, string> = {
    mobile: "Mobile — single-column, stacked layouts. The mobile-first base.",
    sm: "Tablet portrait — 2-col grids, stacked headers, side-by-side buttons start here.",
    md: "Tablet landscape — flex-row layouts and 3-col grids kick in.",
    lg: "Desktop — 4-col grids, split heroes, asymmetric layouts. Most design density lives here.",
    xl: "Wide desktop — extra breathing room; rarely needs new layout rules.",
    "2xl": "Ultra-wide — for cinema-width monitors. Usually nothing changes past this.",
  };
  const resolvedBreakpointPx = getCanvasBreakpointPx({ breakpoints: themeBreakpoints });
  const headerCanvasBreakpointRows = [
    {
      id: "mobile",
      label: "Mobile",
      sub: `${resolvedBreakpointPx.mobile}px`,
      description: breakpointDescriptions.mobile,
    },
    {
      id: "sm",
      label: "SM",
      sub: `Tablet · ${resolvedBreakpointPx.sm}px`,
      description: breakpointDescriptions.sm,
    },
    ...(["md", "lg", "xl", "2xl"] as const).map(bp => ({
      id: bp,
      label: bp === "2xl" ? "2XL" : bp.toUpperCase(),
      sub: `${resolvedBreakpointPx[bp]}px`,
      description: breakpointDescriptions[bp],
    })),
  ];
  const [device, setDevice] = useAtomState(DeviceAtom);
  const [responsive, setResponsive] = useAtomState(ResponsiveAtom);
  const deviceDimensions = useAtomValue(DeviceDimensionsAtom);
  const breakpointZoom = useAtomValue(BreakpointZoomAtom);
  const deviceZoom = useAtomValue(DeviceZoomAtom);
  const activeZoom = device ? deviceZoom : breakpointZoom;
  const isScaled = Math.abs(activeZoom - 1) > 0.001;
  const [settings, setSettings] = useAtomState(SettingsAtom);
  const sessionToken = useAtomValue(SessionTokenAtom);

  const [sideBarLeft, setSideBarLeft] = useAtomState(SideBarAtom);
  const [viewMode, setViewMode] = useAtomState(ViewModeAtom);
  const [showGridLines, setShowGridLines] = useAtomState(ShowGridLinesAtom);
  const [showHidden, setShowHidden] = useState(true);

  /** Single source for overlay / flyout `top` under the icon toolbar (not page selector). */
  const editorChromeNavRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!enabled) return;
    const toolbar = document.getElementById("toolbar");
    const el = editorChromeNavRef.current;
    if (!toolbar || !el) return;
    const sync = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      toolbar.style.setProperty("--editor-nav-height", `${h}px`);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      ro.disconnect();
      toolbar.style.removeProperty("--editor-nav-height");
    };
  }, [enabled]);

  // Keyboard shortcuts
  useHeaderShortcuts({
    setIsMediaManagerModalOpen,
    setIsSiteSettingsModalOpen,
    setIsLayersDialogOpen,
    setShowGridLines,
    setIsModifiersModalOpen,
    setShowHidden,
  });

  if (!enabled) return null;

  return (
    <>
      <header
        ref={editorChromeNavRef}
        role="banner"
        className="border-base-300 bg-base-100 text-base-content pointer-events-auto relative z-50 flex flex-row-reverse items-center justify-between border-b px-1 py-1"
        data-tutorial="header"
      >
        <Item
          ariaLabel="Insert blocks and components"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => {
            toggleToolboxInsert();
            e.stopPropagation();
          }}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Insert blocks & components"
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
        >
          <TbPlus />
        </Item>

        <Item
          ariaLabel="Redo"
          disabled={!canRedo}
          onClick={() => {
            markToolboxHistorySelectionSync();
            actions.history.redo();

            const active = query.getEvent("selected");
            if (!active) actions.selectNode(ROOT_NODE);
            finalizeToolboxHistorySelectionSync();
          }}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Redo"
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
        >
          <TbArrowForwardUp />
        </Item>

        <Item
          ariaLabel="Undo"
          disabled={!canUndo}
          onClick={() => {
            markToolboxHistorySelectionSync();
            actions.history.undo();

            const active = query.getEvent("selected");
            if (!active) actions.selectNode(ROOT_NODE);
            finalizeToolboxHistorySelectionSync();
          }}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Undo"
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
        >
          <TbArrowBackUp />
        </Item>

        {animate && (
          <Item
            ariaLabel="Play Animations"
            onClick={() => {}}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Play Animations"
            data-tooltip-place="bottom"
            data-tooltip-offset={10}
          >
            <TbPlayerPlay />
          </Item>
        )}

        <ToolbarPortalDropdown
          openOn="hover"
          align="center"
          className="border-base-300 bg-base-100 w-[22rem] rounded-xl border p-2 shadow-xl"
          trigger={
            <button
              type="button"
              aria-label="Canvas width — also the edit scope (next class write targets this layer)"
              aria-haspopup="menu"
              className="tool-button gap-0.5!"
            >
              <span className="inline-flex h-4 min-w-6 items-center justify-center px-0.5">
                {isScaled ? (
                  <span className="font-mono text-[11px] leading-none font-bold tracking-tight">
                    {Math.round(activeZoom * 100)}%
                  </span>
                ) : (
                  <>
                    {view === "mobile" && <TbDeviceMobile className="size-4" />}
                    {(view === "desktop" || view === "tablet") && (
                      <TbDeviceDesktop className="size-4" />
                    )}
                    {isEditorCanvasBreakpointView(view) && view !== "mobile" && (
                      <span className="font-mono text-[11px] leading-none font-bold tracking-tight">
                        {view === "2xl" ? "2XL" : view.toUpperCase()}
                      </span>
                    )}
                  </>
                )}
              </span>
              {/* Phase 2: prominent scope pill — viewport switcher IS the edit scope. */}
              {!isScaled && view !== "desktop" && view !== "mobile" && (
                <span
                  className="bg-primary text-primary-content ml-0.5 inline-flex h-4 items-center justify-center rounded-sm px-1 font-mono text-[9px] leading-none font-bold uppercase"
                  aria-hidden
                >
                  scope
                </span>
              )}
              <TbChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
            </button>
          }
        >
          <div className="mb-2 grid grid-cols-2 gap-1.5">
            {headerCanvasDeviceRows.map(row => {
              const selected = row.mode === "device" ? device : responsive;
              return (
                <button
                  key={row.mode}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={selected}
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content={row.description}
                  data-tooltip-place="bottom"
                  data-tooltip-offset={10}
                  onClick={() => {
                    if (row.mode === "device") {
                      setDevice(d => !d);
                      // "desktop" (fluid full-width) has no device frame — default to mobile when turning device on.
                      if (!device && view === "desktop") setView("mobile" as CanvasViewMode);
                    } else {
                      setResponsive(r => !r);
                    }
                    scrollSelectedNodeIntoView();
                  }}
                  className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-base-300 hover:bg-base-200 text-base-content"
                  }`}
                >
                  {row.mode === "fluid" ? (
                    <TbDeviceDesktop className="size-4 shrink-0" />
                  ) : (
                    <TbDeviceMobile className="size-4 shrink-0" />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col leading-tight">
                    <span className="font-medium">{row.label}</span>
                    <span className="text-neutral-content text-[10px]">{row.sub}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-neutral-content mt-1 mb-1 px-0.5 text-[10px] font-semibold tracking-wide uppercase">
            Breakpoints
          </div>
          <div className="grid grid-cols-6 gap-1">
            {headerCanvasBreakpointRows.map(row => {
              const selected = view === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content={row.description}
                  data-tooltip-place="bottom"
                  data-tooltip-offset={10}
                  onClick={() => {
                    // Click selected chip again → unset back to fluid desktop.
                    setView(
                      (view === row.id ? "desktop" : (row.id as CanvasViewMode)) as CanvasViewMode
                    );
                    scrollSelectedNodeIntoView();
                  }}
                  className={`flex flex-col items-center justify-center rounded-md border px-1 py-1.5 text-center transition ${
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-base-300 hover:bg-base-200 text-base-content"
                  }`}
                >
                  <span className="font-mono text-[11px] leading-none font-bold tracking-tight">
                    {row.label}
                  </span>
                  <span className="text-neutral-content mt-0.5 text-[9px] leading-none">
                    {row.sub.replace("px", "")}
                  </span>
                </button>
              );
            })}
          </div>

          <SideBySideRow />

          <div className="border-base-300 mt-2 flex items-center justify-between gap-2 border-t pt-2">
            <span className="text-neutral-content px-0.5 text-[10px] font-semibold tracking-wide uppercase">
              Zoom
            </span>
            {device && isEditorCanvasBreakpointView(view) ? (
              (() => {
                const frame = getDeviceFrameSpec(
                  view,
                  DEVICE_FRAME_BY_VIEW[view] === "phone" ? deviceDimensions : undefined,
                  resolvedBreakpointPx
                );
                return (
                  <CanvasZoom
                    zoomAtom={DeviceZoomAtom}
                    fitMode={{
                      kind: "both",
                      targetW: frame.innerWidth + frame.bezelX,
                      targetH: frame.innerHeight + frame.bezelY,
                      chromeOffsetW: 220,
                      chromeOffsetH: 220,
                      max: 1,
                    }}
                    activeKey="device-menu"
                    storageKey="editor-device-zoom"
                  />
                );
              })()
            ) : (
              <CanvasZoom
                zoomAtom={BreakpointZoomAtom}
                fitMode={{
                  kind: "width",
                  target:
                    (resolvedBreakpointPx as Record<string, number>)[view] ?? 1024,
                  chromeOffset: 420,
                  max: 1,
                }}
                activeKey="breakpoint-menu"
                storageKey="editor-breakpoint-zoom"
              />
            )}
          </div>
        </ToolbarPortalDropdown>

        <Item
          ariaLabel="Preview"
          onClick={() => {
            // Save viewport scroll position before toggling
            const viewport = document.getElementById("viewport");
            const scrollTop = viewport?.scrollTop ?? 0;
            const scrollLeft = viewport?.scrollLeft ?? 0;

            toggleEditorEnabled();
            setPreview(!preview);
            // Deselect any active node when toggling preview
            if (enabled) {
              actions.selectNode(null);
            }
            viewport?.focus({ preventScroll: true });

            // Restore scroll position after layout settles
            requestAnimationFrame(() => {
              if (viewport) {
                viewport.scrollTop = scrollTop;
                viewport.scrollLeft = scrollLeft;
              }
            });
          }}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Preview"
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
        >
          {enabled ? <TbEye /> : <TbCode />}
        </Item>

        <Item
          ariaLabel={`Switch to ${viewMode === "page" ? "Components" : "Page"} Editor`}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content={`Switch to ${viewMode === "page" ? "Components" : "Page"} Editor`}
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.blur();
            const newMode = viewMode === "page" ? "canvas" : "page";
            setViewMode(newMode);
            actions.selectNode(null);
            if (newMode === "page") {
              import("@/utils/lib").then(({ isolatePageInTree }) => {
                isolatePageInTree(query, actions, null, () => {});
              });
            }
            // ROOT-child visibility is driven by ComponentCanvasViewport's
            // mount effect (canvas mode) and applyCanvasVisibility here for
            // the page-mode side. No inline hide loops.
            applyCanvasVisibility(query, actions, { mode: newMode });
          }}
        >
          {viewMode === "page" ? <TbBoxModel2 /> : <TbFileText />}
        </Item>

        <Item
          ariaLabel="Publish"
          onClick={() => open("publish")}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Publish"
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
        >
          <SaveIndicator />
        </Item>

        <Item
          ariaLabel="More Options"
          onMouseDown={e => e.stopPropagation()}
          onClick={() => {
            if (isOpen) {
              close();
            } else {
              open("menu");
            }
          }}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="More Options"
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
        >
          {isOpen ? <TbX /> : <TbMenu2 />}
        </Item>
      </header>

      {/* Combined breadcrumb / page selector row - Below Header */}
      <div className="bg-base-100 pointer-events-auto">
        {viewMode === "canvas" ? (
          <div className="border-base-300 flex h-10 min-h-10 shrink-0 items-center border-b px-3 py-0">
            <ComponentSelector className="w-full" />
          </div>
        ) : (
          <NodeBreadcrumb />
        )}
      </div>

      <EditorNavigation
        settings={settings}
        isTenant={isTenant}
        sideBarLeft={sideBarLeft}
        setSideBarLeft={setSideBarLeft}
        setIsLayersDialogOpen={setIsLayersDialogOpen}
        setIsMediaManagerModalOpen={setIsMediaManagerModalOpen}
        setIsSiteSettingsModalOpen={setIsSiteSettingsModalOpen}
        setIsModifiersModalOpen={setIsModifiersModalOpen}
        showHidden={showHidden}
        setShowHidden={setShowHidden}
        toggleTheme={toggleTheme}
        isDarkMode={isDarkMode}
      />

      <MediaManagerModal
        isOpen={isMediaManagerModalOpen}
        onClose={() => setIsMediaManagerModalOpen(false)}
      />

      {isLayersDialogOpen && (
        <Suspense fallback={null}>
          <LayersDialog isOpen onClose={() => setIsLayersDialogOpen(false)} />
        </Suspense>
      )}

      <SiteSettingsModal
        isOpen={isSiteSettingsModalOpen}
        onClose={() => setIsSiteSettingsModalOpen(false)}
        extraTabs={siteSettingsExtraTabs}
      />

      {isModifiersModalOpen && (
        <Suspense fallback={null}>
          <ModifiersModal isOpen onClose={() => setIsModifiersModalOpen(false)} />
        </Suspense>
      )}

      {/* Singleton breakpoint-chip popover — anchored to whichever chip is open. */}
      <ChipPopover />
    </>
  );
};
