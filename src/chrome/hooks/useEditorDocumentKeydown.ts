import { NodeTree, useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useCallback, useEffect } from "react";
import { useSDK } from "@/core/context";
import { phStorage } from "@/utils/phStorage";
import {
  isCraftCanvasChordTarget,
  isModChord,
  shouldDelegateCraftChordToBrowser,
} from "./editorShortcutGuards";
import {
  GetHtmlToComponent,
  addHandler,
  buildClonedTree,
  saveHandler,
} from "../viewport/state/viewportExports";

async function readHtmlFromSystemClipboard(): Promise<string | null> {
  let text = await navigator.clipboard.readText();
  text = text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s{2,}/g, " ");
  return text.startsWith("<") ? text : null;
}

/**
 * Single document-level owner for Craft tree Cmd/Ctrl+C and Cmd/Ctrl+V on the canvas.
 * Defers to the browser for text selection, form fields, sidebar, dialogs, and node chrome.
 *
 * Cmd+S (publish) and other header chords stay in useHeaderShortcuts; viewport still suppresses
 * Cmd+S on #viewport keydown so the browser save dialog does not fire when the canvas is focused.
 */
export function useEditorDocumentKeydown() {
  const { readOnly } = useSDK();
  const { enabled, query } = useEditor((state, q) => ({
    enabled: state.options.enabled,
    query: q,
  }));
  const { actions } = useEditor();

  const {
    actions: { setProp },
  } = useEditor(() => ({}));

  const getCloneTree = useCallback(
    (tree: NodeTree) => buildClonedTree({ tree, query, setProp }),
    [query, setProp]
  );

  useEffect(() => {
    if (!enabled || readOnly) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!isModChord(e)) return;
      const key = e.key.toLowerCase();
      if (key !== "c" && key !== "v") return;
      if (e.defaultPrevented) return;

      const kind = key === "c" ? "copy" : "paste";
      if (shouldDelegateCraftChordToBrowser(e, kind)) return;
      if (!isCraftCanvasChordTarget(e.target)) return;

      if (key === "c") {
        const active = query.getEvent("selected").first();
        if (!active || active === ROOT_NODE) return;
        const node = query.node(active).get();
        if (!node) return;
        if (["page", "background"].includes(node.data.props?.type)) {
          phStorage.set("clipboard", {});
          e.preventDefault();
          return;
        }
        e.preventDefault();
        void saveHandler({ query, id: active, component: null, actions }).catch(err =>
          console.error(err)
        );
        return;
      }

      // paste
      e.preventDefault();
      let active = query.getEvent("selected").first();
      if (!active) active = ROOT_NODE;

      const clipRaw = phStorage.get("clipboard");
      if (clipRaw && clipRaw !== "{}") {
        try {
          addHandler({ actions, query, getCloneTree, id: active, setProp });
        } catch (err) {
          console.error(err);
        }
        return;
      }

      void (async () => {
        try {
          const pasties = await readHtmlFromSystemClipboard();
          if (pasties) await GetHtmlToComponent(pasties);
        } catch (err) {
          console.error(err);
        }
      })();
    };

    document.addEventListener("keydown", onKeyDown, false);
    return () => document.removeEventListener("keydown", onKeyDown, false);
  }, [enabled, readOnly, query, actions, getCloneTree, setProp]);
}
