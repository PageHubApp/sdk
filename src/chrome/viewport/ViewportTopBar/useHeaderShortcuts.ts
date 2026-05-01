import { useEffect } from "react";
import { usePanelUrl } from "../../../utils/usePanelUrl";

interface UseHeaderShortcutsOptions {
  setIsMediaManagerModalOpen: (fn: (prev: boolean) => boolean) => void;
  setIsSiteSettingsModalOpen: (fn: (prev: boolean) => boolean) => void;
  setIsLayersDialogOpen: (fn: (prev: boolean) => boolean) => void;
  setShowGridLines: (fn: (prev: boolean) => boolean) => void;
  setIsModifiersModalOpen: (fn: (prev: boolean) => boolean) => void;
  setShowHidden: (fn: (prev: boolean) => boolean) => void;
}

export function useHeaderShortcuts({
  setIsMediaManagerModalOpen,
  setIsSiteSettingsModalOpen,
  setIsLayersDialogOpen,
  setShowGridLines,
  setIsModifiersModalOpen,
  setShowHidden,
}: UseHeaderShortcutsOptions) {
  const { open, close, toggle } = usePanelUrl();

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

      // Cmd+S -- Publish
      if (key === "s" && !e.shiftKey) {
        e.preventDefault();
        open("publish");
        return;
      }

      // Cmd+Shift+M -- Media Manager
      if (key === "m" && e.shiftKey) {
        e.preventDefault();
        setIsMediaManagerModalOpen(v => !v);
        close();
        return;
      }

      // Cmd+Shift+D -- Theme settings (URL panel)
      if (key === "d" && e.shiftKey) {
        e.preventDefault();
        toggle("theme");
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

      // Cmd+Shift+E -- Import / Export (URL panel; closes when another panel opens)
      if (key === "e" && e.shiftKey) {
        e.preventDefault();
        toggle("import-export");
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
