/**
 * Run-body helpers for `ph.node.*` commands. Split out so `node.tsx` stays
 * focused on the command definitions and the file stays under the R3 cap.
 */
import React from "react";
import { Element } from "@craftjs/core";
import { panelOpen } from "../../../utils/usePanelUrl";
import { getAtomExternal, setAtomExternal } from "../../../utils/atoms/external";
import {
  AiChatAttachedNodesAtom,
  AssistantOpenAtom,
  BreadcrumbRenameRequestedAtom,
  ComponentsAtom,
  SectionPickerDialogAtom,
  SettingsAtom,
  SideBarOpen,
} from "../../../utils/atoms";
import { getEditorActions } from "../../editorBackref";
import { phStorage } from "../../../utils/phStorage";
import {
  addHandler,
  buildClonedTree,
  saveHandler,
} from "../../../chrome/viewport/state/viewportExports";
import { duplicateNodeById } from "../../../chrome/viewport/state/duplicateNodeById";
import {
  CANVAS_CLASS_CLIPBOARD,
  readClassClipboard,
} from "../../../chrome/viewport/ToolboxContextual/utils/clipboardChecks";
import {
  moveNodeDown,
  moveNodeUp,
} from "../../../chrome/toolbar/dialogs/Layers/siblingMoveOps";
import { unifiedDeleteNode } from "../../../chrome/hooks/unifiedDelete";
import { AddElement } from "../../../chrome/viewport/toolbox/toolboxUtils";
import { sdkLog } from "../../../utils/logger";

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

export function nodeCopyRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  void saveHandler({ query, id, component: null, actions }).catch(e =>
    sdkLog.error("[ph.node.copy] failed:", e)
  );
}

export function nodePasteRun(ctx: any): void {
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
        sdkLog.error("[ph.node.paste] failed:", e);
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
      sdkLog.error("[ph.node.paste] failed:", e);
    }
  }
}

export function nodeCopyClassesRun(ctx: any): void {
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

export function nodePasteClassesRun(ctx: any): void {
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

export function nodeSelectParentRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  const node = query.node(id).get();
  const parentId = node?.data?.parent as string | undefined;
  if (!parentId) return;
  actions.selectNode(parentId);
}

export function nodeSelectPageRun(ctx: any): void {
  const { actions } = ctx as { actions: any };
  const ec = ctx as { hasPageIsolation?: boolean; pageIsolation?: string };
  const pageId = (ctx as { pageIsolation?: string }).pageIsolation;
  if (!pageId || typeof pageId !== "string") return;
  if (!ec.hasPageIsolation) return;
  actions.selectNode(pageId);
}

export function nodeDeselectRun(ctx: any): void {
  const { actions } = ctx as { actions: any };
  if (!actions) return;
  try {
    actions.selectNode(null);
  } catch (e) {
    sdkLog.error("[ph.node.deselect] failed:", e);
  }
  setAtomExternal(SideBarOpen, false);
}

export function nodeMoveUpRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  try {
    moveNodeUp(query, actions, id);
  } catch (e) {
    sdkLog.error("[ph.node.moveUp] failed:", e);
  }
}

export function nodeMoveDownRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  try {
    moveNodeDown(query, actions, id);
  } catch (e) {
    sdkLog.error("[ph.node.moveDown] failed:", e);
  }
}

export function nodeDuplicateRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  void duplicateNodeById({
    query,
    actions,
    setProp: actions.setProp,
    id,
  }).catch(e => sdkLog.error("[ph.node.duplicate] failed:", e));
}

export function nodeDeleteRun(ctx: any): void {
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

export function nodeConvertToComponentRun(ctx: any): void {
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
      sdkLog.error("[ph.node.convertToComponent] failed:", e);
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

export function nodeAddEmptySectionRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  addCanvasChild(query, actions, id, "Section");
}

export function nodeAddContainerRun(ctx: any): void {
  const { query, actions } = ctx as { query: any; actions: any };
  const id = selectedId(query);
  if (!id) return;
  addCanvasChild(query, actions, id, "Container");
}

export function nodeAddBlockAtRun(position: "top" | "bottom") {
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

export function nodeAiContextRun(ctx: any): void {
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
export function nodeSelectAncestorRun(
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
    sdkLog.error("[ph.node.selectAncestor] failed:", e);
  }
}

/**
 * Request inline rename on the current selection (or an explicit `{ id }`).
 * NodeBreadcrumb watches `BreadcrumbRenameRequestedAtom` and enters edit
 * mode when its `currentItem.id` matches; it clears the atom on exit so a
 * second invocation re-fires.
 */
export function nodeRenameDisplayNameRun(
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
export function cycleSiblingRun(direction: 1 | -1) {
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
      sdkLog.error("[ph.node.cycleSibling] failed:", e);
    }
  };
}
