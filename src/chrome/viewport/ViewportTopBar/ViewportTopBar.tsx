/**
 * Editor top bar — Phase 2 C2a (command-registry migration).
 *
 * The header row is `<EditorTopBarActions />` (every `useMenuItems("topbar")`
 * button plus the BreakpointSwitcher). `features.topBar: false` drops the
 * header and the breadcrumb's page selector so a host can render those
 * controls in its own chrome; everything below still mounts. The keybinding
 * dispatcher owns chord handling.
 *
 * Also mounted here:
 *  - The breadcrumb / page selector row below the header.
 *  - Lazy modal mounts (Layers, Modifiers, MediaManager) — driven by atoms,
 *    no longer prop-drilled.
 *  - --editor-nav-height ResizeObserver (0px without a header).
 *  - <CommandPaletteRoot /> singleton.
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { lazy, Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import {
  LayersDialogOpenAtom,
  MediaManagerModalAtom,
  ModifiersModalAtom,
  SessionTokenAtom,
  SettingsAtom,
  ViewModeAtom,
} from "../../../utils/atoms";
import { useSDK } from "../../../core/context";
import { useRegistries } from "../../../registry/provider";
import { MediaManagerModal } from "../../toolbar/inputs/media/MediaManagerModal";
import { ChipPopover } from "../../toolbar/breakpoint-chip/ChipPopover";
import { PreviewAtom } from "../state/atoms";
import { ComponentSelector } from "../pickers/ComponentSelector";
import { EditorNavigation } from "../nav/EditorNavigation";
import { NodeBreadcrumb } from "../nav/NodeBreadcrumb";
import { EditorTopBarActions } from "./EditorTopBarActions";
import { useDarkMode } from "./useDarkMode";
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
const CommandPaletteRoot = lazy(() =>
  import("../../palette").then(m => ({ default: m.CommandPaletteRoot }))
);

export const ViewportTopBar = () => {
  const { enabled, canUndo, canRedo, query, componentFingerprint } = useEditor(
    (state, q) => {
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
        canUndo: q.history.canUndo(),
        canRedo: q.history.canRedo(),
        componentFingerprint: fp,
      };
    }
  );

  useTopBarComponents({ query, enabled, componentFingerprint });

  const { features } = useSDK();
  const { context: commandContext } = useRegistries();
  const isTenant = features.directSave;
  const showTopBar = features.topBar !== false;

  // Atom-backed modal state — lifted in Phase 1 Wave A, consumed here in C2a.
  const [isMediaManagerModalOpen, setIsMediaManagerModalOpen] = useAtomState(
    MediaManagerModalAtom
  );
  const [isLayersDialogOpen, setIsLayersDialogOpen] = useAtomState(LayersDialogOpenAtom);
  const [isModifiersModalOpen, setIsModifiersModalOpen] = useAtomState(ModifiersModalAtom);

  const [preview] = useAtomState(PreviewAtom);
  const [settings] = useAtomState(SettingsAtom);
  useAtomValue(SessionTokenAtom);
  const [viewMode] = useAtomState(ViewModeAtom);
  // C2b lifted dark-mode into an atom; hook still mounts to hydrate from
  // phStorage / matchMedia on first render and to mirror atom -> DOM.
  useDarkMode();

  // Feed live history / mode / viewMode into the command context so registry
  // `when` / `enablement` predicates evaluate correctly (e.g. undo enables
  // only when `canUndo`, save chord respects features.saveButton, etc.).
  useEffect(() => {
    commandContext.setCommandContext({
      canUndo,
      canRedo,
      mode: preview ? "preview" : "editor",
      viewMode: viewMode === "canvas" ? "canvas" : "page",
    });
  }, [commandContext, canUndo, canRedo, preview, viewMode]);

  /** Single source for overlay / flyout `top` under the icon toolbar (not page selector). */
  const editorChromeNavRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!enabled) return;
    const toolbar = document.getElementById("toolbar");
    if (!toolbar) return;
    if (!showTopBar) {
      toolbar.style.setProperty("--editor-nav-height", "0px");
      return () => toolbar.style.removeProperty("--editor-nav-height");
    }
    const el = editorChromeNavRef.current;
    if (!el) return;
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
  }, [enabled, showTopBar]);

  if (!enabled) return null;

  return (
    <>
      {showTopBar && (
        <header
          ref={editorChromeNavRef}
          role="banner"
          className="border-base-300 bg-base-100 text-base-content pointer-events-auto relative z-50 flex items-center border-b px-1 py-1"
          data-tutorial="header"
        >
          <EditorTopBarActions className="w-full justify-between gap-0" showPageSelector={false} />
        </header>
      )}

      {/* Combined breadcrumb / page selector row - Below Header */}
      <div className="bg-base-100 pointer-events-auto">
        {viewMode === "canvas" ? (
          <div className="border-base-300 flex h-10 min-h-10 shrink-0 items-center border-b px-3 py-0">
            <ComponentSelector className="w-full" />
          </div>
        ) : (
          <NodeBreadcrumb showPageSelector={showTopBar} />
        )}
      </div>

      <EditorNavigation settings={settings} isTenant={isTenant} />

      <MediaManagerModal
        isOpen={isMediaManagerModalOpen && features.mediaManager !== false}
        onClose={() => setIsMediaManagerModalOpen(false)}
      />

      {isLayersDialogOpen && (
        <Suspense fallback={null}>
          <LayersDialog isOpen onClose={() => setIsLayersDialogOpen(false)} />
        </Suspense>
      )}

      {isModifiersModalOpen && features.modifiers !== false && (
        <Suspense fallback={null}>
          <ModifiersModal isOpen onClose={() => setIsModifiersModalOpen(false)} />
        </Suspense>
      )}

      {/* Singleton breakpoint-chip popover — anchored to whichever chip is open. */}
      <ChipPopover />

      {/* Singleton command palette (⌘K). Off when the host owns ⌘K. */}
      {features.commandPalette !== false && (
        <Suspense fallback={null}>
          <CommandPaletteRoot />
        </Suspense>
      )}
    </>
  );
};
