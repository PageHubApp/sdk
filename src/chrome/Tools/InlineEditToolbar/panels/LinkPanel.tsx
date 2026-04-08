import { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { MdLink } from "react-icons/md";
import { PageSelector } from "../../../Viewport/PageSelector";

interface LinkPanelProps {
  editor: Editor;
}

export function LinkPanel({ editor }: LinkPanelProps) {
  const [linkType, setLinkType] = useState<"external" | "page">("page");
  const [url, setUrl] = useState("");
  const [savedSelection, setSavedSelection] = useState<{ from: number; to: number } | null>(null);

  useEffect(() => {
    const { from, to } = editor.state.selection;
    if (from !== to) setSavedSelection({ from, to });
  }, [editor]);

  const applyLink = (href: string, fallbackText: string) => {
    const selection = savedSelection || editor.state.selection;
    const { from, to } = selection;

    if (from !== to) {
      editor.chain().focus().setTextSelection({ from, to }).toggleLink({ href }).run();
    } else {
      const startPos = editor.state.selection.from;
      editor
        .chain()
        .focus()
        .insertContent(fallbackText + " ")
        .setTextSelection({ from: startPos, to: startPos + fallbackText.length })
        .toggleLink({ href })
        .run();
    }
    setSavedSelection(null);
  };

  return (
    <div className="flex items-center gap-2 p-2">
      {/* Type toggle */}
      <div className="flex shrink-0 items-center rounded-md border border-base-300">
        <button
          type="button"
          onClick={() => setLinkType("page")}
          className={`rounded-l-md px-2 py-1 text-[10px] transition-colors ${linkType === "page" ? "bg-primary text-primary-content" : "text-neutral-content hover:bg-neutral"}`}
        >
          Page
        </button>
        <button
          type="button"
          onClick={() => setLinkType("external")}
          className={`flex items-center gap-1 rounded-r-md px-2 py-1 text-[10px] transition-colors ${linkType === "external" ? "bg-primary text-primary-content" : "text-neutral-content hover:bg-neutral"}`}
        >
          <MdLink className="size-3" />
          URL
        </button>
      </div>

      {/* Input */}
      {linkType === "external" ? (
        <>
          <input
            type="text"
            autoFocus
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="min-w-0 flex-1 rounded-md border border-base-300 bg-base-100 px-2 py-1 text-xs text-base-content outline-none placeholder:text-neutral-content focus:border-ring focus:ring-1 focus:ring-ring"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === "Enter" && url) { e.preventDefault(); applyLink(url, url); } }}
          />
          <button
            onClick={e => { e.stopPropagation(); if (url) applyLink(url, url); }}
            className="shrink-0 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-content hover:bg-primary/90"
          >
            Insert
          </button>
        </>
      ) : (
        <div role="presentation" onClick={e => e.stopPropagation()} className="min-w-[200px]">
          <PageSelector onPagePick={(page) => applyLink(`ref:${page.id}`, page.displayName)} pickerMode={true} className="w-full" />
        </div>
      )}
    </div>
  );
}
