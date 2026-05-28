/**
 * Shared predicates / tiny run helpers used by multiple per-namespace
 * command files. Anything namespace-local lives next to its own command
 * defs.
 */
import { panelOpen } from "../../../utils/usePanelUrl";

/** `selection.id` truthy AND not ROOT. */
export function hasNonRootSelection(ctx: { selection: { id: string | null } }) {
  return Boolean(ctx.selection.id) && ctx.selection.id !== "ROOT";
}

export function isPageOrBackground(type: string | null): boolean {
  return type === "page" || type === "background";
}

/** Composite predicate used by copy / duplicate / move / paste. */
export function canCopySelection(ctx: {
  selection: {
    id: string | null;
    type: string | null;
    isDeletable: boolean;
    isLinked: boolean;
  };
}) {
  if (!hasNonRootSelection(ctx)) return false;
  if (isPageOrBackground(ctx.selection.type)) return false;
  if (!ctx.selection.isDeletable) return false;
  if (ctx.selection.isLinked) return false;
  return true;
}

export function isInsideTextEditingSurfaceCtx(ctx: {
  tiptap: { active: boolean };
}): boolean {
  // In wave A we don't have DOM target; use tiptap.active as the proxy.
  return Boolean(ctx.tiptap?.active);
}

/** Open Components tab via URL panel state. Used by editor + node. */
export function openComponentsTabRun(): void {
  panelOpen("components");
}
