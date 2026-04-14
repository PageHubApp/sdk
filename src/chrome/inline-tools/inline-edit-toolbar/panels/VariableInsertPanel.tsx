import type { Editor } from "@tiptap/react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useMemo } from "react";
import { TbBraces } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { getEditorVariableOptions } from "@/utils/editorVariableOptions";

interface VariableInsertPanelProps {
  editor: Editor;
  query: any;
}

/**
 * Compact variable picker for the minimal inline toolbar (caret, no selection).
 */
export function VariableInsertPanel({ editor, query }: VariableInsertPanelProps) {
  const options = useMemo(() => getEditorVariableOptions(query), [query]);

  return (
    <Popover className="relative">
      <PopoverButton
        type="button"
        aria-label="Insert variable"
        className="tool-button"
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content="Insert variable"
        data-tooltip-place="top"
        data-tooltip-offset={10}
      >
        <TbBraces className="size-4" aria-hidden />
      </PopoverButton>
      <PopoverPanel
        anchor="bottom start"
        transition
        className="pagehub-sdk-root rounded-box border-base-300/50 bg-base-100 z-[120] mt-1 max-h-60 min-w-[11rem] overflow-auto border py-1 text-xs shadow-xl [--anchor-gap:4px] data-closed:opacity-0"
      >
        <ul className="py-0.5">
          {options.map(o => (
            <li key={o.id}>
              <button
                type="button"
                className="text-neutral-content hover:bg-base-200 flex w-full flex-col items-start gap-0.5 px-2 py-1.5 text-left"
                onClick={() => {
                  (editor.chain().focus() as any).insertVariable({ id: o.id }).run();
                }}
              >
                <span className="text-base-content font-medium">{o.label}</span>
                <span className="font-mono text-[10px] opacity-70">{`{{${o.id}}}`}</span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverPanel>
    </Popover>
  );
}
