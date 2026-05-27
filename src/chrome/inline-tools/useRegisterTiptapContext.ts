/**
 * Push a derived `CommandContext.tiptap` snapshot into the command registry
 * whenever the active Tiptap editor changes or its selection updates.
 *
 * Phase 2 C2g: ~30 `ph.text.*` commands rely on `ctx.tiptap.{active,
 * selectionEmpty, richTextMode, isActive(), can()}` for `when` /
 * `enablement` predicates. The active editor lives behind a focus-tracked
 * module-level backref (`tiptapBackref.ts`); we subscribe to that AND to
 * the editor's `selectionUpdate` event so the snapshot stays current.
 *
 * Update cadence: we coalesce selectionUpdate via microtask to avoid render
 * storms on rapid keystrokes — selection events fire on every arrow-key
 * tick. One context update per microtask is enough; React renders re-batch
 * via useSyncExternalStore in `useCommandContext`.
 */
import { useEffect, useRef } from "react";
import { useAtomValue } from "@zedux/react";
import type { Editor } from "@tiptap/core";
import { useRegistries } from "../../registry";
import {
  getActiveTiptapEditor,
  subscribeActiveTiptapEditor,
} from "../../registry/tiptapBackref";
import { InlineEditActivePanelAtom } from "../../utils/atoms";

interface TiptapSnapshot {
  active: boolean;
  selectionEmpty: boolean;
  richTextMode: "full" | "inline";
  isActive: (name: string, attrs?: unknown) => boolean;
  can: () => unknown;
  activePanel: string | null;
}

function buildSnapshot(
  editor: Editor | null,
  activePanel: string | null
): TiptapSnapshot {
  if (!editor) {
    return {
      active: false,
      selectionEmpty: true,
      richTextMode: "full",
      isActive: () => false,
      can: () => ({}),
      activePanel,
    };
  }
  return {
    active: true,
    selectionEmpty: editor.state.selection.empty,
    // The Text node's richText.mode flag is attached to the Tiptap
    // extensions at create time — we read the doc's first node type as a
    // proxy: `inline*` docs are inline mode. Safer to inspect schema topNodeType.
    richTextMode:
      editor.schema.topNodeType.spec.content === "inline*" ? "inline" : "full",
    isActive: (name: string, attrs?: unknown) =>
      attrs == null
        ? editor.isActive(name)
        : editor.isActive(name, attrs as Record<string, unknown>),
    can: () => editor.can(),
    activePanel,
  };
}

export function useRegisterTiptapContext(): void {
  const { context: commandContext } = useRegistries();
  const activePanel = useAtomValue(InlineEditActivePanelAtom);
  const microtaskScheduledRef = useRef(false);

  useEffect(() => {
    // Microtask-coalesced push so a flurry of selectionUpdate events
    // (single arrow-key produces a stream) collapses into one context
    // snapshot per tick.
    const push = () => {
      if (microtaskScheduledRef.current) return;
      microtaskScheduledRef.current = true;
      queueMicrotask(() => {
        microtaskScheduledRef.current = false;
        const editor = getActiveTiptapEditor();
        commandContext.setCommandContext({
          tiptap: buildSnapshot(editor, activePanel) as never,
        });
      });
    };

    // Initial push reflects whatever editor is already focused on mount.
    push();

    // Per-editor selectionUpdate listener (attached/detached on swap).
    let detachFn: (() => void) | null = null;
    const attach = () => {
      const editor = getActiveTiptapEditor();
      if (!editor) {
        detachFn = null;
        return;
      }
      const onSel = () => push();
      editor.on("selectionUpdate", onSel);
      detachFn = () => editor.off("selectionUpdate", onSel);
    };
    const detach = () => {
      if (detachFn) {
        detachFn();
        detachFn = null;
      }
    };
    attach();

    // Re-attach listeners when the active editor swaps.
    const unsubActive = subscribeActiveTiptapEditor(() => {
      detach();
      attach();
      push();
    });

    return () => {
      unsubActive();
      detach();
    };
  }, [commandContext, activePanel]);
}
