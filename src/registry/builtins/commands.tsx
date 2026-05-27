/**
 * Builtin command catalog — Phase 1 Wave A.
 *
 * Every command's `run` body is a stub that logs a warning. Phase 2 wires
 * real behavior surface-by-surface. `when` and `enablement` predicates ARE
 * real — they read CommandContext and return correct booleans so menus and
 * keybindings filter correctly without surface migration.
 */
import React from "react";
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

const _BUILTIN_COMMANDS_RAW: CommandDef[] = [
  // ─── Editor ──────────────────────────────────────────────────────────
  {
    id: "ph.editor.insert",
    title: "Insert blocks & components",
    category: "Edit",
    icon: <TbPlus />,
    run: stub("ph.editor.insert"),
  },
  {
    id: "ph.editor.undo",
    title: "Undo",
    category: "Edit",
    icon: <TbArrowBackUp />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    enablement: ctx => Boolean(ctx.canUndo),
    run: stub("ph.editor.undo"),
  },
  {
    id: "ph.editor.redo",
    title: "Redo",
    category: "Edit",
    icon: <TbArrowForwardUp />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    enablement: ctx => Boolean(ctx.canRedo),
    run: stub("ph.editor.redo"),
  },
  {
    id: "ph.editor.save",
    title: "Publish",
    category: "File",
    icon: <TbDeviceFloppy />,
    when: ctx => {
      const features = (ctx.features ?? {}) as { saveButton?: boolean };
      return features.saveButton !== false && !isInsideTextEditingSurfaceCtx(ctx);
    },
    run: stub("ph.editor.save"),
  },
  {
    id: "ph.editor.togglePreview",
    title: ctx => (ctx.mode === "preview" ? "Exit preview" : "Toggle preview"),
    category: "View",
    icon: ctx => (ctx.mode === "preview" ? <TbCode /> : <TbEye />),
    run: stub("ph.editor.togglePreview"),
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
    run: stub("ph.editor.openMore"),
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
    run: stub("ph.canvas.setView"),
  },
  {
    id: "ph.canvas.toggleDevice",
    title: "Toggle device",
    category: "View",
    icon: <TbDeviceMobile />,
    run: stub("ph.canvas.toggleDevice"),
  },
  {
    id: "ph.canvas.toggleResponsive",
    title: "Toggle responsive",
    category: "View",
    run: stub("ph.canvas.toggleResponsive"),
  },
  {
    id: "ph.canvas.toggleViewMode",
    title: ctx => (ctx.viewMode === "canvas" ? "Switch to page editor" : "Switch to components editor"),
    category: "View",
    icon: ctx => (ctx.viewMode === "canvas" ? <TbFileText /> : <TbBoxModel2 />),
    run: stub("ph.canvas.toggleViewMode"),
  },
  {
    id: "ph.canvas.toggleGridLines",
    title: "Toggle grid lines",
    category: "View",
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    run: stub("ph.canvas.toggleGridLines"),
  },
  {
    id: "ph.canvas.toggleBreakpointMarkers",
    title: "Toggle breakpoint lines",
    category: "View",
    run: stub("ph.canvas.toggleBreakpointMarkers"),
  },
  {
    id: "ph.canvas.toggleDeviceGuides",
    title: "Toggle device guides",
    category: "View",
    run: stub("ph.canvas.toggleDeviceGuides"),
  },
  {
    id: "ph.canvas.toggleHidden",
    title: "Toggle hidden components",
    category: "View",
    icon: <TbEyeOff />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    run: stub("ph.canvas.toggleHidden"),
  },
  {
    id: "ph.canvas.zoomIn",
    title: "Zoom in",
    category: "View",
    when: ctx => ctx.mouseOver !== "topbar" && ctx.mouseOver !== "sidebar",
    run: stub("ph.canvas.zoomIn"),
    paletteHide: true,
  },
  {
    id: "ph.canvas.zoomOut",
    title: "Zoom out",
    category: "View",
    when: ctx => ctx.mouseOver !== "topbar" && ctx.mouseOver !== "sidebar",
    run: stub("ph.canvas.zoomOut"),
    paletteHide: true,
  },
  {
    id: "ph.canvas.zoomReset",
    title: "Reset zoom",
    category: "View",
    run: stub("ph.canvas.zoomReset"),
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
    run: stub("ph.theme.open"),
  },
  {
    id: "ph.media.open",
    title: "Media manager",
    category: "Tools",
    icon: <TbPhoto />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    run: stub("ph.media.open"),
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
    run: stub("ph.layers.popOut"),
  },
  {
    id: "ph.layers.toggleDock",
    title: "Dock / hide layers panel",
    category: "View",
    icon: <TbLayoutGrid />,
    run: stub("ph.layers.toggleDock"),
  },
  {
    id: "ph.modifiers.open",
    title: "Modifiers",
    category: "Tools",
    icon: <TbStack2 />,
    when: ctx => !isInsideTextEditingSurfaceCtx(ctx),
    run: stub("ph.modifiers.open"),
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
    run: stub("ph.importExport.open"),
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
    run: stub("ph.ui.toggleSidebarSide"),
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
 * Every Wave A command body is a stub. Flag all of them so the keybinding
 * dispatcher (Wave B1) skips `preventDefault()` and lets the existing
 * surface-level handlers keep owning the real behavior during Phase 2.
 * Phase 2 will remove `stub: true` from each command as it migrates.
 */
export const BUILTIN_COMMANDS: CommandDef[] = _BUILTIN_COMMANDS_RAW.map(def => ({
  ...def,
  stub: true,
}));
