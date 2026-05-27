/**
 * Builtin keybinding catalog — full list from v2 doc "Keybinding registration
 * plan". Each entry references a command id from `./commands.tsx`.
 *
 * Wave A: the registry stores these, but the doc-level dispatcher is NOT
 * mounted. Phase 2 wires the loop.
 */
import type { KeybindingDef, CommandContext } from "../types";

function notInTextEditing(ctx: CommandContext): boolean {
  return !ctx.tiptap?.active;
}

export const BUILTIN_KEYBINDINGS: KeybindingDef[] = [
  // ─── Editor history / save ──────────────────────────────────────────
  { command: "ph.editor.undo", key: "mod+z", when: notInTextEditing },
  { command: "ph.editor.redo", key: "mod+y", when: notInTextEditing },
  // Mac-style redo
  { command: "ph.editor.redo", key: "shift+mod+z", when: notInTextEditing },
  {
    command: "ph.editor.save",
    key: "mod+s",
    when: ctx => {
      const features = (ctx.features ?? {}) as { saveButton?: boolean };
      return features.saveButton !== false && notInTextEditing(ctx);
    },
  },

  // ─── Editor panels / overlays ───────────────────────────────────────
  { command: "ph.media.open", key: "shift+mod+m", when: notInTextEditing },
  { command: "ph.theme.open", key: "shift+mod+d", when: notInTextEditing },
  { command: "ph.layers.popOut", key: "shift+mod+l", when: notInTextEditing },
  { command: "ph.canvas.toggleGridLines", key: "shift+mod+g", when: notInTextEditing },
  {
    command: "ph.importExport.open",
    key: "shift+mod+e",
    when: ctx => {
      const features = (ctx.features ?? {}) as { importExport?: boolean };
      return features.importExport !== false && notInTextEditing(ctx);
    },
  },
  { command: "ph.canvas.toggleHidden", key: "shift+mod+h", when: notInTextEditing },
  { command: "ph.modifiers.open", key: "shift+mod+o", when: notInTextEditing },

  // ─── Site / palette / search ────────────────────────────────────────
  { command: "ph.site.openSettings", key: "mod+," },
  {
    command: "ph.editor.openCommandPalette",
    key: "mod+k",
    when: notInTextEditing,
  },
  {
    command: "ph.sidebar.search",
    key: "mod+f",
    when: ctx =>
      ctx.mouseOver === "sidebar" ||
      Boolean((ctx as Record<string, unknown>)["focusInSidebar"]),
  },

  // ─── Canvas zoom ────────────────────────────────────────────────────
  { command: "ph.canvas.zoomIn", key: "mod++" },
  { command: "ph.canvas.zoomIn", key: "mod+=" },
  { command: "ph.canvas.zoomOut", key: "mod+-" },
  { command: "ph.canvas.zoomReset", key: "mod+0" },

  // ─── Clipboard / duplicate ──────────────────────────────────────────
  { command: "ph.node.copy", key: "mod+c" },
  { command: "ph.node.paste", key: "mod+v" },
  { command: "ph.node.duplicate", key: "mod+d" },

  // ─── Delete chord (precedence: media > annotation > node) ───────────
  {
    command: "ph.media.deleteSelected",
    key: "backspace",
    when: ctx => {
      const rec = ctx as Record<string, unknown>;
      return Boolean(rec["media.modalOpen"]) && Number(rec["media.selectedCount"] ?? 0) > 0;
    },
    priority: 100,
  },
  {
    command: "ph.media.deleteSelected",
    key: "delete",
    when: ctx => {
      const rec = ctx as Record<string, unknown>;
      return Boolean(rec["media.modalOpen"]) && Number(rec["media.selectedCount"] ?? 0) > 0;
    },
    priority: 100,
  },
  {
    command: "ph.annotation.delete",
    key: "backspace",
    when: ctx => {
      const rec = ctx as Record<string, unknown>;
      return (
        rec["annotation.selectedId"] != null &&
        !rec["annotation.editingId"] &&
        notInTextEditing(ctx)
      );
    },
    priority: 50,
  },
  {
    command: "ph.annotation.delete",
    key: "delete",
    when: ctx => {
      const rec = ctx as Record<string, unknown>;
      return (
        rec["annotation.selectedId"] != null &&
        !rec["annotation.editingId"] &&
        notInTextEditing(ctx)
      );
    },
    priority: 50,
  },
  {
    command: "ph.node.delete",
    key: "backspace",
    when: ctx =>
      Boolean(ctx.selection.id) &&
      ctx.selection.id !== "ROOT" &&
      ctx.selection.canDelete &&
      notInTextEditing(ctx),
  },
  {
    command: "ph.node.delete",
    key: "delete",
    when: ctx =>
      Boolean(ctx.selection.id) &&
      ctx.selection.id !== "ROOT" &&
      ctx.selection.canDelete &&
      notInTextEditing(ctx),
  },

  // ─── Sibling cycle ──────────────────────────────────────────────────
  {
    command: "ph.node.cycleNextSibling",
    key: "tab",
    when: ctx => Boolean(ctx.selection.id) && notInTextEditing(ctx),
  },
  {
    command: "ph.node.cyclePrevSibling",
    key: "shift+tab",
    when: ctx => Boolean(ctx.selection.id) && notInTextEditing(ctx),
  },

  // ─── Escape — layered ───────────────────────────────────────────────
  {
    command: "ph.editor.exitPreview",
    key: "escape",
    when: ctx => ctx.mode === "preview",
    priority: 60,
  },
  {
    command: "ph.overlay.dismissTop",
    key: "escape",
    when: ctx => (ctx.overlay?.stackDepth ?? 0) > 0,
    priority: 50,
  },
  {
    command: "ph.editor.clearSelection",
    key: "escape",
    when: ctx =>
      ctx.selection.id != null && notInTextEditing(ctx) && ctx.mode !== "preview",
  },

  // ─── Sections quick-look ────────────────────────────────────────────
  {
    command: "ph.sections.toggleQuickLook",
    key: "space",
    when: ctx => {
      const rec = ctx as Record<string, unknown>;
      return Boolean(rec["sections.modalOpen"] && rec["sections.hoveredBlock"] != null);
    },
    priority: 50,
  },

  // ─── Media manager ──────────────────────────────────────────────────
  {
    command: "ph.media.selectAll",
    key: "mod+a",
    when: ctx => {
      const rec = ctx as Record<string, unknown>;
      return Boolean(rec["media.modalOpen"]) && !rec["media.selectionMode"];
    },
  },
];
