import type { Editor } from "@tiptap/react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMenuItems, useRegistries } from "../../../registry";
import { useOverlay } from "../../../registry/hooks/useOverlay";
import { VariableInsertDropdownBody } from "./panels/VariableInsertPanel";

const MENU_Z = 100060;
const ITEM =
  "flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-left text-sm outline-none transition-[color,background-color] duration-150 ease-out hover:bg-accent hover:text-accent-content focus-visible:bg-accent focus-visible:text-accent-content";

type Phase = "root" | "variables";

/**
 * Right-click context menu for inline Tiptap editing.
 *
 * Phase 2 C2h — root phase is rendered from
 * `useMenuItems("tiptap/inline/context-menu")`. AI "Include in chat" and
 * "Insert variable" both flow through registry commands; the variable
 * sub-menu (groups + flyout) is bespoke chrome and stays inline.
 *
 * The `showAi` prop comes from the host's `editorChromeSlots.renderInlineCopyAssistantTrigger`
 * presence check — when the slot isn't wired, the AI row hides regardless of
 * the underlying `features.aiEnabled` flag.
 */
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
  const { commands } = useRegistries();
  const items = useMenuItems("tiptap/inline/context-menu");
  const [phase, setPhase] = useState<Phase>("root");
  const rootRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    // Skip the two-item root when AI is unavailable — go straight to
    // variables. We honor the host slot gate (showAi) on top of the menu
    // `when` (which already gates on features.aiEnabled).
    const hasAi =
      showAi && items.some(i => i.command === "ph.ai.includeTextInChat");
    setPhase(hasAi ? "root" : "variables");
  }, [open, anchor?.x, anchor?.y, showAi, items]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", onPointer, true);
    return () => {
      document.removeEventListener("mousedown", onPointer, true);
    };
  }, [open, onClose]);

  // Escape dismissal via registry overlay stack. Note: this menu has two
  // phases (root → variables), but Escape always closes the whole menu.
  useOverlay({
    id: "tiptap-context-menu",
    isOpen: open,
    onDismiss: onClose,
  });

  if (!open || !anchor || !editor) return null;

  const pad = 8;
  const estW = phase === "root" ? 200 : 280;
  const estH = phase === "root" ? (showAi ? 88 : 44) : 300;
  const left = Math.max(pad, Math.min(anchor.x, window.innerWidth - estW - pad));
  const top = Math.max(pad, Math.min(anchor.y, window.innerHeight - estH - pad));

  const handleItemClick = (commandId: string) => {
    if (commandId === "ph.text.openVariablePicker") {
      // Sub-menu nav — keep phase as local UI state, not a command.
      setPhase("variables");
      return;
    }
    void commands.execute(commandId, undefined, { trigger: "menu" });
    onClose();
  };

  return createPortal(
    <div
      ref={rootRef}
      className="pagehub-sdk-root border-base-300/50 bg-base-100 text-base-content fixed min-w-[12rem] overflow-visible rounded-xl border py-1 shadow-xl select-none"
      style={{ left, top, zIndex: MENU_Z }}
      role="menu"
      aria-label="Text actions"
    >
      {phase === "root" ? (
        <>
          {items.map(item => {
            // Honor host slot gate on top of the command-level `when`.
            if (item.command === "ph.ai.includeTextInChat" && !showAi) return null;
            return (
              <button
                key={item.command}
                type="button"
                role="menuitem"
                className={ITEM}
                disabled={!item.enabled}
                onClick={() => handleItemClick(item.command)}
              >
                {item.icon ? (
                  <span className="size-4 shrink-0 opacity-80" aria-hidden>
                    {item.icon}
                  </span>
                ) : null}
                {item.title}
              </button>
            );
          })}
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
