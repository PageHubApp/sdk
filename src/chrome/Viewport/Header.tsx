import { ROOT_NODE, useEditor } from "@craftjs/core";
import { Tooltip } from "components/layout/Tooltip";

import { useEffect, useState } from "react";

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
import { SessionTokenAtom, SettingsAtom, ShowGridLinesAtom } from "utils/atoms";
import {
  ComponentsAtom,
  DesignSystemSidebarAtom,
  LastctiveAtom,
  SideBarAtom,
  ViewModeAtom,
} from "utils/lib";
import { useSetAtomState } from "../../utils/atoms";
import { EDITOR_CANVAS_BREAKPOINT_PX, isEditorCanvasBreakpointView } from "../../utils/tailwind/className";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { MediaManagerModal } from "../Toolbar/Inputs/media/MediaManagerModal";
import { LayersDialog } from "../Toolbar/Tools/LayersDialog";
import { SaveIndicator } from "../Tools/PublishButton";
import { ToolbarPortalDropdown } from "../Tools/ToolbarPortalDropdown";
import { EnabledAtom, PreviewAtom, ViewAtom } from "./atoms";
import { ComponentSelector } from "./ComponentSelector";
import { DesignSystemSidebar } from "./DesignSystemSidebar";
import { EditorNavigation } from "./EditorNavigation";
import { ImportExportDialog } from "./ImportExportDialog";

import { NodeBreadcrumb } from "./NodeBreadcrumb";
import { PageSelector } from "./PageSelector";
import { SiteSettingsModal } from "./SiteSettingsModal";
import { ModifiersModal } from "./ModifiersModal";

import { useSDK } from "../../context";
import { HeaderItem as Item } from "./Header/HeaderItem";
import { useHeaderShortcuts } from "./Header/useHeaderShortcuts";
import { phStorage } from "../../utils/phStorage";

// Re-export for external consumers
export { useComponentVisible } from "./Header/useComponentVisible";

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

  const setActive = useSetAtomState(LastctiveAtom);

  const { isOpen, panel, toggle, open, close } = usePanelUrl();
  const [isMediaManagerModalOpen, setIsMediaManagerModalOpen] = useState(false);
  const [isLayersDialogOpen, setIsLayersDialogOpen] = useState(false);
  const [isSiteSettingsModalOpen, setIsSiteSettingsModalOpen] = useState(false);
  const [isModifiersModalOpen, setIsModifiersModalOpen] = useState(false);
  const [isImportExportDialogOpen, setIsImportExportDialogOpen] = useState(false);
  const [isDesignSystemSidebarOpen, setIsDesignSystemSidebarOpen] =
    useAtomState(DesignSystemSidebarAtom);

  const setEnabled = useSetAtomState(EnabledAtom);

  const { features } = useSDK();
  const isTenant = features.directSave;

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

  // Keyboard shortcuts
  useHeaderShortcuts({
    setIsMediaManagerModalOpen,
    setIsDesignSystemSidebarOpen,
    setIsSiteSettingsModalOpen,
    setIsLayersDialogOpen,
    setShowGridLines,
    setIsImportExportDialogOpen,
    setIsModifiersModalOpen,
    setShowHidden,
  });

  if (!enabled) return null;

  return (
    <>
      <header
        role="banner"
        className="pointer-events-auto relative z-50 flex flex-row-reverse items-center justify-between border-b border-base-300 bg-base-100 px-1.5 py-1 text-base-content"
        data-tutorial="header"
      >
        <Tooltip content="Add Component" placement="bottom" arrow={false}>
          <Item
            ariaLabel="Add Component"
            onMouseDown={e => e.stopPropagation()}
            onClick={e => {
              toggle("components");
              e.stopPropagation();
            }}
          >
            <TbPlus />
          </Item>
        </Tooltip>

        <Tooltip content="Redo" placement="bottom" arrow={false}>
          <Item
            ariaLabel="Redo"
            disabled={!canRedo}
            onClick={() => {
              actions.history.redo();

              const active = query.getEvent("selected");
              if (!active) actions.selectNode(ROOT_NODE);
            }}
          >
            <TbArrowForwardUp />
          </Item>
        </Tooltip>

        <Tooltip content="Undo" placement="bottom" arrow={false}>
          <Item
            ariaLabel="Undo"
            disabled={!canUndo}
            onClick={() => {
              actions.history.undo();

              const active = query.getEvent("selected");
              if (!active) actions.selectNode(ROOT_NODE);
            }}
          >
            <TbArrowBackUp />
          </Item>
        </Tooltip>

        {animate && (
          <Tooltip content="Play Animations" placement="bottom" arrow={false}>
            <Item ariaLabel="Play Animations" onClick={() => { }}>
              <TbPlayerPlay />
            </Item>
          </Tooltip>
        )}

        <ToolbarPortalDropdown
          openOn="hover"
          align="center"
          className="min-w-[12rem] rounded-lg border border-base-300 bg-base-100 p-1 py-1.5 shadow-xl"
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
                <span className="font-mono text-xs font-bold leading-none tracking-tight">
                  {view === "2xl" ? "2XL" : view.toUpperCase()}
                </span>
              )}
              <TbChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
            </button>
          }
        >
          <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-content">
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
                setView(row.id);
                scrollSelectedNodeIntoView();
              }}
              className="ph-select-item items-start gap-2 text-xs"
            >
              <span className="flex size-4 shrink-0 items-center justify-center text-primary">
                {view === row.id ? <TbCheck className="size-3.5" /> : null}
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="font-medium">{row.label}</span>
                <span className="text-[10px] text-neutral-content">{row.sub}</span>
              </span>
            </button>
          ))}
          </div>
        </ToolbarPortalDropdown>

        <Tooltip content="Preview" placement="bottom" arrow={false}>
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
          >
            {enabled ? <TbEye /> : <TbCode />}
          </Item>
        </Tooltip>

        <Tooltip
          content={`Switch to ${viewMode === "page" ? "Component" : "Page"} Editor`}
          placement="bottom"
          arrow={false}
        >
          <Item
            ariaLabel={`Switch to ${viewMode === "page" ? "Component" : "Page"} Editor`}
            onClick={() => {
              const newMode = viewMode === "page" ? "component" : "page";
              setViewMode(newMode);
              actions.selectNode(null);
              const rootNode = query.node(ROOT_NODE).get();

              if (newMode === "page") {
                // Switching to page view - restore normal state
                // Deselect any active node

                // Un-isolate to show all pages
                import("utils/lib").then(({ isolatePageAlt }) => {
                  isolatePageAlt(true, query, null, actions, () => { }, false);
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
        </Tooltip>

        <Tooltip content="Publish" placement="bottom" arrow={false}>
          <Item
            ariaLabel="Publish"
            onClick={() => open("publish")}
          >
            <SaveIndicator />
          </Item>
        </Tooltip>

        <Tooltip content="More Options" placement="bottom" arrow={false}>
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
          >
            {isOpen ? <TbX /> : <TbMenu2 />}
          </Item>
        </Tooltip>
      </header>

      {/* Page/Component Selector Bar - Below Header */}
      <div className="pointer-events-auto border-b border-base-300 bg-base-100 px-3 py-2">
        {viewMode === "page" ? (
          <PageSelector className="w-full" />
        ) : (
          <ComponentSelector className="w-full" />
        )}
      </div>

      {/* Node Breadcrumb - Below Page/Component Selector */}
      <div className="pointer-events-auto bg-base-100">
        <NodeBreadcrumb />
      </div>

      <EditorNavigation
        settings={settings}
        isTenant={isTenant}
        sideBarLeft={sideBarLeft}
        setSideBarLeft={setSideBarLeft}
        setIsLayersDialogOpen={setIsLayersDialogOpen}
        setIsMediaManagerModalOpen={setIsMediaManagerModalOpen}
        isDesignSystemSidebarOpen={isDesignSystemSidebarOpen}
        setIsDesignSystemSidebarOpen={setIsDesignSystemSidebarOpen}
        setIsSiteSettingsModalOpen={setIsSiteSettingsModalOpen}
        setIsModifiersModalOpen={setIsModifiersModalOpen}
        setIsImportExportDialogOpen={setIsImportExportDialogOpen}
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
      />

      <ModifiersModal
        isOpen={isModifiersModalOpen}
        onClose={() => setIsModifiersModalOpen(false)}
      />

      <ImportExportDialog
        isOpen={isImportExportDialogOpen}
        onClose={() => setIsImportExportDialogOpen(false)}
      />

      {/* Design System Modal */}
      {enabled && isDesignSystemSidebarOpen && (
        <DesignSystemSidebar
          isOpen={isDesignSystemSidebarOpen}
          onClose={() => setIsDesignSystemSidebarOpen(false)}
        />
      )}
    </>
  );
};
