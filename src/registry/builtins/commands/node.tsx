/**
 * `ph.node.*` commands — selection-scoped actions invoked from the
 * right-click menu, breadcrumb, palette, or canvas chrome. Run bodies
 * live in `./node-runs` to keep this file under the R3 LOC cap.
 */
import React from "react";
import {
  TbCopy,
  TbFocus2,
  TbTrash,
  TbWand,
} from "react-icons/tb";
import type { CommandDef } from "../../types";
import { setAtomExternal } from "../../../utils/atoms/external";
import { CanvasIsolateAtom } from "../../../utils/component/componentIsolation";
import {
  canCopySelection,
  hasNonRootSelection,
  isInsideTextEditingSurfaceCtx,
  isPageOrBackground,
  openComponentsTabRun,
} from "./helpers";
import {
  cycleSiblingRun,
  nodeAddBlockAtRun,
  nodeAddContainerRun,
  nodeAddEmptySectionRun,
  nodeAiContextRun,
  nodeConvertToComponentRun,
  nodeCopyClassesRun,
  nodeCopyRun,
  nodeDeleteRun,
  nodeDeselectRun,
  nodeDuplicateRun,
  nodeMoveDownRun,
  nodeMoveUpRun,
  nodePasteClassesRun,
  nodePasteRun,
  nodeRenameDisplayNameRun,
  nodeSelectAncestorRun,
  nodeSelectPageRun,
  nodeSelectParentRun,
} from "./node-runs";

export const NODE_COMMANDS: CommandDef[] = [
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
    run: (ctx, args) => {
      // Args take precedence (canvas chip passes the container id explicitly);
      // fall back to the current selection when invoked from the palette.
      const argId = (args as unknown as { id?: string } | undefined)?.id ?? null;
      const id = argId || ctx.selection.id;
      if (!id) return;
      setAtomExternal(CanvasIsolateAtom, id);
    },
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
];
