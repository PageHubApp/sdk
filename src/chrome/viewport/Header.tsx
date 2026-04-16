import { ROOT_NODE, useEditor } from "@craftjs/core";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useAtomState, useAtomValue } from "@zedux/react";
import {
  TbArrowBackUp,
  TbArrowForwardUp,
  TbBoxModel2,
  TbCheck,
  TbChevronDown,
  TbCode,
  TbDeviceDesktop,
  TbDeviceFloppy,
  TbDeviceMobile,
  TbEye,
  TbFileText,
  TbMenu2,
  TbPlayerPlay,
  TbPlus,
  TbX,
} from "react-icons/tb";
import { SessionTokenAtom, SettingsAtom, ShowGridLinesAtom } from "../../utils/atoms";
import { ComponentsAtom, LastActiveAtom, SideBarAtom, ViewModeAtom } from "../../utils/lib";
import { useSetAtomState } from "../../utils/atoms";
import {
  EDITOR_CANVAS_BREAKPOINT_PX,
  isEditorCanvasBreakpointView,
} from "../../utils/tailwind/className";
import {
  finalizeToolboxHistorySelectionSync,
  markToolboxHistorySelectionSync,
  usePanelUrl,
} from "../../utils/usePanelUrl";
import { MediaManagerModal } from "../toolbar/inputs/media/MediaManagerModal";
import { LayersDialog } from "../toolbar/dialogs/LayersDialog";
import { SaveIndicator } from "../inline-tools/PublishButton";
import { ToolbarPortalDropdown } from "../inline-tools/ToolbarPortalDropdown";
import { EnabledAtom, PreviewAtom, ViewAtom } from "./atoms";
import { ComponentSelector } from "./ComponentSelector";
import { EditorNavigation } from "./EditorNavigation";

import { NodeBreadcrumb } from "./NodeBreadcrumb";
import { PageSelector } from "./PageSelector";
import { SiteSettingsModal } from "./SiteSettingsModal";
import { ModifiersModal } from "./ModifiersModal";

import type { ViewMode as CanvasViewMode } from "../../core/store";
import { useSDK } from "../../core/context";
import { HeaderItem as Item } from "./header/HeaderItem";
import { useHeaderShortcuts } from "./header/useHeaderShortcuts";
import { phStorage } from "../../utils/phStorage";

// Re-export for external consumers
export { useComponentVisible } from "./header/useComponentVisible";

export const Header = () => {
  const { enabled, canUndo, canRedo, actions, query } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));
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
  }, [query, enabled, setComponents]);

  const setActive = useSetAtomState(LastActiveAtom);

  const { isOpen, toggle, open, close } = usePanelUrl();
  const [isMediaManagerModalOpen, setIsMediaManagerModalOpen] = useState(false);
  const [isLayersDialogOpen, setIsLayersDialogOpen] = useState(false);
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

  const headerCanvasRows = [
    { id: "desktop", label: "Full width", sub: "Fluid canvas" },
    { id: "mobile", label: "Device", sub: "Phone frame" },
    {
      id: "sm",
      label: "SM",
      sub: `Tablet preview · ${EDITOR_CANVAS_BREAKPOINT_PX.sm}px wide`,
    },
    ...["md", "lg", "xl", "2xl"].map(bp => ({
      id: bp,
      label: bp === "2xl" ? "2XL" : bp.toUpperCase(),
      sub: `${EDITOR_CANVAS_BREAKPOINT_PX[bp]}px · full height`,
    })),
  ];
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
        className="border-base-300 bg-base-100 text-base-content pointer-events-auto relative z-50 flex flex-row-reverse items-center justify-between border-b px-1.5 py-1"
        data-tutorial="header"
      >
        <Item
          ariaLabel="Add Component"
          onMouseDown={e => e.stopPropagation()}
          onClick={e => {
            toggle("components");
            e.stopPropagation();
          }}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Add Component"
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
          className="border-base-300 bg-base-100 min-w-[12rem] rounded-lg border p-1 py-1.5 shadow-xl"
          trigger={
            <button
              type="button"
              aria-label="Canvas width"
              aria-haspopup="menu"
              className="tool-button gap-0.5!"
            >
              {view === "mobile" && <TbDeviceMobile />}
              {(view === "desktop" || view === "tablet") && <TbDeviceDesktop />}
              {isEditorCanvasBreakpointView(view) && (
                <span className="font-mono text-xs leading-none font-bold tracking-tight">
                  {view === "2xl" ? "2XL" : view.toUpperCase()}
                </span>
              )}
              <TbChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
            </button>
          }
        >
          <div className="text-neutral-content px-2 pb-1 text-[10px] font-semibold tracking-wide uppercase">
            Canvas width
          </div>
          <div className="ph-select-item-host">
            {headerCanvasRows.map(row => (
              <button
                key={row.id}
                type="button"
                role="menuitemradio"
                aria-checked={view === row.id}
                onClick={() => {
                  setView(row.id as CanvasViewMode);
                  scrollSelectedNodeIntoView();
                }}
                className="ph-select-item items-start gap-2 text-xs"
              >
                <span className="text-primary flex size-4 shrink-0 items-center justify-center">
                  {view === row.id ? <TbCheck className="size-3.5" /> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-neutral-content text-[10px]">{row.sub}</span>
                </span>
              </button>
            ))}
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
          ariaLabel={`Switch to ${viewMode === "page" ? "Component" : "Page"} Editor`}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content={`Switch to ${viewMode === "page" ? "Component" : "Page"} Editor`}
          data-tooltip-place="bottom"
          data-tooltip-offset={10}
          onClick={() => {
              const newMode = viewMode === "page" ? "component" : "page";
              setViewMode(newMode);
              actions.selectNode(null);
              const rootNode = query.node(ROOT_NODE).get();

              if (newMode === "page") {
                // Switching to page view - restore normal state
                // Deselect any active node

                // Un-isolate to show all pages
                import("@/utils/lib").then(({ isolatePageInTree }) => {
                  isolatePageInTree(query, actions, null, () => {});
                });

                // Show headers, footers, and pages
                rootNode.data.nodes.forEach(nodeId => {
                  const node = query.node(nodeId).get();
                  const nodeType = node?.data?.props?.type;

                  if (nodeType === "header" || nodeType === "footer" || nodeType === "page") {
                    actions.setHidden(nodeId, false);
                    actions.setProp(nodeId, prop => (prop.hidden = false));
                  }
                });
              } else {
                // Switching to component view - hide pages, headers, footers, AND component containers
                rootNode.data.nodes.forEach(nodeId => {
                  const node = query.node(nodeId).get();
                  const nodeType = node?.data?.props?.type;

                  if (
                    nodeType === "header" ||
                    nodeType === "footer" ||
                    nodeType === "page" ||
                    nodeType === "component"
                  ) {
                    actions.setHidden(nodeId, true);
                    actions.setProp(nodeId, prop => (prop.hidden = true));
                  }
                });

                // ComponentEditorTabs will handle showing the active component if there's a tab
              }
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

      {/* Page/Component Selector Bar - Below Header */}
      <div className="border-base-300 bg-base-100 pointer-events-auto border-b px-3 py-2">
        {viewMode === "page" ? (
          <PageSelector className="w-full" />
        ) : (
          <ComponentSelector className="w-full" />
        )}
      </div>

      {/* Node Breadcrumb - Below Page/Component Selector */}
      <div className="bg-base-100 pointer-events-auto">
        <NodeBreadcrumb />
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

      <LayersDialog isOpen={isLayersDialogOpen} onClose={() => setIsLayersDialogOpen(false)} />

      <SiteSettingsModal
        isOpen={isSiteSettingsModalOpen}
        onClose={() => setIsSiteSettingsModalOpen(false)}
        extraTabs={siteSettingsExtraTabs}
      />

      <ModifiersModal
        isOpen={isModifiersModalOpen}
        onClose={() => setIsModifiersModalOpen(false)}
      />
    </>
  );
};
