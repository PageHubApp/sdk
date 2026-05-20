import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import {
  TbArrowBackUp,
  TbArrowForwardUp,
  TbBoxModel2,
  TbCode,
  TbEye,
  TbFileText,
  TbMenu2,
  TbPlayerPlay,
  TbPlus,
  TbX,
} from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import {
  LastActiveAtom,
  LayersDialogOpenAtom,
  SessionTokenAtom,
  SettingsAtom,
  ShowGridLinesAtom,
  SideBarAtom,
  ViewModeAtom,
  useSetAtomState,
} from "../../../utils/atoms";
import { applyCanvasVisibility } from "../../../utils/component/componentIsolation";
import {
  finalizeToolboxHistorySelectionSync,
  markToolboxHistorySelectionSync,
  usePanelUrl,
} from "../../../utils/usePanelUrl";
import { useSDK } from "../../../core/context";
import { SaveIndicator } from "./SaveIndicator";
import { MediaManagerModal } from "../../toolbar/inputs/media/MediaManagerModal";
import { ChipPopover } from "../../toolbar/breakpoint-chip/ChipPopover";
import { EnabledAtom, PreviewAtom } from "../state/atoms";
import { ComponentSelector } from "../pickers/ComponentSelector";
import { EditorNavigation } from "../nav/EditorNavigation";
import { NodeBreadcrumb } from "../nav/NodeBreadcrumb";
import { BreakpointSwitcher } from "./BreakpointSwitcher";
import { HeaderItem as Item } from "./HeaderItem";
import { useDarkMode } from "./useDarkMode";
import { useHeaderShortcuts } from "./useHeaderShortcuts";
import { useTopBarComponents } from "./useTopBarComponents";

// Lazy: rarely-open modals — fetch on first open so HMR edits to them
// (and to FloatingPanel/PropertyRenderer chains they import) don't ripple
// through the always-mounted Header tree.
const LayersDialog = lazy(() =>
  import("../../toolbar/dialogs/LayersDialog").then(m => ({ default: m.LayersDialog }))
);
const ModifiersModal = lazy(() =>
  import("../modals/ModifiersModal").then(m => ({ default: m.ModifiersModal }))
);
const SiteSettingsModal = lazy(() =>
  import("../modals/SiteSettingsModal").then(m => ({ default: m.SiteSettingsModal }))
);

export const ViewportTopBar = () => {
  const { enabled, canUndo, canRedo, actions, query, componentFingerprint } = useEditor(
    (state, query) => {
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
      };
    }
  );

  useTopBarComponents({ query, enabled, componentFingerprint });

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

  const { isDarkMode, toggleTheme } = useDarkMode();

  const animate = false;

  const [settings] = useAtomState(SettingsAtom);
  useAtomValue(SessionTokenAtom);

  const [sideBarLeft, setSideBarLeft] = useAtomState(SideBarAtom);
  const [viewMode, setViewMode] = useAtomState(ViewModeAtom);
  const [, setShowGridLines] = useAtomState(ShowGridLinesAtom);
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
          ariaLabel={
            features?.blocksPanel?.enabled !== false
              ? "Insert blocks and components"
              : "Insert components"
          }
          onMouseDown={e => e.stopPropagation()}
          onClick={e => {
            toggleToolboxInsert();
            e.stopPropagation();
          }}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content={
            features?.blocksPanel?.enabled !== false
              ? "Insert blocks & components"
              : "Insert components"
          }
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

        <BreakpointSwitcher />

        <Item
          ariaLabel="Preview"
          onClick={() => {
            const viewport = document.getElementById("viewport");
            const scrollTop = viewport?.scrollTop ?? 0;
            const scrollLeft = viewport?.scrollLeft ?? 0;

            toggleEditorEnabled();
            setPreview(!preview);
            if (enabled) actions.selectNode(null);
            viewport?.focus({ preventScroll: true });

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
              import("@/utils/page/pageManagement").then(({ isolatePageInTree }) => {
                isolatePageInTree(query, actions, null, () => {});
              });
            }
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
            if (isOpen) close();
            else open("menu");
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

      {isSiteSettingsModalOpen && (
        <Suspense fallback={null}>
          <SiteSettingsModal
            isOpen
            onClose={() => setIsSiteSettingsModalOpen(false)}
            extraTabs={siteSettingsExtraTabs}
          />
        </Suspense>
      )}

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