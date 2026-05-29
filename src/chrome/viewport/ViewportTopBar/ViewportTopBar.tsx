/**
 * Editor top bar — Phase 2 C2a (command-registry migration).
 *
 * Thin renderer: every button comes from `useMenuItems("topbar")`. Click
 * dispatches via `sdk.commands.execute(id, args, { trigger: "menu" })`. The
 * keybinding dispatcher owns chord handling — there is no longer a
 * `useHeaderShortcuts` hook.
 *
 * Special-cases kept inline:
 *  - <BreakpointSwitcher /> — its dropdown is a custom popover (mode grid +
 *    breakpoint chips + zoom slider), not a single button. Mounted in the
 *    "view" group slot.
 *  - The breadcrumb / page selector row below the header.
 *  - Lazy modal mounts (Layers, Modifiers, MediaManager) — driven by atoms,
 *    no longer prop-drilled.
 *  - --editor-nav-height ResizeObserver.
 *  - <CommandPaletteRoot /> singleton.
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import React, { lazy, Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
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
import { useMenuItems } from "../../../registry/hooks";
import { MediaManagerModal } from "../../toolbar/inputs/media/MediaManagerModal";
import { ChipPopover } from "../../toolbar/breakpoint-chip/ChipPopover";
import { PreviewAtom } from "../state/atoms";
import { ComponentSelector } from "../pickers/ComponentSelector";
import { EditorNavigation } from "../nav/EditorNavigation";
import { NodeBreadcrumb } from "../nav/NodeBreadcrumb";
import { BreakpointSwitcher } from "./BreakpointSwitcher";
import { HeaderItem as Item } from "./HeaderItem";
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

  const { features, commands } = useSDK();
  const { context: commandContext } = useRegistries();
  const isTenant = features.directSave;

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

  const topbarItems = useMenuItems("topbar");

  if (!enabled) return null;

  return (
    <>
      <header
        ref={editorChromeNavRef}
        role="banner"
        className="border-base-300 bg-base-100 text-base-content pointer-events-auto relative z-50 flex flex-row-reverse items-center justify-between border-b px-1 py-1"
        data-tutorial="header"
      >
        {topbarItems.map((item, idx) => {
          const node = (
            <Item
              key={item.command + JSON.stringify(item.args ?? null)}
              ariaLabel={item.title}
              disabled={!item.enabled}
              onClick={e => {
                e.stopPropagation();
                void commands.execute(item.command, item.args, { trigger: "menu" });
              }}
              onMouseDown={
                item.command === "ph.editor.insert" || item.command === "ph.editor.openMore"
                  ? e => e.stopPropagation()
                  : undefined
              }
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content={item.title}
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
            >
              {item.icon}
            </Item>
          );
          // BreakpointSwitcher is a custom popover surface (mode toggle +
          // breakpoint chip grid + zoom slider) — not a single button, so
          // it can't be a registered menu item. Inject it at the natural
          // visual slot between `history` and `view` groups (i.e. after
          // ph.editor.undo and before ph.editor.togglePreview in array order;
          // under flex-row-reverse that places it left of undo).
          if (item.command === "ph.editor.undo") {
            return (
              <React.Fragment key={`__frag_${idx}`}>
                {node}
                <BreakpointSwitcher />
              </React.Fragment>
            );
          }
          return node;
        })}
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

      {/* Singleton command palette (⌘K) — listens for the chord on its own. */}
      <Suspense fallback={null}>
        <CommandPaletteRoot />
      </Suspense>
    </>
  );
};
