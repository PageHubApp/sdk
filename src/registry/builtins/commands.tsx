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
  TbStack2,
  TbSun,
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
  AiChatAttachedNodesAtom,
  AssistantOpenAtom,
  BreadcrumbRenameRequestedAtom,
  ComponentsAtom,
  DarkModeAtom,
  InlineEditActivePanelAtom,
  type InlineEditActivePanel,
  LastActiveAtom,
  LayersDialogOpenAtom,
  MediaManagerModalAtom,
  ModifiersModalAtom,
  SectionPickerDialogAtom,
  SettingsAtom,
  ShowGridLinesAtom,
  ShowHiddenAtom,
  SideBarAtom,
  SideBarOpen,
  SidebarLayersPanelAtom,
  ViewModeAtom,
} from "../../utils/atoms";
import { getEditorActions, getEditorQuery } from "../editorBackref";
import { applyCanvasVisibility } from "../../utils/component/componentIsolation";
import { markManualSidebarClose } from "../../chrome/hooks/useAutoOpenSidebar";
import { phStorage } from "../../utils/phStorage";
import { SaveIndicator } from "../../chrome/viewport/ViewportTopBar/SaveIndicator";
import {
  addHandler,
  buildClonedTree,
  saveHandler,
} from "../../chrome/viewport/state/viewportExports";
import { duplicateNodeById } from "../../chrome/viewport/state/duplicateNodeById";
import {
  CANVAS_CLASS_CLIPBOARD,
  readClassClipboard,
} from "../../chrome/viewport/ToolboxContextual/utils/clipboardChecks";
import {
  moveNodeDown,
  moveNodeUp,
} from "../../chrome/toolbar/dialogs/Layers/siblingMoveOps";
import { unifiedDeleteNode } from "../../chrome/hooks/unifiedDelete";
import { AddElement } from "../../chrome/viewport/toolbox/toolboxUtils";
import { Element } from "@craftjs/core";

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

// ─── Node-scoped run helpers (Phase 2 C2c right-click menu) ──────────────────

/**
 * Resolve the selection id the command should operate on. Commands fired
 * from the right-click menu or keyboard rely on the currently-selected
 * Craft node — there's no per-invocation arg yet.
 */
function selectedId(query: any): string | null {
  if (!query) return null;
  try {
    const id = query.getEvent("selected").first();
    return id || null;
  } catch {
    return null;
  }
}

/** Helper: getCloneTree closure used by addHandler. */
function makeGetCloneTree(query: any, actions: any) {
  const setProp = actions?.setProp;
  return (tree: any) =>
    buildClonedTree({ tree, query, setProp, createLinks: false });
}

function nodeCopyRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  void saveHandler({ query, id, component: null, actions }).catch(e =>
    console.error("[ph.node.copy] failed:", e)
  );
}

function nodePasteRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  actions.selectNode(id);
  const getCloneTree = makeGetCloneTree(query, actions);
  if (typeof requestAnimationFrame !== "undefined") {
    requestAnimationFrame(() => {
      try {
        addHandler({
          actions,
          query,
          getCloneTree,
          id,
          setProp: actions.setProp,
        });
      } catch (e) {
        console.error("[ph.node.paste] failed:", e);
      }
    });
  } else {
    try {
      addHandler({
        actions,
        query,
        getCloneTree,
        id,
        setProp: actions.setProp,
      });
    } catch (e) {
      console.error("[ph.node.paste] failed:", e);
    }
  }
}

function nodeCopyClassesRun(ctx: any): void {
  const { query } = ctx as { query: any };
  const id = selectedId(query);
  if (!id) return;
  let node: any;
  try {
    node = query.node(id).get();
  } catch {
    return;
  }
  const props = node?.data?.props ?? {};
  const cn = typeof props.className === "string" ? props.className : "";
  const active = (props.root?.activeModifiers as string[]) || [];
  phStorage.set(CANVAS_CLASS_CLIPBOARD, {
    className: cn,
    activeModifiers: active,
  });
}

function nodePasteClassesRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  const clip = readClassClipboard();
  if (!clip) return;
  actions.setProp(id, (props: any) => {
    props.className = clip.className || "";
    if (!props.root) props.root = {};
    props.root.activeModifiers = [...(clip.activeModifiers || [])];
  });
}

function nodeSelectParentRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  const node = query.node(id).get();
  const parentId = node?.data?.parent as string | undefined;
  if (!parentId) return;
  actions.selectNode(parentId);
}

function nodeSelectPageRun(ctx: any): void {
  const { actions } = ctx as { actions: any };
  const ec = ctx as { hasPageIsolation?: boolean; pageIsolation?: string };
  const pageId = (ctx as { pageIsolation?: string }).pageIsolation;
  if (!pageId || typeof pageId !== "string") return;
  if (!ec.hasPageIsolation) return;
  actions.selectNode(pageId);
}

function nodeDeselectRun(ctx: any): void {
  const { actions } = ctx as { actions: any };
  if (!actions) return;
  try {
    actions.selectNode(null);
  } catch (e) {
    console.error("[ph.node.deselect] failed:", e);
  }
  setAtomExternal(SideBarOpen, false);
}

function nodeMoveUpRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  try {
    moveNodeUp(query, actions, id);
  } catch (e) {
    console.error("[ph.node.moveUp] failed:", e);
  }
}

function nodeMoveDownRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  try {
    moveNodeDown(query, actions, id);
  } catch (e) {
    console.error("[ph.node.moveDown] failed:", e);
  }
}

function nodeDuplicateRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  void duplicateNodeById({
    query,
    actions,
    setProp: actions.setProp,
    id,
  }).catch(e => console.error("[ph.node.duplicate] failed:", e));
}

function nodeDeleteRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  // Match legacy useToolboxMenuModel.handleDelete behavior: re-select
  // (defensive — keeps the unified-delete path happy when fired from the
  // palette without an explicit click) then schedule.
  try {
    actions.selectNode(id);
  } catch {}
  const settings = getAtomExternal(SettingsAtom);
  setTimeout(() => {
    void unifiedDeleteNode(query, actions, { settings });
  }, 10);
}

function nodeConvertToComponentRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  void (async () => {
    try {
      const comp = await saveHandler({
        query,
        id,
        component: "component",
        actions,
      });
      setAtomExternal(ComponentsAtom, (prev: unknown[]) => [...(prev || []), comp]);
    } catch (e) {
      console.error("[ph.node.convertToComponent] failed:", e);
    }
  })();
}

/**
 * Add an empty Section / Container as the next child of the canvas node.
 * Matches the legacy `handleAddSection` / `handleAddNestedContainer`.
 */
function addCanvasChild(
  query: any,
  actions: any,
  id: string,
  displayName: string
): void {
  const liveResolver = query.getOptions().resolver;
  const ContainerComp = liveResolver?.["Container"];
  if (!ContainerComp) return;
  const n = query.node(id).get();
  if (!n) return;
  const index = n.data.nodes.length;
  AddElement({
    element: (
      <Element
        canvas
        is={ContainerComp}
        canDelete={true}
        className="gap-section flex w-full flex-col"
        custom={{ displayName }}
      />
    ),
    actions,
    query,
    addTo: id,
    index,
  });
}

function nodeAddEmptySectionRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  addCanvasChild(query, actions, id, "Section");
}

function nodeAddContainerRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  addCanvasChild(query, actions, id, "Container");
}

function nodeAddBlockAtRun(position: "top" | "bottom") {
  return (ctx: any): void => {
    const { query } = ctx as { query: any };
    const id = selectedId(query);
    if (!id) return;
    const node = query.node(id).get();
    const parentId = node?.data?.parent as string | undefined;
    if (!parentId) return;
    setAtomExternal(SectionPickerDialogAtom, {
      isOpen: false,
      nodeId: id,
      parent: parentId,
      position,
    } as any);
    panelOpen("blocks");
  };
}

function nodeAiContextRun(ctx: any): void {
  const { query } = ctx as { query: any };
  const id = selectedId(query);
  if (!id) return;
  let displayName = "Element";
  try {
    const node = query.node(id).get();
    displayName =
      (node?.data?.custom?.displayName as string | undefined) ||
      (node?.data?.displayName as string | undefined) ||
      String(node?.data?.name || "Element");
  } catch {}
  setAtomExternal(AiChatAttachedNodesAtom, (prev: any[]) => {
    const list = prev || [];
    if (list.some(n => n.id === id)) return list;
    return [...list, { id, displayName }];
  });
  setAtomExternal(AssistantOpenAtom, { nodeId: id, revealPanel: true } as any);
}

/**
 * Select an ancestor node by id — parameterized so the breadcrumb's
 * data-driven ancestry rows all share a single command.
 */
function nodeSelectAncestorRun(
  _ctx: any,
  args: { id?: string } | undefined
): void {
  const actions = getEditorActions();
  if (!actions) return;
  const id = args?.id;
  if (!id || typeof id !== "string") return;
  try {
    actions.selectNode(id);
  } catch (e) {
    console.error("[ph.node.selectAncestor] failed:", e);
  }
}

/**
 * Request inline rename on the current selection (or an explicit `{ id }`).
 * NodeBreadcrumb watches `BreadcrumbRenameRequestedAtom` and enters edit
 * mode when its `currentItem.id` matches; it clears the atom on exit so a
 * second invocation re-fires.
 */
function nodeRenameDisplayNameRun(
  ctx: any,
  args: { id?: string } | undefined
): void {
  const { query } = ctx as { query: any };
  const explicit = args?.id;
  const target =
    typeof explicit === "string" && explicit.length > 0
      ? explicit
      : selectedId(query);
  if (!target) return;
  setAtomExternal(BreadcrumbRenameRequestedAtom, target);
}

/** Cycle sibling selection — Tab / Shift+Tab. */
function cycleSiblingRun(direction: 1 | -1) {
  return (ctx: any): void => {
    const { query, actions } = ctx as { query: any; actions: any };
    if (!query || !actions) return;
    try {
      const active = query.getEvent("selected").first();
      if (!active) return;
      const node = query.node(active).get();
      const parentId = node?.data?.parent;
      if (!parentId) return;
      const parent = query.node(parentId).get();
      const siblings: string[] = parent?.data?.nodes || [];
      if (siblings.length === 0) return;
      const idx = siblings.indexOf(active);
      let next = idx + direction;
      if (next >= siblings.length) next = 0;
      if (next < 0) next = siblings.length - 1;
      const target = siblings[next];
      if (!target) return;
      actions.selectNode(target);
    } catch (e) {
      console.error("[ph.node.cycleSibling] failed:", e);
    }
  };
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

/** Open Components tab via URL panel state. */
function openComponentsTabRun(): void {
  panelOpen("components");
}

// ─── Tiptap run helpers (Phase 2 C2g/h — inline toolbar + context menu) ─────

import { getActiveTiptapEditor } from "../tiptapBackref";
import { buildInlineCopyAssistantOpenState } from "../../utils/buildInlineCopyAssistantOpenState";
import { paletteToCSSVar } from "../../utils/design/palette";

/**
 * Run a Tiptap chain against the active editor. No-op when no editor is
 * focused so palette dispatch from outside an inline edit context is safe.
 */
function withActiveTiptap(fn: (editor: any) => void): void {
  const editor = getActiveTiptapEditor();
  if (!editor) return;
  try {
    fn(editor);
  } catch (e) {
    console.error("[ph.text] tiptap command failed:", e);
  }
}

function setActivePanelRun(panel: InlineEditActivePanel): void {
  setAtomExternal(InlineEditActivePanelAtom, panel);
}

function tiptapIncludeTextInChatRun(): void {
  const editor = getActiveTiptapEditor();
  if (!editor) return;
  // The inline-copy assistant prefill walks the active text node id +
  // current selection — both are available on the editor view. We reuse
  // the existing builder so prefill semantics match the right-click path.
  const query = getEditorQuery();
  // The node id lives in the editor's editor.options or as a custom field;
  // the legacy right-click path passes textNodeId from useNode(). Lacking
  // a craft node id here, fall back to selection.first().
  const id = query?.getEvent?.("selected")?.first?.() ?? null;
  setAtomExternal(
    AssistantOpenAtom,
    buildInlineCopyAssistantOpenState(query, id ?? "") as any
  );
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
  // NOTE: `ph.site.openSettings` was removed in Phase 2 C2b — Site Settings
  // was moved out of the SDK (main commit fd8aa69e: `/dashboard/sites/[id]/settings`).
  // Hosts that want a settings entry register their own command via
  // `commands.register({ id: "host.settings.open", ... })`.
  {
    id: "ph.site.selectBackground",
    title: "Select background",
    category: "Edit",
    icon: <TbBoxModel2 />,
    when: ctx => {
      const features = (ctx.features ?? {}) as { directSave?: boolean };
      return features.directSave === true;
    },
    run: () => {
      const actions = getEditorActions();
      panelClose();
      if (actions?.selectNode) {
        try {
          actions.selectNode(ROOT_NODE);
        } catch (err) {
          console.error("[ph.commands] ph.site.selectBackground failed:", err);
        }
      }
    },
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
    title: ctx => {
      const dark = Boolean((ctx as Record<string, unknown>)["editorDarkMode"]);
      return dark ? "Switch to light theme" : "Switch to dark theme";
    },
    category: "Preferences",
    icon: ctx => {
      const dark = Boolean((ctx as Record<string, unknown>)["editorDarkMode"]);
      return dark ? <TbSun /> : <TbMoon />;
    },
    when: ctx => {
      const features = (ctx.features ?? {}) as { darkModeSwitcher?: boolean };
      return features.darkModeSwitcher !== false;
    },
    run: () => {
      const next = !(getAtomExternal<boolean>(DarkModeAtom) ?? false);
      setAtomExternal(DarkModeAtom, next);
    },
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
    run: (_ctx, args) => {
      const a = (args ?? {}) as Record<string, unknown>;
      // Default: reveal the panel. Allow callers to pass through any
      // AssistantOpen payload (mode, promptHint, scope, etc.) via `args`.
      const payload = {
        revealPanel: true,
        ...a,
      };
      setAtomExternal(AssistantOpenAtom, payload as any);
      panelClose();
    },
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
    run: ctx => nodeDeleteRun(ctx),
  },
  {
    id: "ph.node.duplicate",
    title: "Duplicate",
    category: "Edit",
    icon: <TbCopy />,
    when: ctx => canCopySelection(ctx),
    run: ctx => nodeDuplicateRun(ctx),
  },
  {
    id: "ph.node.copy",
    title: "Copy",
    category: "Edit",
    icon: <TbCopy />,
    when: ctx => canCopySelection(ctx) && !isInsideTextEditingSurfaceCtx(ctx),
    run: ctx => nodeCopyRun(ctx),
  },
  {
    id: "ph.node.paste",
    title: "Paste",
    category: "Edit",
    when: ctx =>
      canCopySelection(ctx) &&
      !isInsideTextEditingSurfaceCtx(ctx) &&
      ctx.clipboard?.hasNode === true,
    run: ctx => nodePasteRun(ctx),
  },
  {
    id: "ph.node.copyClasses",
    title: "Copy classes",
    category: "Edit",
    when: ctx => canCopySelection(ctx),
    run: ctx => nodeCopyClassesRun(ctx),
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
    run: ctx => nodePasteClassesRun(ctx),
  },
  {
    id: "ph.node.selectParent",
    title: "Select parent",
    category: "Edit",
    when: ctx =>
      Boolean(ctx.parent?.id) && ctx.parent?.displayName !== "Background",
    run: ctx => nodeSelectParentRun(ctx),
  },
  {
    id: "ph.node.selectPage",
    title: "Select current page",
    category: "Edit",
    when: ctx => Boolean((ctx as Record<string, unknown>)["hasPageIsolation"]),
    run: ctx => nodeSelectPageRun(ctx),
  },
  {
    id: "ph.node.selectAncestor",
    title: "Select ancestor",
    category: "Edit",
    when: ctx => Number((ctx as Record<string, unknown>)["breadcrumbLength"] ?? 0) > 1,
    run: (ctx, args) =>
      nodeSelectAncestorRun(ctx, args as unknown as { id?: string } | undefined),
    paletteHide: true,
  },
  {
    id: "ph.node.deselect",
    title: "Deselect",
    category: "Edit",
    when: ctx =>
      Boolean(ctx.selection.id) && !isInsideTextEditingSurfaceCtx(ctx),
    run: ctx => nodeDeselectRun(ctx),
  },
  {
    id: "ph.node.moveUp",
    title: "Move up",
    category: "Edit",
    when: ctx => canCopySelection(ctx) && Boolean(ctx.parent?.id),
    enablement: ctx => Boolean((ctx as Record<string, unknown>)["siblingMove.canMoveUp"]),
    run: ctx => nodeMoveUpRun(ctx),
  },
  {
    id: "ph.node.moveDown",
    title: "Move down",
    category: "Edit",
    when: ctx => canCopySelection(ctx) && Boolean(ctx.parent?.id),
    enablement: ctx => Boolean((ctx as Record<string, unknown>)["siblingMove.canMoveDown"]),
    run: ctx => nodeMoveDownRun(ctx),
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
    run: (ctx, args) =>
      nodeRenameDisplayNameRun(ctx, args as unknown as { id?: string } | undefined),
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
    run: ctx => nodeAddBlockAtRun("top")(ctx),
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
    run: ctx => nodeAddBlockAtRun("bottom")(ctx),
  },
  {
    id: "ph.node.addEmptySection",
    title: "Add empty section",
    category: "Insert",
    when: ctx => ctx.selection.isCanvas && ctx.selection.type === "page",
    run: ctx => nodeAddEmptySectionRun(ctx),
  },
  {
    id: "ph.node.addContainer",
    title: "Add container",
    category: "Insert",
    when: ctx =>
      ctx.selection.isCanvas && !isPageOrBackground(ctx.selection.type),
    run: ctx => nodeAddContainerRun(ctx),
  },
  {
    id: "ph.node.insertComponent",
    title: "Insert component",
    category: "Insert",
    when: ctx => {
      const t = ctx.selection.type;
      return t === "Section" || t === "Container" || t === "page";
    },
    // Insert-component opens a hover-only flyout (chrome-owned) — the
    // command exists so the palette can expose the affordance, but its
    // run body just opens the Components panel as the next-best action.
    run: () => openComponentsTabRun(),
  },
  {
    id: "ph.node.convertToComponent",
    title: "Convert to component",
    category: "Edit",
    when: ctx => canCopySelection(ctx),
    enablement: ctx =>
      Boolean((ctx as Record<string, unknown>)["canMakeSavedComponent"]),
    run: ctx => nodeConvertToComponentRun(ctx),
  },
  {
    id: "ph.node.aiContext",
    title: "Include in AI chat",
    category: "AI",
    icon: <TbWand />,
    when: ctx => hasNonRootSelection(ctx) && Boolean(ctx.isAiEnabled),
    run: ctx => nodeAiContextRun(ctx),
  },
  {
    id: "ph.node.cycleNextSibling",
    title: "Cycle next sibling",
    category: "Edit",
    when: ctx =>
      Boolean(ctx.selection.id) && !isInsideTextEditingSurfaceCtx(ctx),
    run: ctx => cycleSiblingRun(1)(ctx),
    paletteHide: true,
  },
  {
    id: "ph.node.cyclePrevSibling",
    title: "Cycle previous sibling",
    category: "Edit",
    when: ctx =>
      Boolean(ctx.selection.id) && !isInsideTextEditingSurfaceCtx(ctx),
    run: ctx => cycleSiblingRun(-1)(ctx),
    paletteHide: true,
  },

  // ─── Rich text (palette-only, Tiptap owns the chords) ────────────────
  {
    id: "ph.text.bold",
    title: "Bold",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleBold().run()),
  },
  {
    id: "ph.text.italic",
    title: "Italic",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleItalic().run()),
  },
  {
    id: "ph.text.underline",
    title: "Underline",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleUnderline().run()),
  },
  {
    id: "ph.text.toggleStrike",
    title: "Strikethrough",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleStrike().run()),
  },
  {
    id: "ph.text.toggleSuperscript",
    title: "Superscript",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleSuperscript().run()),
  },
  {
    id: "ph.text.toggleSubscript",
    title: "Subscript",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleSubscript().run()),
  },
  {
    id: "ph.text.setBlockType",
    title: "Set block type",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: (_ctx, args) => {
      const type = (args as unknown as { type?: string } | undefined)?.type;
      if (!type) return;
      withActiveTiptap(ed => {
        if (type === "paragraph") {
          ed.chain().focus().setParagraph().run();
        } else {
          const m = /^heading([1-6])$/.exec(type);
          if (!m) return;
          const level = parseInt(m[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
          ed.chain().focus().toggleHeading({ level }).run();
        }
      });
    },
  },
  {
    id: "ph.text.setFontFamily",
    title: "Set font family",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: (_ctx, args) => {
      const family = (args as unknown as { family?: string } | undefined)?.family;
      if (!family) return;
      withActiveTiptap(ed => {
        ed.chain().focus().setFontFamily(family).run();
        // Lazy-load weights — matches FontPanel's commit path.
        import("../../utils/fonts/googleFonts")
          .then(({ loadGoogleFont }) => loadGoogleFont(family, ["400", "700"]))
          .catch(() => {});
      });
    },
  },
  {
    id: "ph.text.setFontSize",
    title: "Set font size",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: (_ctx, args) => {
      const size = (args as unknown as { size?: string } | undefined)?.size;
      if (!size) return;
      withActiveTiptap(ed => ed.chain().focus().setFontSize(size).run());
    },
  },
  {
    id: "ph.text.applyTypographyPreset",
    title: "Apply typography preset",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) &&
      Number((ctx as Record<string, unknown>)["theme.typographyCount"] ?? 0) > 0,
    run: (_ctx, args) => {
      // Args carry a pre-resolved className + optional fontFamily/fontWeight
      // for the lazy Google Fonts load. Caller (FontPanel) owns the
      // resolveTheme lookup so the command body stays pure.
      const a = (args ?? {}) as {
        className?: string;
        fontFamily?: string;
        fontWeight?: string;
      };
      if (!a.className) return;
      withActiveTiptap(async ed => {
        if (a.fontFamily) {
          try {
            const { loadGoogleFont } = await import("../../utils/fonts/googleFonts");
            await loadGoogleFont(a.fontFamily, [a.fontWeight || "400"]);
          } catch {}
        }
        ed.chain().focus().setMark("textStyle", { class: a.className }).run();
      });
    },
  },
  {
    id: "ph.text.setAlign",
    title: "Set text alignment",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: (_ctx, args) => {
      const dir = (args as unknown as { dir?: string } | undefined)?.dir;
      if (!dir) return;
      withActiveTiptap(ed => ed.chain().focus().setTextAlign(dir).run());
    },
  },
  {
    id: "ph.text.toggleBulletList",
    title: "Bullet list",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleBulletList().run()),
  },
  {
    id: "ph.text.toggleOrderedList",
    title: "Ordered list",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: () => withActiveTiptap(ed => ed.chain().focus().toggleOrderedList().run()),
  },
  {
    id: "ph.text.indentListItem",
    title: "Indent list item",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () =>
      withActiveTiptap(ed => ed.chain().focus().sinkListItem("listItem").run()),
  },
  {
    id: "ph.text.outdentListItem",
    title: "Outdent list item",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () =>
      withActiveTiptap(ed => ed.chain().focus().liftListItem("listItem").run()),
  },
  {
    id: "ph.text.openLinkPanel",
    title: "Open link panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () => setActivePanelRun("link"),
  },
  {
    id: "ph.text.setLink",
    title: "Set link",
    category: "Text",
    enablement: (_ctx, args) => {
      const href = (args as unknown as { href?: string } | undefined)?.href;
      return typeof href === "string" && href.length > 0;
    },
    run: (_ctx, args) => {
      const href = (args as unknown as { href?: string } | undefined)?.href;
      if (!href) return;
      withActiveTiptap(ed => {
        if (ed.isActive("link")) {
          ed.chain().focus().extendMarkRange("link").setLink({ href }).run();
        } else {
          ed.chain().focus().setLink({ href }).run();
        }
      });
    },
  },
  {
    id: "ph.text.unsetLink",
    title: "Remove link",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.isActive("link")),
    run: () =>
      withActiveTiptap(ed =>
        ed.chain().focus().extendMarkRange("link").unsetLink().run()
      ),
  },
  {
    id: "ph.text.openFontPanel",
    title: "Open font panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => setActivePanelRun("font"),
  },
  {
    id: "ph.text.openTextColorPanel",
    title: "Open text color panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => setActivePanelRun("textcolor"),
  },
  {
    id: "ph.text.openHighlightPanel",
    title: "Open highlight panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: () => setActivePanelRun("bgcolor"),
  },
  {
    id: "ph.text.openMorePanel",
    title: "Open more panel",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () => setActivePanelRun("more"),
  },
  {
    id: "ph.text.setColor",
    title: "Set text color",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: (_ctx, args) => {
      // Accept either a resolved cssVar OR a palette token; normalize.
      const a = (args ?? {}) as { cssVar?: string; value?: string };
      const cssVar =
        a.cssVar ?? (a.value ? paletteToCSSVar(a.value) : undefined);
      if (!cssVar) return;
      withActiveTiptap(ed => ed.chain().focus().setColor(cssVar).run());
    },
  },
  {
    id: "ph.text.unsetColor",
    title: "Clear text color",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () => withActiveTiptap(ed => ed.chain().focus().unsetColor().run()),
  },
  {
    id: "ph.text.setHighlight",
    title: "Highlight",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active) && !ctx.tiptap.selectionEmpty,
    run: (_ctx, args) => {
      const a = (args ?? {}) as { cssVar?: string; value?: string; color?: string };
      const color =
        a.color ?? a.cssVar ?? (a.value ? paletteToCSSVar(a.value) : undefined);
      if (!color) return;
      withActiveTiptap(ed => ed.chain().focus().setHighlight({ color }).run());
    },
  },
  {
    id: "ph.text.unsetHighlight",
    title: "Clear highlight",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: () => withActiveTiptap(ed => ed.chain().focus().unsetHighlight().run()),
  },
  {
    id: "ph.text.insertImage",
    title: "Insert image",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: (_ctx, args) => {
      // Image insert is bimodal: with explicit `src`, drop the image now;
      // without one, open the media manager modal — the toolbar listens and
      // posts back to the editor with the picked URL via setImage.
      const src = (args as unknown as { src?: string } | undefined)?.src;
      if (src) {
        withActiveTiptap(ed => ed.chain().focus().setImage({ src }).run());
        return;
      }
      // Fall back to opening the modal; toolbar UX still owns the picker
      // since selection/binding logic lives in the surface.
      setAtomExternal(MediaManagerModalAtom, true);
    },
  },
  {
    id: "ph.text.insertHorizontalRule",
    title: "Insert horizontal rule",
    category: "Text",
    when: ctx =>
      Boolean(ctx.tiptap?.active) && ctx.tiptap.richTextMode !== "inline",
    run: () => withActiveTiptap(ed => ed.chain().focus().setHorizontalRule().run()),
  },
  {
    id: "ph.text.clearFormatting",
    title: "Clear formatting",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: ctx => {
      const mode = ctx.tiptap?.richTextMode ?? "full";
      withActiveTiptap(ed => {
        if (mode === "inline") {
          ed.chain().focus().setContent("", { emitUpdate: false }).unsetAllMarks().run();
        } else {
          ed.chain().focus().clearNodes().unsetAllMarks().run();
        }
      });
    },
  },
  {
    id: "ph.text.openVariablePicker",
    title: "Insert variable",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    // Variable picker is a Popover anchored to the toolbar button — the
    // command body is a no-op signal; the surface owns popup open state.
    // Future: lift via a sibling atom if palette-driven picker is added.
    run: () => {
      // No-op: opening the picker requires an anchor element from the toolbar
      // surface (Headless UI Popover). Palette consumers should call
      // `ph.text.insertVariable` directly with an `{ id }`.
    },
  },
  {
    id: "ph.text.insertVariable",
    title: "Insert variable",
    category: "Text",
    when: ctx => Boolean(ctx.tiptap?.active),
    run: (_ctx, args) => {
      const id = (args as unknown as { id?: string } | undefined)?.id;
      if (!id) return;
      withActiveTiptap(ed => {
        (ed.chain().focus() as any).insertVariable({ id }).run();
      });
    },
  },
  {
    id: "ph.text.closeActivePanel",
    title: "Close text panel",
    category: "Text",
    when: ctx => ctx.tiptap?.activePanel != null,
    run: () => setActivePanelRun(null),
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
    run: () => {
      // Lazy-import to avoid a runtime TDZ cycle (useCreateComponent.tsx
      // pulls Container/Text which transitively reach the component
      // resolver — see [.claude/known-issues/sdk-circular-import-via-lib.md]).
      void import("../../chrome/hooks/useCreateComponent").then(m => {
        m.createReusableComponentRun();
      });
    },
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
  "ph.editor.openCommandPalette",
  "ph.media.selectAll",
  "ph.media.deleteSelected",
  "ph.sidebar.search",
  "ph.ai.includeTextInChat",
  "ph.ai.includeNodeInChat",
  // Phase 2 C2c: most ph.node.* commands are now real. C2d filled the
  // breadcrumb-owned commands (selectAncestor / renameDisplayName).
  // Isolate stays a stub — canvas-card chrome is migrated separately.
  "ph.node.isolate",
  // Phase 2 C2g: all ph.text.* run bodies are real (C2h fills includeTextInChat).
  // Misc — owned by other surfaces.
  "ph.overlay.dismissTop",
  "ph.annotation.delete",
  "ph.sections.toggleQuickLook",
]);

export const BUILTIN_COMMANDS: CommandDef[] = _BUILTIN_COMMANDS_RAW.map(def => ({
  ...def,
  stub: STILL_STUB_IDS.has(def.id),
}));
