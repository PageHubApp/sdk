/**
 * Aggregate of site-/tool-level commands that don't form a namespace large
 * enough to deserve its own file:
 *   `ph.site.*`, `ph.theme.*`, `ph.media.*`, `ph.layers.*`,
 *   `ph.modifiers.*`, `ph.importExport.*`, `ph.ui.*`, `ph.sidebar.*`
 */
import React from "react";
import { ROOT_NODE } from "@craftjs/utils";
import {
  TbBoxModel2,
  TbDownload,
  TbLayoutGrid,
  TbLayoutSidebar,
  TbMoon,
  TbPalette,
  TbPhoto,
  TbStack2,
  TbSun,
  TbTrash,
} from "react-icons/tb";
import type { CommandDef } from "../../types";
import {
  panelClose,
  panelToggle,
} from "../../../utils/usePanelUrl";
import { setAtomExternal, getAtomExternal } from "../../../utils/atoms/external";
import {
  DarkModeAtom,
  LayersDialogOpenAtom,
  MediaManagerModalAtom,
  ModifiersModalAtom,
  SideBarAtom,
  SidebarLayersPanelAtom,
} from "../../../utils/atoms";
import { getEditorActions } from "../../editorBackref";
import { getMediaBackref } from "../../mediaBackref";
import { getSidebarBackref } from "../../sidebarBackref";
import { phStorage } from "../../../utils/phStorage";
import { isInsideTextEditingSurfaceCtx } from "./helpers";

export const SITE_TOOLS_COMMANDS: CommandDef[] = [
  // ─── Site ──────────────────────────────────────────────────────────────
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

  // ─── Theme ─────────────────────────────────────────────────────────────
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

  // ─── Media ─────────────────────────────────────────────────────────────
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
    run: () => {
      getMediaBackref()?.selectAllVisible();
    },
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
    run: () => {
      getMediaBackref()?.handleDeleteSelected();
    },
    paletteHide: true,
  },

  // ─── Layers ────────────────────────────────────────────────────────────
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

  // ─── Modifiers ─────────────────────────────────────────────────────────
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

  // ─── Import / Export ───────────────────────────────────────────────────
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

  // ─── UI / preferences ──────────────────────────────────────────────────
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

  // ─── Sidebar ───────────────────────────────────────────────────────────
  {
    id: "ph.sidebar.search",
    title: "Search sidebar",
    category: "View",
    when: ctx =>
      ctx.mouseOver === "sidebar" || Boolean((ctx as Record<string, unknown>)["focusInSidebar"]),
    run: () => {
      getSidebarBackref()?.toggleSearch();
    },
    paletteHide: true,
  },
];
