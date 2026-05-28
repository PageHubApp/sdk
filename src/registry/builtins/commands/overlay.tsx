/**
 * `ph.overlay.*` / `ph.annotation.*` / `ph.sections.*` — Escape-key /
 * dismissal targets for stacked editor overlays (modals, picker dialogs,
 * annotation rails).
 */
import type { CommandDef } from "../../types";
import { dismissTopOverlay } from "../../overlayStack";
import { getAnnotationBackref } from "../../annotationBackref";
import { getSectionsBackref } from "../../sectionsBackref";
import { isInsideTextEditingSurfaceCtx } from "./helpers";

export const OVERLAY_COMMANDS: CommandDef[] = [
  {
    id: "ph.overlay.dismissTop",
    title: "Close",
    category: "View",
    when: ctx => (ctx.overlay?.stackDepth ?? 0) > 0,
    // Pop the top entry from the editor overlay stack and invoke its
    // dismiss callback. Surfaces register via `useOverlay({ id, isOpen,
    // onDismiss })`; the stack lives in `../overlayStack.ts` (separate
    // from the visitor-facing `_shownStack` in `utils/state/stateRegistry`).
    run: () => {
      dismissTopOverlay();
    },
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
    run: () => {
      getAnnotationBackref()?.deleteSelected();
    },
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
    run: () => {
      getSectionsBackref()?.toggleQuickLook();
    },
    paletteHide: true,
  },
];
