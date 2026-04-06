import { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { MdLink } from "react-icons/md";
import { PageSelector } from "../../Viewport/PageSelector";

interface LinkSelectorProps {
  editor: Editor;
}

export function LinkSelector({ editor }: LinkSelectorProps) {
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

  const handlePagePick = (page: { id: string; displayName: string; isHomePage: boolean }) => {
    applyLink(`ref:${page.id}`, page.displayName);
  };

  const handleExternalLink = () => {
    if (url) applyLink(url, url);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setLinkType("page")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs transition-colors ${linkType === "page" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}

        >
          Internal Page
        </button>
        <button
          type="button"
          onClick={() => setLinkType("external")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs transition-colors ${linkType === "external" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}

        >
          <MdLink className="mr-1 inline" />
          External URL
        </button>
      </div>

      {linkType === "external" ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="input-dialog w-full text-sm text-muted-foreground placeholder:text-muted-foreground"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={e => { e.stopPropagation(); handleExternalLink(); }}
            className="btn-primary w-fit"
  
          >
            Insert
          </button>
        </div>
      ) : (
        <div role="presentation" onClick={e => e.stopPropagation()}>
          <PageSelector onPagePick={handlePagePick} pickerMode={true} className="w-full" />
        </div>
      )}
    </div>
  );
}
