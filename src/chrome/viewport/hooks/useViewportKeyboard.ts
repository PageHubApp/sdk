import { useEditor } from "@craftjs/core";
import { useCallback } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../../utils/atoms";
import { LastActiveAtom } from "../../../utils/atoms";
import { useUnifiedDelete } from "../../hooks/useUnifiedDelete";
import { PreviewAtom, EnabledAtom, TabAtom } from "../atoms";
import {
  finalizeToolboxHistorySelectionSync,
  markToolboxHistorySelectionSync,
} from "../../../utils/usePanelUrl";

/** True when the key event target is inside a text field — skip viewport chrome shortcuts (Backspace delete, Tab cycle, etc.). */
function isInsideTextEditingSurface(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== "function") return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
  if (el.isContentEditable || el.getAttribute?.("contenteditable") === "true") return true;
  if (el.closest(".ProseMirror")) return true;
  if (el.closest(".cm-editor")) return true;
  if (el.closest(".monaco-editor")) return true;
  return false;
}

export function useViewportKeyboard() {
  const { enabled, canUndo, canRedo, actions, query } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));

  const { deleteSelectedNode } = useUnifiedDelete();
  const [preview, setPreview] = useAtomState(PreviewAtom);
  const setEnabled = useSetAtomState(EnabledAtom);
  const lastActive = useAtomValue(LastActiveAtom);
  const setActiveTab = useSetAtomState(TabAtom);

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      const nodeId = target.closest("[node-id]")?.getAttribute("node-id");
      if (nodeId) setTimeout(() => setActiveTab(""), 600);
    },
    [setActiveTab]
  );

  const handleBodyKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && preview) {
      event.preventDefault();
      const viewport = document.getElementById("viewport");
      const scrollTop = viewport?.scrollTop ?? 0;
      const scrollLeft = viewport?.scrollLeft ?? 0;

      actions.setOptions(options => {
        options.enabled = !enabled;
        setPreview(false);
        setEnabled(true);
        setTimeout(() => {
          if (!lastActive) return;
          const node = query.node(lastActive).get();
          if (node) actions.selectNode(lastActive);
        }, 100);
      });

      requestAnimationFrame(() => {
        if (viewport) {
          viewport.scrollTop = scrollTop;
          viewport.scrollLeft = scrollLeft;
        }
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isInsideTextEditingSurface(event.target)) return;

    const charCode = String.fromCharCode(event.which).toLowerCase();

    handleBodyKeyDown(event.nativeEvent);

    // Escape — clear selection (click canvas or a node again to select)
    if (event.key === "Escape") {
      event.preventDefault();
      try {
        const active = query.getEvent("selected").first();
        if (active) actions.selectNode(null);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // Tab (cycle siblings)
    if (event.key === "Tab") {
      event.preventDefault();
      try {
        const active = query.getEvent("selected").first();
        const theNode = query.node(active).get();
        const parentNode = query.node(theNode.data.parent).get();
        const indexToAdd = parentNode.data.nodes.indexOf(active);
        let index = indexToAdd + 1;
        if (index + 1 > parentNode.data.nodes.length) index = 0;
        const ee = query.node(parentNode.data.nodes[index]).get();
        actions.selectNode(ee.id);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // Backspace (delete)
    if (event.which === 8) {
      try {
        event.preventDefault();
        deleteSelectedNode();
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // Ctrl+S — just suppress browser save dialog; document-level useHeaderShortcuts handles Cmd+S
    if ((event.ctrlKey || event.metaKey) && charCode === "s") {
      event.preventDefault();
      return;
    }

    // Ctrl+Z (undo)
    if ((event.ctrlKey || event.metaKey) && charCode === "z") {
      try {
        event.preventDefault();
        if (canUndo) {
          markToolboxHistorySelectionSync();
          actions?.history?.undo();
          finalizeToolboxHistorySelectionSync();
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    // Ctrl+Y (redo)
    if ((event.ctrlKey || event.metaKey) && charCode === "y") {
      try {
        event.preventDefault();
        if (canRedo) {
          markToolboxHistorySelectionSync();
          actions?.history?.redo();
          finalizeToolboxHistorySelectionSync();
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  return { handleKeyDown, handleDoubleClick, handleBodyKeyDown };
}
