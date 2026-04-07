import { useEffect } from "react";
import { usePanelUrl } from "../../../utils/usePanelUrl";
import { SaveToServer } from "../lib";

interface UseHeaderShortcutsOptions {
  canUndo: boolean;
  isTenant: boolean;
  query: any;
  settings: any;
  setSettings: any;
  sessionToken: string | null;
  setIsMediaManagerModalOpen: (fn: (prev: boolean) => boolean) => void;
  setIsDesignSystemSidebarOpen: (fn: (prev: boolean) => boolean) => void;
  setIsSiteSettingsModalOpen: (fn: (prev: boolean) => boolean) => void;
  setIsLayersDialogOpen: (fn: (prev: boolean) => boolean) => void;
  setShowGridLines: (fn: (prev: boolean) => boolean) => void;
  setIsImportExportDialogOpen: (fn: (prev: boolean) => boolean) => void;
  setIsModifiersModalOpen: (fn: (prev: boolean) => boolean) => void;
  setShowHidden: (fn: (prev: boolean) => boolean) => void;
}

export function useHeaderShortcuts({
  canUndo,
  isTenant,
  query,
  settings,
  setSettings,
  sessionToken,
  setIsMediaManagerModalOpen,
  setIsDesignSystemSidebarOpen,
  setIsSiteSettingsModalOpen,
  setIsLayersDialogOpen,
  setShowGridLines,
  setIsImportExportDialogOpen,
  setIsModifiersModalOpen,
  setShowHidden,
}: UseHeaderShortcutsOptions) {
  const { open, close } = usePanelUrl();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Cmd+S -- Save
      if (key === "s" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo && settings) {
          if (isTenant) {
            const json = query.serialize();
            SaveToServer(json, true, settings, setSettings, sessionToken);
          } else {
            open("publish");
          }
        }
        return;
      }

      // Cmd+Shift+M -- Media Manager
      if (key === "m" && e.shiftKey) {
        e.preventDefault();
        setIsMediaManagerModalOpen(v => !v);
        close();
        return;
      }

      // Cmd+Shift+D -- Design System
      if (key === "d" && e.shiftKey) {
        e.preventDefault();
        setIsDesignSystemSidebarOpen(v => !v);
        close();
        return;
      }

      // Cmd+, -- Site Settings
      if (key === ",") {
        e.preventDefault();
        setIsSiteSettingsModalOpen(v => !v);
        close();
        return;
      }

      // Cmd+Shift+L -- Layers
      if (key === "l" && e.shiftKey) {
        e.preventDefault();
        setIsLayersDialogOpen(v => !v);
        close();
        return;
      }

      // Cmd+Shift+G -- Toggle Grid Lines
      if (key === "g" && e.shiftKey) {
        e.preventDefault();
        setShowGridLines(prev => {
          const next = !prev;
          document.getElementById("viewport")?.setAttribute("data-show-gridlines", next.toString());
          return next;
        });
        return;
      }

      // Cmd+Shift+E -- Import / Export
      if (key === "e" && e.shiftKey) {
        e.preventDefault();
        setIsImportExportDialogOpen(v => !v);
        close();
        return;
      }

      // Cmd+Shift+H -- Toggle Hidden Components
      if (key === "h" && e.shiftKey) {
        e.preventDefault();
        setShowHidden(prev => {
          const next = !prev;
          document.getElementById("viewport")?.setAttribute("data-show-hidden", next.toString());
          return next;
        });
        return;
      }

      // Cmd+Shift+O -- Modifiers
      if (key === "o" && e.shiftKey) {
        e.preventDefault();
        setIsModifiersModalOpen(v => !v);
        close();
        return;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });
}
