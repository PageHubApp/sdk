/**
 * `ph.editor.*` commands — top-level editor surface (insert / undo / redo /
 * save / preview / panels).
 */
import React from "react";
import { ROOT_NODE } from "@craftjs/utils";
import {
  TbArrowBackUp,
  TbArrowForwardUp,
  TbBoxModel2,
  TbCode,
  TbEye,
  TbMenu2,
  TbPlus,
  TbX,
} from "react-icons/tb";
import type { CommandDef } from "../../types";
import {
  panelOpen,
  panelClose,
  panelToggleToolboxInsert,
  getPanelState,
  markToolboxHistorySelectionSync,
  finalizeToolboxHistorySelectionSync,
} from "../../../utils/usePanelUrl";
import { setAtomExternal, getAtomExternal } from "../../../utils/atoms/external";
import {
  EnabledAtom,
  PreviewAtom,
} from "../../../chrome/viewport/state/atoms";
import {
  LastActiveAtom,
  SideBarOpen,
} from "../../../utils/atoms";
import { CommandPaletteAtom } from "../../../chrome/toolbar/dialogs/dialogAtoms";
import { getEditorActions, getEditorQuery } from "../../editorBackref";
import { markManualSidebarClose } from "../../../chrome/hooks/useAutoOpenSidebar";
import { SaveIndicator } from "../../../chrome/viewport/ViewportTopBar/SaveIndicator";
import { isInsideTextEditingSurfaceCtx, openComponentsTabRun } from "./helpers";

/**
 * Wrap a history mutation with the toolbox-history sync flags so the
 * Components/Blocks panel doesn't slam shut when undo/redo changes the
 * Craft selection. Mirrors the inline pattern that used to live in
 * `ViewportTopBar.tsx`.
 */
function runHistoryWithToolboxSync(
  query: any,
  actions: any,
  fn: () => void
): void {
  if (!actions || !query) return;
  markToolboxHistorySelectionSync();
  fn();
  const active = query.getEvent?.("selected")?.first?.();
  if (!active) actions.selectNode?.(ROOT_NODE);
  finalizeToolboxHistorySelectionSync();
}

/**
 * Toggle preview mode (eyeball icon). Heavy DOM cleanup lives here so it
 * fires the same way from chord / palette / topbar button.
 */
function togglePreviewRun(query: any, actions: any): void {
  if (!actions || !query) return;
  const viewport = typeof document !== "undefined" ? document.getElementById("viewport") : null;
  const scrollTop = viewport?.scrollTop ?? 0;
  const scrollLeft = viewport?.scrollLeft ?? 0;

  let nextEnabled = true;
  actions.setOptions((options: any) => {
    options.enabled = !options.enabled;
    nextEnabled = options.enabled;
    if (!options.enabled && viewport) {
      const arr = viewport.getElementsByTagName("*") || [];
      const elmsLen = arr.length;
      for (let i = 0; i < elmsLen; i++) {
        for (const attr of [
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
          "main-node",
          "node-id",
        ]) {
          arr[i].removeAttribute(attr);
        }
      }
    }
    const active = query.getEvent("selected").first();
    setAtomExternal(LastActiveAtom, active);
    setAtomExternal(EnabledAtom, options.enabled);
  });

  // Flip preview atom (true = previewing, false = editing).
  setAtomExternal(PreviewAtom, (prev: boolean) => !prev);
  // When leaving edit mode, drop the selection so chrome detaches.
  if (!nextEnabled) actions.selectNode?.(null);
  viewport?.focus({ preventScroll: true });
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => {
      if (viewport) {
        viewport.scrollTop = scrollTop;
        viewport.scrollLeft = scrollLeft;
      }
    });
  }
}

/** Escape — clear selection (the canvas-chord variant). */
function clearSelectionRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  try {
    const active = query?.getEvent("selected").first();
    if (active) actions.selectNode(null);
  } catch (e) {
    console.error("[ph.editor.clearSelection] failed:", e);
  }
}

/** Escape — exit preview (mirrors the body of useViewportKeyboard.handleBodyKeyDown). */
function exitPreviewRun(): void {
  const query = getEditorQuery();
  const actions = getEditorActions();
  if (!query || !actions) return;
  if (typeof document === "undefined") return;
  const viewport = document.getElementById("viewport");
  const scrollTop = viewport?.scrollTop ?? 0;
  const scrollLeft = viewport?.scrollLeft ?? 0;
  const lastActive = getAtomExternal<string | null>(LastActiveAtom);

  actions.setOptions((options: any) => {
    options.enabled = true;
    setAtomExternal(PreviewAtom, false);
    setAtomExternal(EnabledAtom, true);
    setTimeout(() => {
      if (!lastActive) return;
      try {
        const node = query.node(lastActive).get();
        if (node) actions.selectNode(lastActive);
      } catch {}
    }, 100);
  });

  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => {
      if (viewport) {
        viewport.scrollTop = scrollTop;
        viewport.scrollLeft = scrollLeft;
      }
    });
  }
}

export const EDITOR_COMMANDS: CommandDef[] = [
  {
    id: "ph.editor.insert",
    title: "Insert blocks & components",
    category: "Edit",
    icon: <TbPlus />,
    run: () => {
      panelToggleToolboxInsert();
    },
  },
  {
    id: "ph.editor.undo",
    title: "Undo",
    category: "Edit",
    icon: <TbArrowBackUp />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    enablement: ctx => Boolean(ctx.canUndo),
    run: ctx => {
      const { query, actions } = ctx as { query: any; actions: any };
      runHistoryWithToolboxSync(query, actions, () => actions.history.undo());
    },
  },
  {
    id: "ph.editor.redo",
    title: "Redo",
    category: "Edit",
    icon: <TbArrowForwardUp />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    enablement: ctx => Boolean(ctx.canRedo),
    run: ctx => {
      const { query, actions } = ctx as { query: any; actions: any };
      runHistoryWithToolboxSync(query, actions, () => actions.history.redo());
    },
  },
  {
    id: "ph.editor.save",
    title: "Publish",
    category: "File",
    icon: () => <SaveIndicator />,
    when: ctx => {
      const features = (ctx.features ?? {}) as { saveButton?: boolean };
      return features.saveButton !== false && !isInsideTextEditingSurfaceCtx(ctx);
    },
    run: () => {
      panelOpen("publish");
    },
  },
  {
    id: "ph.editor.togglePreview",
    title: ctx => (ctx.mode === "preview" ? "Exit preview" : "Toggle preview"),
    category: "View",
    icon: ctx => (ctx.mode === "preview" ? <TbCode /> : <TbEye />),
    run: ctx => {
      const { query, actions } = ctx as { query: any; actions: any };
      togglePreviewRun(query, actions);
    },
  },
  {
    id: "ph.editor.exitPreview",
    title: "Exit preview",
    category: "View",
    when: ctx => ctx.mode === "preview",
    run: () => exitPreviewRun(),
    paletteHide: true,
  },
  {
    id: "ph.editor.clearSelection",
    title: "Clear selection",
    category: "Edit",
    when: ctx =>
      ctx.selection.id != null &&
      !isInsideTextEditingSurfaceCtx(ctx) &&
      ctx.mode !== "preview",
    run: ctx => clearSelectionRun(ctx),
    paletteHide: true,
  },
  {
    id: "ph.editor.openMore",
    title: "More options",
    category: "View",
    icon: <TbMenu2 />,
    run: () => {
      const state = getPanelState();
      if (state.panel !== null) {
        panelClose();
      } else {
        panelOpen("menu");
      }
    },
    paletteHide: true,
  },
  {
    id: "ph.editor.openCommandPalette",
    title: "Command palette",
    category: "View",
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    // Don't list the palette inside itself.
    paletteHide: true,
    run: () => {
      // Toggle: if already open, close (matches macOS Spotlight behavior).
      setAtomExternal(CommandPaletteAtom, prev => ({
        open: !(prev as { open?: boolean })?.open,
      }));
    },
  },
  {
    id: "ph.editor.openBlocksPanel",
    title: "Browse blocks",
    category: "Insert",
    icon: <TbPlus />,
    when: ctx => {
      const features = (ctx.features ?? {}) as { blocksPanel?: { enabled?: boolean } };
      return features.blocksPanel?.enabled !== false;
    },
    run: () => {
      panelOpen("blocks");
    },
  },
  {
    id: "ph.editor.openComponentsPanel",
    title: "Browse components",
    category: "Insert",
    icon: <TbBoxModel2 />,
    // Surface decides visibility: sidebar/tabs always shows this pill;
    // EditorEmptyState's "Add Components" row uses JSX-side conditional
    // (viewMode !== "canvas"). No command-level `when` so the pill stays
    // visible in canvas mode too — empty-state still gates its own JSX.
    run: () => {
      panelOpen("components");
    },
  },
  {
    id: "ph.editor.openComponentsTab",
    title: "Components tab",
    category: "Insert",
    icon: <TbBoxModel2 />,
    run: () => openComponentsTabRun(),
  },
  {
    id: "ph.editor.closeSidebar",
    title: "Close sidebar",
    category: "View",
    icon: <TbX />,
    run: ctx => {
      const { actions } = ctx as { actions: any };
      // Match the legacy EditorEmptyState "close sidebar" body verbatim:
      // mark the close as manual (so useAutoOpenSidebar doesn't re-open on
      // the same tick) → clear Craft selection → flip the open atom.
      markManualSidebarClose();
      try {
        actions?.clearEvents?.();
      } catch (e) {
        console.error("[ph.editor.closeSidebar] clearEvents failed:", e);
      }
      setAtomExternal(SideBarOpen, false);
    },
  },
];
