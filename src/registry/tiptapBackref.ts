/**
 * Active-Tiptap-editor backref — module-level ref to the currently-focused
 * inline `TextEditor` Tiptap instance.
 *
 * Phase 2 C2g: `ph.text.*` commands need to dispatch from outside their
 * React-local mount (palette, keybindings, registry context) but the Tiptap
 * editor instance lives inside a per-Text-node `useEditor()`. There is no
 * "active editor" backref in plain CraftJS / Tiptap — we track it ourselves
 * via `onFocus` / `onBlur` callbacks wired in `TextEditor.tsx`.
 *
 * Lifecycle:
 * - On Tiptap `onFocus` → `setActiveTiptapEditor(editor)`.
 * - On Tiptap `onBlur` → `setActiveTiptapEditor(null)` IFF this editor is the
 *   currently-registered one (don't clear someone else's registration on a
 *   rapid focus-swap between two text nodes).
 * - On `TextEditor` unmount → defensive clear with same identity check.
 *
 * Not exported from the SDK public API — only the registry layer and the
 * `TextEditor` mount touch it.
 */
import type { Editor } from "@tiptap/core";
import { sdkLog } from "../utils/logger";

let activeEditorRef: Editor | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => {
    try {
      l();
    } catch (err) {
      sdkLog.error("[ph.tiptap] listener error:", err);
    }
  });
}

export function setActiveTiptapEditor(editor: Editor | null): void {
  if (activeEditorRef === editor) return;
  activeEditorRef = editor;
  notify();
}

/**
 * Clear ONLY if the currently-active editor is `editor`. Used in `onBlur` and
 * unmount paths so a stale blur doesn't wipe a newer focus registration.
 */
export function clearActiveTiptapEditorIf(editor: Editor): void {
  if (activeEditorRef === editor) {
    activeEditorRef = null;
    notify();
  }
}

export function getActiveTiptapEditor(): Editor | null {
  return activeEditorRef;
}

export function subscribeActiveTiptapEditor(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
