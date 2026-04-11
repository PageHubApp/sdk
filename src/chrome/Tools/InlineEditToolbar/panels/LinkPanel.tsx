import { Editor } from "@tiptap/react";
import { useLayoutEffect, useState } from "react";
import { MdLink, MdLinkOff } from "react-icons/md";
import { TbFile, TbX } from "react-icons/tb";
import { PageSelector } from "../../../Viewport/PageSelector";

interface LinkPanelProps {
  editor: Editor;
  onClose: () => void;
  onSave?: () => void;
}

export function LinkPanel({ editor, onClose, onSave }: LinkPanelProps) {
  const [linkType, setLinkType] = useState<"external" | "page">("page");
  const [url, setUrl] = useState("");
  const [savedSelection, setSavedSelection] = useState<{ from: number; to: number } | null>(null);
  const [editingExistingLink, setEditingExistingLink] = useState(false);

  // Run once on mount to capture the current selection/link state.
  // Intentionally empty deps — editor reference changes on blur would wipe savedSelection mid-flow.
  useLayoutEffect(() => {
    if (!editor) return;

    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").run();
      const { from, to } = editor.state.selection;
      setSavedSelection({ from, to });
      const href = String(editor.getAttributes("link").href ?? "");
      setUrl(href);
      setLinkType(href.startsWith("ref:") ? "page" : "external");
      setEditingExistingLink(true);
      return;
    }

    setEditingExistingLink(false);
    setUrl("");
    const { from, to } = editor.state.selection;
    if (from !== to) {
      setSavedSelection({ from, to });
    } else {
      setSavedSelection(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyLink = (href: string, fallbackText: string) => {
    if (!href) return;

    if (editor.isActive("link")) {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
      setSavedSelection(null);
      onSave?.();
      return;
    }

    const selection = savedSelection || editor.state.selection;
    const { from, to } = selection;

    if (from !== to) {
      editor.chain().focus().setTextSelection({ from, to }).setLink({ href }).run();
    } else {
      const startPos = editor.state.selection.from;
      editor
        .chain()
        .focus()
        .insertContent(fallbackText + " ")
        .setTextSelection({ from: startPos, to: startPos + fallbackText.length })
        .setLink({ href })
        .run();
    }
    setSavedSelection(null);
    onSave?.();
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onSave?.();
    onClose();
  };

  return (
    <div className="flex items-center gap-1.5 p-2">
      {/* Type toggle */}
      <div className="flex shrink-0 items-center rounded-md border border-base-300">
        <button
          type="button"
          onClick={() => setLinkType("page")}
          className={`flex items-center gap-1 rounded-l-md px-2 py-1.5 text-xs transition-colors ${linkType === "page" ? "bg-primary text-primary-content" : "text-neutral-content hover:bg-base-200"}`}
        >
          <TbFile className="size-3.5" />
          Page
        </button>
        <button
          type="button"
          onClick={() => setLinkType("external")}
          className={`flex items-center gap-1 rounded-r-md px-2 py-1.5 text-xs transition-colors ${linkType === "external" ? "bg-primary text-primary-content" : "text-neutral-content hover:bg-base-200"}`}
        >
          <MdLink className="size-3.5" />
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
            className="min-w-0 flex-1 rounded-md border border-base-300 bg-base-100 px-2 py-1.5 text-xs text-base-content outline-none placeholder:text-neutral-content focus:border-ring focus:ring-1 focus:ring-ring"
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              if (e.key === "Enter" && url) {
                e.preventDefault();
                applyLink(url, url);
              }
            }}
          />
          <button
            onClick={e => {
              e.stopPropagation();
              if (url) applyLink(url, url);
            }}
            className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs text-primary-content hover:bg-primary/90"
          >
            {editingExistingLink ? "Update" : "Insert"}
          </button>
        </>
      ) : (
        <div role="presentation" onClick={e => e.stopPropagation()} className="min-w-[160px]">
          <PageSelector
            onPagePick={page => {
              const href = `ref:${page.id}`;
              applyLink(href, page.displayName);
              setUrl(href);
              setEditingExistingLink(true);
            }}
            pickerMode={true}
            className="w-full"
            selectedPageId={url.startsWith("ref:") ? url.replace("ref:", "") : undefined}
          />
        </div>
      )}

      {/* Remove link — only when editing an existing link */}
      {editingExistingLink && (
        <button
          type="button"
          aria-label="Remove link"
          onClick={removeLink}
          className="tool-button shrink-0 !h-7 !w-7 !p-0 text-error hover:bg-error/10"
        >
          <MdLinkOff />
        </button>
      )}

      <button type="button" aria-label="Close" onClick={onClose} className="tool-button shrink-0 !h-7 !w-7 !p-0">
        <TbX />
      </button>
    </div>
  );
}
