import type { Editor } from "@tiptap/react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TbBraces, TbWand } from "react-icons/tb";
import { AssistantOpenAtom, useSetAtomState } from "../../../utils/atoms";
import { buildInlineCopyAssistantOpenState } from "../../../utils/buildInlineCopyAssistantOpenState";
import { VariableInsertDropdownBody } from "./panels/VariableInsertPanel";

const MENU_Z = 100060;
const ITEM =
  "flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none transition-[color,background-color] duration-150 ease-out hover:bg-accent hover:text-accent-content focus-visible:bg-accent focus-visible:text-accent-content";

type Phase = "root" | "variables";

export function TiptapRichTextContextMenu({
  open,
  anchor,
  onClose,
  editor,
  query,
  textNodeId,
  showAi,
}: {
  open: boolean;
  anchor: { x: number; y: number } | null;
  onClose: () => void;
  editor: Editor | null;
  query: any;
  textNodeId: string;
  showAi: boolean;
}) {
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);
  const [phase, setPhase] = useState<Phase>("root");
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    // Skip the two-item root when AI is unavailable — go straight to variables.
    setPhase(showAi ? "root" : "variables");
  }, [open, anchor?.x, anchor?.y, showAi]);

  const handleAi = useCallback(() => {
    setAssistantOpen(buildInlineCopyAssistantOpenState(query, textNodeId));
    onClose();
  }, [onClose, query, setAssistantOpen, textNodeId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer, true);
    };
  }, [open, onClose]);

  if (!open || !anchor || !editor) return null;

  const pad = 8;
  const estW = phase === "root" ? 200 : 280;
  const estH = phase === "root" ? (showAi ? 88 : 44) : 300;
  const left = Math.max(pad, Math.min(anchor.x, window.innerWidth - estW - pad));
  const top = Math.max(pad, Math.min(anchor.y, window.innerHeight - estH - pad));

  return createPortal(
    <div
      ref={rootRef}
      className="pagehub-sdk-root rounded-xl border-base-300/50 bg-base-100 text-base-content fixed min-w-[12rem] overflow-visible border py-1 shadow-xl select-none"
      style={{ left, top, zIndex: MENU_Z }}
      role="menu"
      aria-label="Text actions"
    >
      {phase === "root" ? (
        <>
          {showAi ? (
            <button type="button" role="menuitem" className={ITEM} onClick={handleAi}>
              <TbWand className="size-4 shrink-0 opacity-80" aria-hidden />
              Include in AI chat
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={ITEM}
            onClick={() => setPhase("variables")}
          >
            <TbBraces className="size-4 shrink-0 opacity-80" aria-hidden />
            Insert variable
          </button>
        </>
      ) : (
        <div className="max-h-[min(320px,70vh)] overflow-y-auto py-1">
          {showAi ? (
            <button
              type="button"
              className={`${ITEM} text-neutral-content/80 text-xs`}
              onClick={() => setPhase("root")}
            >
              Back
            </button>
          ) : null}
          <VariableInsertDropdownBody
            editor={editor}
            query={query}
            nodeId={textNodeId}
            onInserted={onClose}
          />
        </div>
      )}
    </div>,
    document.body
  );
}
