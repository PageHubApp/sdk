/**
 * Builtin command catalog.
 *
 * Phase 1 Wave A landed every command as a stub. Phase 2 fills the real
 * `run` bodies surface by surface; commands still marked `stub: true` here
 * have NOT yet been migrated (their old surface handler still owns the
 * chord). When a surface migrates, the command's `stub: true` flag is
 * removed so the dispatcher `preventDefault`s the chord and the legacy
 * inline handler can be deleted.
 *
 * Phase 2 C2a — topbar surface — owns:
 *   ph.editor.{insert,undo,redo,save,togglePreview,openMore}
 *   ph.canvas.{toggleViewMode,setView,toggleDevice,toggleResponsive,
 *               toggleGridLines,toggleHidden,zoomIn,zoomOut,zoomReset}
 *   ph.media.open · ph.theme.open · ph.layers.popOut
 *   ph.modifiers.open · ph.importExport.open
 */
import React from "react";
import { ROOT_NODE } from "@craftjs/utils";
import {
  TbArrowBackUp,
  TbArrowForwardUp,
  TbBoxModel2,
  TbCode,
  TbCopy,
  TbDeviceFloppy,
  TbDeviceMobile,
  TbDownload,
  TbEye,
  TbEyeOff,
  TbFileText,
  TbFocus2,
  TbLayoutGrid,
  TbLayoutSidebar,
  TbMenu2,
  TbMoon,
  TbPalette,
  TbPhoto,
  TbPlus,
  TbSettings,
  TbStack2,
  TbTrash,
  TbWand,
  TbX,
} from "react-icons/tb";
import type { CommandDef } from "../types";
import {
  panelOpen,
  panelClose,
  panelToggle,
  panelToggleToolboxInsert,
  getPanelState,
  markToolboxHistorySelectionSync,
  finalizeToolboxHistorySelectionSync,
} from "../../utils/usePanelUrl";
import { setAtomExternal, getAtomExternal } from "../../utils/atoms/external";
import {
  EnabledAtom,
  PreviewAtom,
  ViewAtom,
  DeviceAtom,
  ResponsiveAtom,
  ShowBreakpointMarkersAtom,
  ShowDeviceGuidesAtom,
  BreakpointZoomAtom,
  DeviceZoomAtom,
} from "../../chrome/viewport/state/atoms";
import {
  LastActiveAtom,
  LayersDialogOpenAtom,
  MediaManagerModalAtom,
  ModifiersModalAtom,
  ShowGridLinesAtom,
  ShowHiddenAtom,
  SideBarAtom,
  SidebarLayersPanelAtom,
  ViewModeAtom,
} from "../../utils/atoms";
import { applyCanvasVisibility } from "../../utils/component/componentIsolation";
import { phStorage } from "../../utils/phStorage";
import { SaveIndicator } from "../../chrome/viewport/ViewportTopBar/SaveIndicator";

/**
 * Wave A stub — log so missing wiring is loud but the editor keeps working.
 */
function stub(id: string) {
  return () => {
    console.warn(`[ph] command stub: ${id} (Wave A — runtime wiring lands in Phase 2)`);
  };
}

// `selection.id` truthy AND not ROOT.
function hasNonRootSelection(ctx: { selection: { id: string | null } }) {
  return Boolean(ctx.selection.id) && ctx.selection.id !== "ROOT";
}

function isPageOrBackground(type: string | null): boolean {
  return type === "page" || type === "background";
}

// Composite predicate used by copy / duplicate / move / paste.
function canCopySelection(ctx: { selection: { id: string | null; type: string | null; isDeletable: boolean; isLinked: boolean } }) {
  if (!hasNonRootSelection(ctx)) return false;
  if (isPageOrBackground(ctx.selection.type)) return false;
  if (!ctx.selection.isDeletable) return false;
  if (ctx.selection.isLinked) return false;
  return true;
}

function isInsideTextEditingSurfaceCtx(ctx: { tiptap: { active: boolean } }): boolean {
  // In wave A we don't have DOM target; use tiptap.active as the proxy.
  return Boolean(ctx.tiptap?.active);
}

// ─── Real-run helpers (Phase 2 C2a topbar surface) ───────────────────────────

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

/** Flip canvas page<->component view mode and refresh visibility. */
function toggleViewModeRun(query: any, actions: any): void {
  if (!actions || !query) return;
  const current = getAtomExternal(ViewModeAtom) ?? "page";
  const next = current === "page" ? "canvas" : "page";
  setAtomExternal(ViewModeAtom, next);
  actions.selectNode?.(null);
  if (next === "page") {
    import("../../utils/page/pageManagement")
      .then(({ isolatePageInTree }) => {
        try {
          isolatePageInTree(query, actions, null, () => {});
        } catch (err) {
          console.error("[ph.commands] isolatePageInTree failed:", err);
        }
      })
      .catch(err => {
        console.error("[ph.commands] page/pageManagement import failed:", err);
      });
  }
  applyCanvasVisibility(query, actions, { mode: next });
}

/**
 * Active zoom atom is whichever CanvasZoom mount has `data-canvas-zoom-*=true`.
 * Mirrors the inline window-level listener in CanvasZoom.tsx so chord / palette
 * dispatch goes through the same path.
 */
function zoomStep(direction: 1 | -1 | 0): void {
  if (typeof document === "undefined") return;
  // Determine which CanvasZoom mount is live.
  const deviceLive = document.querySelector(`[data-canvas-zoom-device-menu="true"]`);
  const atomKey: "device" | "breakpoint" = deviceLive ? "device" : "breakpoint";
  const atomTpl = atomKey === "device" ? DeviceZoomAtom : BreakpointZoomAtom;
  const current = getAtomExternal<number>(atomTpl) ?? 1;
  let next: number;
  if (direction === 0) {
    next = 1;
  } else {
    // Inlined nextZoomPreset to avoid a cross-import; both paths share semantics.
    const presets = [
      0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2, 3, 5, 7.5, 10,
    ];
    const idx = presets.findIndex(v => v >= current);
    const ni =
      direction === 1
        ? Math.min(idx + 1, presets.length - 1)
        : Math.max(idx - 1, 0);
    next = presets[ni];
  }
  setAtomExternal(atomTpl, next);
  try {
    const storageKey =
      atomKey === "device" ? "editor-device-zoom" : "editor-breakpoint-zoom";
    phStorage.set(storageKey, String(next));
    phStorage.set(`${storageKey}-fit`, "false");
  } catch {}
}

/** Toggle `data-show-gridlines` on `#viewport` and persist the atom. */
function toggleGridLinesRun(): void {
  const next = !(getAtomExternal<boolean>(ShowGridLinesAtom) ?? false);
  setAtomExternal(ShowGridLinesAtom, next);
  if (typeof document !== "undefined") {
    document.getElementById("viewport")?.setAttribute("data-show-gridlines", String(next));
  }
}

/** Toggle `data-show-hidden` on `#viewport` and persist the atom. */
function toggleHiddenRun(): void {
  const next = !(getAtomExternal<boolean>(ShowHiddenAtom) ?? true);
  setAtomExternal(ShowHiddenAtom, next);
  if (typeof document !== "undefined") {
    document.getElementById("viewport")?.setAttribute("data-show-hidden", String(next));
  }
}

const _BUILTIN_COMMANDS_RAW: CommandDef[] = [
  // ─── Editor ──────────────────────────────────────────────────────────
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
    run: stub("ph.editor.exitPreview"),
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
    run: stub("ph.editor.clearSelection"),
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
    run: stub("ph.editor.openCommandPalette"),
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
    run: stub("ph.editor.openBlocksPanel"),
  },
  {
    id: "ph.editor.openComponentsPanel",
    title: "Browse components",
    category: "Insert",
    icon: <TbBoxModel2 />,
    when: ctx => ctx.viewMode !== "canvas",
    run: stub("ph.editor.openComponentsPanel"),
  },
  {
    id: "ph.editor.openComponentsTab",
    title: "Components tab",
    category: "Insert",
    icon: <TbBoxModel2 />,
    run: stub("ph.editor.openComponentsTab"),
  },
  {
    id: "ph.editor.closeSidebar",
    title: "Close sidebar",
    category: "View",
    icon: <TbX />,
    run: stub("ph.editor.closeSidebar"),
  },

  // ─── Canvas view ─────────────────────────────────────────────────────
  {
    id: "ph.canvas.setView",
    title: (_ctx, args) => {
      const view = (args as unknown as { view?: string } | undefined)?.view ?? "default";
      return `Set view: ${view}`;
    },
    category: "View",
    icon: <TbDeviceMobile />,
    run: (_ctx, args) => {
      const view = (args as unknown as { view?: string } | undefined)?.view;
      if (!view) return;
      setAtomExternal(ViewAtom, view as any);
    },
  },
  {
    id: "ph.canvas.toggleDevice",
    title: "Toggle device",
    category: "View",
    icon: <TbDeviceMobile />,
    run: () => {
      setAtomExternal(DeviceAtom, (prev: boolean) => !prev);
    },
  },
  {
    id: "ph.canvas.toggleResponsive",
    title: "Toggle responsive",
    category: "View",
    run: () => {
      setAtomExternal(ResponsiveAtom, (prev: boolean) => !prev);
    },
  },
  {
    id: "ph.canvas.toggleViewMode",
    title: ctx => (ctx.viewMode === "canvas" ? "Switch to page editor" : "Switch to components editor"),
    category: "View",
    icon: ctx => (ctx.viewMode === "canvas" ? <TbFileText /> : <TbBoxModel2 />),
    run: ctx => {
      const { query, actions } = ctx as { query: any; actions: any };
      toggleViewModeRun(query, actions);
    },
  },
  {
    id: "ph.canvas.toggleGridLines",
    title: "Toggle grid lines",
    category: "View",
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    run: () => {
      toggleGridLinesRun();
    },
  },
  {
    id: "ph.canvas.toggleBreakpointMarkers",
    title: "Toggle breakpoint lines",
    category: "View",
    run: () => {
      const next = !(getAtomExternal<boolean>(ShowBreakpointMarkersAtom) ?? false);
      setAtomExternal(ShowBreakpointMarkersAtom, next);
      try {
        phStorage.set("show-breakpoint-markers", String(next));
      } catch {}
    },
  },
  {
    id: "ph.canvas.toggleDeviceGuides",
    title: "Toggle device guides",
    category: "View",
    run: () => {
      const next = !(getAtomExternal<boolean>(ShowDeviceGuidesAtom) ?? false);
      setAtomExternal(ShowDeviceGuidesAtom, next);
      try {
        phStorage.set("show-device-guides", String(next));
      } catch {}
    },
  },
  {
    id: "ph.canvas.toggleHidden",
    title: "Toggle hidden components",
    category: "View",
    icon: <TbEyeOff />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    run: () => {
      toggleHiddenRun();
    },
  },
  {
    id: "ph.canvas.zoomIn",
    title: "Zoom in",
    category: "View",
    when: ctx => ctx.mouseOver !== "topbar" && ctx.mouseOver !== "sidebar",
    run: () => zoomStep(1),
    paletteHide: true,
  },
  {
    id: "ph.canvas.zoomOut",
    title: "Zoom out",
    category: "View",
    when: ctx => ctx.mouseOver !== "topbar" && ctx.mouseOver !== "sidebar",
    run: () => zoomStep(-1),
    paletteHide: true,
  },
  {
    id: "ph.canvas.zoomReset",
    title: "Reset zoom",
    category: "View",
    run: () => zoomStep(0),
    paletteHide: true,
  },

  // ─── Site / theme / media / tools ────────────────────────────────────
  {
    id: "ph.site.openSettings",
    title: "Site settings",
    category: "Tools",
    icon: <TbSettings />,
    run: stub("ph.site.openSettings"),
  },
  {
    id: "ph.site.selectBackground",
    title: "Select background",
    category: "Edit",
    icon: <TbBoxModel2 />,
    when: ctx => {
      const features = (ctx.features ?? {}) as { directSave?: boolean };
      return features.directSave === true;
    },
    run: stub("ph.site.selectBackground"),
  },
  {
    id: "ph.theme.open",
    title: "Theme settings",
    category: "Tools",
    icon: <TbPalette />,
    run: (_ctx, args) => {
      const a = (args as unknown as { cat?: string } | undefined) ?? {};
      panelToggle("theme", { cat: a.cat ?? "colors" });
    },
  },
  {
    id: "ph.media.open",
    title: "Media manager",
    category: "Tools",
    icon: <TbPhoto />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    run: () => {
      setAtomExternal(MediaManagerModalAtom, (prev: boolean) => !prev);
      panelClose();
    },
  },
  {
    id: "ph.media.selectAll",
    title: "Select all media",
    category: "Edit",
    when: ctx =>
      Boolean(
        (ctx as Record<string, unknown>)["media.modalOpen"] &&
          !(ctx as Record<string, unknown>)["media.selectionMode"]
      ),
    run: stub("ph.media.selectAll"),
    paletteHide: true,
  },
  {
    id: "ph.media.deleteSelected",
    title: "Delete selected media",
    category: "Edit",
    icon: <TbTrash />,
    when: ctx => {
      const rec = ctx as Record<string, unknown>;
      return Boolean(rec["media.modalOpen"]) && Number(rec["media.selectedCount"] ?? 0) > 0;
    },
    run: stub("ph.media.deleteSelected"),
    paletteHide: true,
  },
  {
    id: "ph.layers.popOut",
    title: "Pop out layers",
    category: "View",
    icon: <TbLayoutGrid />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    run: () => {
      setAtomExternal(LayersDialogOpenAtom, (prev: boolean) => !prev);
      panelClose();
    },
  },
  {
    id: "ph.layers.toggleDock",
    title: "Dock / hide layers panel",
    category: "View",
    icon: <TbLayoutGrid />,
    run: () => {
      const next = !(getAtomExternal<boolean>(SidebarLayersPanelAtom) ?? false);
      setAtomExternal(SidebarLayersPanelAtom, next);
      try {
        phStorage.set("sidebar-layers-panel", String(next));
      } catch {}
    },
  },
  {
    id: "ph.modifiers.open",
    title: "Modifiers",
    category: "Tools",
    icon: <TbStack2 />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    run: () => {
      setAtomExternal(ModifiersModalAtom, (prev: boolean) => !prev);
      panelClose();
    },
  },
  {
    id: "ph.importExport.open",
    title: "Import / export",
    category: "Tools",
    icon: <TbDownload />,
    when: ctx => {
      const features = (ctx.features ?? {}) as { importExport?: boolean };
      return features.importExport !== false && !isInsideTextEditingSurfaceCtx(ctx);
    },
    run: () => {
      panelToggle("import-export");
    },
  },
  {
    id: "ph.ui.toggleSidebarSide",
    title: "Move settings panel",
    category: "Preferences",
    icon: <TbLayoutSidebar />,
    when: ctx => {
      const features = (ctx.features ?? {}) as { settingsPanelSwitcher?: boolean };
      return features.settingsPanelSwitcher !== false;
    },
    run: () => {
      setAtomExternal(SideBarAtom, (prev: boolean) => !prev);
    },
  },
  {
    id: "ph.ui.toggleDarkMode",
    title: "Toggle dark mode",
    category: "Preferences",
    icon: <TbMoon />,
    when: ctx => {
      const features = (ctx.features ?? {}) as { darkModeSwitcher?: boolean };
      return features.darkModeSwitcher !== false;
    },
    run: stub("ph.ui.toggleDarkMode"),
  },
  {
    id: "ph.sidebar.search",
    title: "Search sidebar",
    category: "View",
    when: ctx =>
      ctx.mouseOver === "sidebar" || Boolean((ctx as Record<string, unknown>)["focusInSidebar"]),
    run: stub("ph.sidebar.search"),
    paletteHide: true,
  },

  // ─── AI ──────────────────────────────────────────────────────────────
  {
    id: "ph.ai.openAssistant",
    title: "AI assistant",
    category: "AI",
    icon: <TbWand />,
    when: ctx => Boolean(ctx.isAiEnabled),
    run: stub("ph.ai.openAssistant"),
  },
  {
    id: "ph.ai.includeTextInChat",
    title: "Include text in AI chat",
    category: "AI",
    icon: <TbWand />,
    when: ctx => Boolean(ctx.tiptap?.active && ctx.isAiEnabled),
    run: stub("ph.ai.includeTextInChat"),
  },
  {
    id: "ph.ai.includeNodeInChat",
    title: "Include node in AI chat",
    category: "AI",
    icon: <TbWand />,
    when: ctx => hasNonRootSelection(ctx) && Boolean(ctx.isAiEnabled),
    run: stub("ph.ai.includeNodeInChat"),
  },

  // ─── Layers (placeholder for canvas.* layer interactions) ────────────

  // ─── Node-scoped ─────────────────────────────────────────────────────
  {
    id: "ph.node.delete",
    title: "Delete",
    category: "Edit",
    icon: <TbTrash />,
    when: ctx =>
      hasNonRootSelection(ctx) &&
      ctx.selection.canDelete &&
      !isInsideTextEditingSurfaceCtx(ctx),
    run: stub("ph.node.delete"),
  },
  {
    id: "ph.node.duplicate",
    title: "Duplicate",
    category: "Edit",
    icon: <TbCopy />,
    when: ctx => canCopySelection(ctx),
    run: stub("ph.node.duplicate"),
  },
  {
    id: "ph.node.copy",
    title: "Copy",
    category: "Edit",
    icon: <TbCopy />,
    when: ctx => canCopySelection(ctx) && !isInsideTextEditingSurfaceCtx(ctx),
    run: stub("ph.node.copy"),
  },
  {
    id: "ph.node.paste",
    title: "Paste",
    category: "Edit",
    when: ctx =>
      canCopySelection(ctx) &&
      !isInsideTextEditingSurfaceCtx(ctx) &&
      (ctx.clipboard?.hasNode === true || typeof navigator !== "undefined"),
    run: stub("ph.node.paste"),
  },
  {
    id: "ph.node.copyClasses",
    title: "Copy classes",
    category: "Edit",
    when: ctx => canCopySelection(ctx),
    run: stub("ph.node.copyClasses"),
  },
  {
    id: "ph.node.pasteClasses",
    title: "Paste classes",
    category: "Edit",
    when: ctx =>
      Boolean(ctx.selection.id) &&
      !isPageOrBackground(ctx.selection.type) &&
      ctx.selection.isDeletable &&
      ctx.clipboard?.hasClasses === true,
    run: stub("ph.node.pasteClasses"),
  },
  {
    id: "ph.node.selectParent",
    title: "Select parent",
    category: "Edit",
    when: ctx =>
      Boolean(ctx.parent?.id) && ctx.parent?.displayName !== "Background",
    run: stub("ph.node.selectParent"),
  },
  {
    id: "ph.node.selectPage",
    title: "Select current page",
    category: "Edit",
    when: ctx => Boolean((ctx as Record<string, unknown>)["hasPageIsolation"]),
    run: stub("ph.node.selectPage"),
  },
  {
    id: "ph.node.selectAncestor",
    title: "Select ancestor",
    category: "Edit",
    when: ctx => Number((ctx as Record<string, unknown>)["breadcrumbLength"] ?? 0) > 1,
    run: stub("ph.node.selectAncestor"),
    paletteHide: true,
  },
  {
    id: "ph.node.deselect",
    title: "Deselect",
    category: "Edit",
    when: ctx =>
      Boolean(ctx.selection.id) && !isInsideTextEditingSurfaceCtx(ctx),
    run: stub("ph.node.deselect"),
  },
  {
    id: "ph.node.moveUp",
    title: "Move up",
    category: "Edit",
    when: ctx => canCopySelection(ctx) && Boolean(ctx.parent?.id),
    enablement: ctx => Boolean((ctx as Record<string, unknown>)["siblingMove.canMoveUp"]),
    run: stub("ph.node.moveUp"),
  },
  {
    id: "ph.node.moveDown",
    title: "Move down",
    category: "Edit",
    when: ctx => canCopySelection(ctx) && Boolean(ctx.parent?.id),
    enablement: ctx => Boolean((ctx as Record<string, unknown>)["siblingMove.canMoveDown"]),
    run: stub("ph.node.moveDown"),
  },
  {
    id: "ph.node.isolate",
    title: "Isolate component",
    category: "View",
    icon: <TbFocus2 />,
    when: ctx =>
      ctx.selection.type === "component" &&
      !((ctx as Record<string, unknown>)["disableIsolate"] === true),
    run: stub("ph.node.isolate"),
  },
  {
    id: "ph.node.renameDisplayName",
    title: "Rename",
    category: "Edit",
    when: ctx => Boolean(ctx.selection.id),
    run: stub("ph.node.renameDisplayName"),
  },
  {
    id: "ph.node.addBlockAbove",
    title: "Add block above",
    category: "Insert",
    when: ctx => {
      const features = (ctx.features ?? {}) as { blocksPanel?: { enabled?: boolean } };
      return (
        ctx.selection.type === "Section" && features.blocksPanel?.enabled !== false
      );
    },
    run: stub("ph.node.addBlockAbove"),
  },
  {
    id: "ph.node.addBlockBelow",
    title: "Add block below",
    category: "Insert",
    when: ctx => {
      const features = (ctx.features ?? {}) as { blocksPanel?: { enabled?: boolean } };
      return (
        ctx.selection.type === "Section" && features.blocksPanel?.enabled !== false
      );
    },
    run: stub("ph.node.addBlockBelow"),
  },
  {
    id: "ph.node.addEmptySection",
    title: "Add empty section",
    category: "Insert",
    when: ctx => ctx.selection.isCanvas && ctx.selection.type === "page",
    run: stub("ph.node.addEmptySection"),
  },
  {
    id: "ph.node.addContainer",
    title: "Add container",
    category: "Insert",
    when: ctx =>
      ctx.selection.isCanvas && !isPageOrBackground(ctx.selection.type),
    run: stub("ph.node.addContainer"),
  },
  {
    id: "ph.node.insertComponent",
    title: "Insert component",
    category: "Insert",
    when: ctx => {
      const t = ctx.selection.type;
      return t === "Section" || t === "Container" || t === "page";
    },
    run: stub("ph.node.insertComponent"),
  },
  {
    id: "ph.node.convertToComponent",
    title: "Convert to component",
    category: "Edit",
    when: ctx => canCopySelection(ctx),
    enablement: ctx =>
      Boolean((ctx as Record<string, unknown>)["canMakeSavedComponent"]),
    run: stub("ph.node.convertToComponent"),
  },
  {
    id: "ph.node.cycleNextSibling",
    title: "Cycle next sibling",
    category: "Edit",
    when: ctx =>
      Boolean(ctx.selection.id) && !isInsideTextEditingSurfaceCtx(ctx),
    run: stub("ph.node.cycleNextSibling"),
    paletteHide: true,
  },
  {
    id: "ph.node.cyclePrevSibling",
    title: "Cycle previous sibling",
    category: "Edit",
    when: ctx =>
      Boolean(ctx.selection.id) && !isInsideTextEditingSurfaceCtx(ctx),
    run: stub("ph.node.cyclePrevSibling"),
    paletteHide: true,
  },

  // ─── Rich text (palette-only, Tiptap owns the chords) ────────────────
  {
    id: "ph.text.bold",
    title: "Bold",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.bold"),
  },
  {
    id: "ph.text.italic",
    title: "Italic",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.italic"),
  },
  {
    id: "ph.text.underline",
    title: "Underline",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.underline"),
  },
  {
    id: "ph.text.toggleStrike",
    title: "Strikethrough",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.toggleStrike"),
  },
  {
    id: "ph.text.toggleSuperscript",
    title: "Superscript",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.toggleSuperscript"),
  },
  {
    id: "ph.text.toggleSubscript",
    title: "Subscript",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.toggleSubscript"),
  },
  {
    id: "ph.text.setBlockType",
    title: "Set block type",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: stub("ph.text.setBlockType"),
  },
  {
    id: "ph.text.setFontFamily",
    title: "Set font family",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.setFontFamily"),
  },
  {
    id: "ph.text.setFontSize",
    title: "Set font size",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.setFontSize"),
  },
  {
    id: "ph.text.applyTypographyPreset",
    title: "Apply typography preset",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) &&
      Number((ctx as Record<string, unknown>)["theme.typographyCount"] ?? 0) > 0,
    run: stub("ph.text.applyTypographyPreset"),
  },
  {
    id: "ph.text.setAlign",
    title: "Set text alignment",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: stub("ph.text.setAlign"),
  },
  {
    id: "ph.text.toggleBulletList",
    title: "Bullet list",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: stub("ph.text.toggleBulletList"),
  },
  {
    id: "ph.text.toggleOrderedList",
    title: "Ordered list",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: stub("ph.text.toggleOrderedList"),
  },
  {
    id: "ph.text.indentListItem",
    title: "Indent list item",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    enablement: ctx => Boolean((ctx as Record<string, unknown>)["tiptap.canSinkListItem"]),
    run: stub("ph.text.indentListItem"),
  },
  {
    id: "ph.text.outdentListItem",
    title: "Outdent list item",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    enablement: ctx => Boolean((ctx as Record<string, unknown>)["tiptap.canLiftListItem"]),
    run: stub("ph.text.outdentListItem"),
  },
  {
    id: "ph.text.openLinkPanel",
    title: "Open link panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: stub("ph.text.openLinkPanel"),
  },
  {
    id: "ph.text.setLink",
    title: "Set link",
    category: "Text",
    enablement: (_ctx, args) => {
      const href = (args as unknown as { href?: string } | undefined)?.href;
      return typeof href === "string" && href.length > 0;
    },
    run: stub("ph.text.setLink"),
  },
  {
    id: "ph.text.unsetLink",
    title: "Remove link",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.isActive("link")),
    run: stub("ph.text.unsetLink"),
  },
  {
    id: "ph.text.openFontPanel",
    title: "Open font panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.openFontPanel"),
  },
  {
    id: "ph.text.openTextColorPanel",
    title: "Open text color panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.openTextColorPanel"),
  },
  {
    id: "ph.text.openHighlightPanel",
    title: "Open highlight panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.openHighlightPanel"),
  },
  {
    id: "ph.text.openMorePanel",
    title: "Open more panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: stub("ph.text.openMorePanel"),
  },
  {
    id: "ph.text.setColor",
    title: "Set text color",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.setColor"),
  },
  {
    id: "ph.text.unsetColor",
    title: "Clear text color",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: stub("ph.text.unsetColor"),
  },
  {
    id: "ph.text.setHighlight",
    title: "Highlight",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: stub("ph.text.setHighlight"),
  },
  {
    id: "ph.text.unsetHighlight",
    title: "Clear highlight",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: stub("ph.text.unsetHighlight"),
  },
  {
    id: "ph.text.insertImage",
    title: "Insert image",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: stub("ph.text.insertImage"),
  },
  {
    id: "ph.text.insertHorizontalRule",
    title: "Insert horizontal rule",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: stub("ph.text.insertHorizontalRule"),
  },
  {
    id: "ph.text.clearFormatting",
    title: "Clear formatting",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: stub("ph.text.clearFormatting"),
  },
  {
    id: "ph.text.openVariablePicker",
    title: "Insert variable",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: stub("ph.text.openVariablePicker"),
  },
  {
    id: "ph.text.insertVariable",
    title: "Insert variable",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: stub("ph.text.insertVariable"),
  },
  {
    id: "ph.text.closeActivePanel",
    title: "Close text panel",
    category: "Text",
    when: ctx => ctx.tiptap?.activePanel != null,
    run: stub("ph.text.closeActivePanel"),
  },

  // ─── Overlay / dismissal ─────────────────────────────────────────────
  {
    id: "ph.overlay.dismissTop",
    title: "Close",
    category: "View",
    when: ctx => (ctx.overlay?.stackDepth ?? 0) > 0,
    run: stub("ph.overlay.dismissTop"),
    paletteHide: true,
  },
  {
    id: "ph.annotation.delete",
    title: "Delete annotation",
    category: "Edit",
    when: ctx => {
      const rec = ctx as Record<string, unknown>;
      return (
        rec["annotation.selectedId"] != null &&
        !rec["annotation.editingId"] &&
        !isInsideTextEditingSurfaceCtx(ctx)
      );
    },
    run: stub("ph.annotation.delete"),
    paletteHide: true,
  },
  {
    id: "ph.sections.toggleQuickLook",
    title: "Toggle section quick look",
    category: "View",
    when: ctx => {
      const rec = ctx as Record<string, unknown>;
      return Boolean(rec["sections.modalOpen"] && rec["sections.hoveredBlock"] != null);
    },
    run: stub("ph.sections.toggleQuickLook"),
    paletteHide: true,
  },

  // ─── Component (saved component creation) ────────────────────────────
  {
    id: "ph.component.createReusable",
    title: "Save as reusable component",
    category: "Edit",
    run: stub("ph.component.createReusable"),
  },

  // ─── Sidebar / general UI ────────────────────────────────────────────
  // (`ph.sidebar.search` defined above next to other tools.)
];

/**
 * Phase 2 marks commands as `stub: false` once their surface has migrated.
 * The dispatcher reads `stub` to decide whether to `preventDefault`/
 * `stopPropagation` on the matched chord: migrated commands take ownership;
 * unmigrated ones leave the chord to whatever inline handler still exists.
 *
 * IDs listed here are the ones STILL stubbed. Everything else has a real
 * `run` body that owns its chord. Wave C2a flipped the topbar / navmenu
 * doc-level chord set (⌘S, ⌘⇧M/D/L/G/H/E/O, plus topbar buttons).
 */
const STILL_STUB_IDS = new Set<string>([
  "ph.editor.exitPreview",
  "ph.editor.clearSelection",
  "ph.editor.openCommandPalette",
  "ph.editor.openBlocksPanel",
  "ph.editor.openComponentsPanel",
  "ph.editor.openComponentsTab",
  "ph.editor.closeSidebar",
  "ph.site.openSettings",
  "ph.site.selectBackground",
  "ph.media.selectAll",
  "ph.media.deleteSelected",
  "ph.ui.toggleDarkMode",
  "ph.sidebar.search",
  "ph.ai.openAssistant",
  "ph.ai.includeTextInChat",
  "ph.ai.includeNodeInChat",
  // ph.node.* — Phase 2 C2c (right-click menu) owns these.
  "ph.node.delete",
  "ph.node.duplicate",
  "ph.node.copy",
  "ph.node.paste",
  "ph.node.copyClasses",
  "ph.node.pasteClasses",
  "ph.node.selectParent",
  "ph.node.selectPage",
  "ph.node.selectAncestor",
  "ph.node.deselect",
  "ph.node.moveUp",
  "ph.node.moveDown",
  "ph.node.isolate",
  "ph.node.renameDisplayName",
  "ph.node.addBlockAbove",
  "ph.node.addBlockBelow",
  "ph.node.addEmptySection",
  "ph.node.addContainer",
  "ph.node.insertComponent",
  "ph.node.convertToComponent",
  "ph.node.cycleNextSibling",
  "ph.node.cyclePrevSibling",
  // ph.text.* — Phase 2 C2g/h (tiptap surface) owns these.
  "ph.text.bold",
  "ph.text.italic",
  "ph.text.underline",
  "ph.text.toggleStrike",
  "ph.text.toggleSuperscript",
  "ph.text.toggleSubscript",
  "ph.text.setBlockType",
  "ph.text.setFontFamily",
  "ph.text.setFontSize",
  "ph.text.applyTypographyPreset",
  "ph.text.setAlign",
  "ph.text.toggleBulletList",
  "ph.text.toggleOrderedList",
  "ph.text.indentListItem",
  "ph.text.outdentListItem",
  "ph.text.openLinkPanel",
  "ph.text.setLink",
  "ph.text.unsetLink",
  "ph.text.openFontPanel",
  "ph.text.openTextColorPanel",
  "ph.text.openHighlightPanel",
  "ph.text.openMorePanel",
  "ph.text.setColor",
  "ph.text.unsetColor",
  "ph.text.setHighlight",
  "ph.text.unsetHighlight",
  "ph.text.insertImage",
  "ph.text.insertHorizontalRule",
  "ph.text.clearFormatting",
  "ph.text.openVariablePicker",
  "ph.text.insertVariable",
  "ph.text.closeActivePanel",
  // Misc — owned by other surfaces.
  "ph.overlay.dismissTop",
  "ph.annotation.delete",
  "ph.sections.toggleQuickLook",
  "ph.component.createReusable",
]);

export const BUILTIN_COMMANDS: CommandDef[] = _BUILTIN_COMMANDS_RAW.map(def => ({
  ...def,
  stub: STILL_STUB_IDS.has(def.id),
}));
