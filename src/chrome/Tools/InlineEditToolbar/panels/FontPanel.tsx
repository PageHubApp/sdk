import { Editor } from "@tiptap/react";
import { useEffect, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { fonts } from "utils/tailwind";

interface FontPanelProps {
  editor: Editor;
  onAction: (cb: () => void) => (e: React.MouseEvent) => void;
}

const CATEGORIES: Record<string, (f: string[][]) => string[][]> = {
  Popular: f => f.slice(0, 20),
  Serif: f => f.filter(x => /serif|times|georgia|garamond|baskerville/i.test(x[0])),
  "Sans Serif": f => f.filter(x => /sans|helvetica|arial|roboto|open sans/i.test(x[0])),
  Display: f => f.filter(x => /display|impact|oswald|bebas/i.test(x[0])),
  Handwriting: f => f.filter(x => /script|hand|cursive|brush/i.test(x[0])),
  Monospace: f => f.filter(x => /mono|code|courier|consolas/i.test(x[0])),
  "All Fonts": f => f,
};

export function FontPanel({ editor, onAction }: FontPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [allFonts, setAllFonts] = useState<string[][]>(fonts);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All Fonts");
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  const [originalFont, setOriginalFont] = useState<string | null>(null);

  useEffect(() => {
    if (!originalFont && previewFont) {
      editor.chain().focus().setFontFamily("inherit").run();
      setPreviewFont(null);
    }
  }, [originalFont, previewFont, editor]);

  useEffect(() => {
    (async () => {
      try {
        const { fetchGoogleFonts, getPopularFonts, getFunkyFonts } = await import("utils/fonts/googleFonts");
        setLoading(true);
        const googleFonts = await fetchGoogleFonts();
        const popular = getPopularFonts();
        const funky = getFunkyFonts();
        const others = googleFonts
          .filter(f => !popular.includes(f.family) && !funky.includes(f.family))
          .map(f => [f.family])
          .sort((a, b) => a[0].localeCompare(b[0]));
        setAllFonts([
          ...popular.map(f => [f]),
          ...funky.filter(f => !popular.includes(f)).map(f => [f]),
          ...others,
        ]);
      } catch {
        setAllFonts(fonts);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filterFn = CATEGORIES[category] || CATEGORIES["All Fonts"];
  const filtered = filterFn(allFonts).filter(
    f => !searchTerm || f[0].toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-w-[480px] p-3">
      {/* Search + heading + size */}
      <div className="mb-2 flex items-center gap-2">
        <input
          type="text"
          placeholder="Search fonts..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onClick={e => e.stopPropagation()}
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <select
          onChange={e => {
            const v = e.target.value;
            if (v === "paragraph") editor.chain().focus().setParagraph().run();
            else {
              const level = parseInt(v.replace("heading", "")) as 1 | 2 | 3 | 4 | 5 | 6;
              editor.chain().focus().toggleHeading({ level }).run();
            }
          }}
          value={
            editor.isActive("paragraph") ? "paragraph"
            : editor.isActive("heading", { level: 1 }) ? "heading1"
            : editor.isActive("heading", { level: 2 }) ? "heading2"
            : editor.isActive("heading", { level: 3 }) ? "heading3"
            : editor.isActive("heading", { level: 4 }) ? "heading4"
            : "paragraph"
          }
          className="w-auto shrink-0 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground outline-none"
        >
          <option value="paragraph">Normal</option>
          <option value="heading1">H1</option>
          <option value="heading2">H2</option>
          <option value="heading3">H3</option>
          <option value="heading4">H4</option>
        </select>
        <div className="flex shrink-0 items-center rounded-md border border-border">
          {[
            { label: "S", size: "12px" },
            { label: "M", size: "16px" },
            { label: "L", size: "20px" },
            { label: "XL", size: "24px" },
          ].map(s => (
            <button
              key={s.label}
              onClick={onAction(() => editor.chain().focus().setFontSize(s.size).run())}
              className="px-1.5 py-1 text-xs text-muted-foreground transition-colors first:rounded-l-md last:rounded-r-md hover:bg-muted hover:text-foreground"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category pills */}
      <div className="mb-2 flex gap-1 whitespace-nowrap">
        {Object.keys(CATEGORIES).map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] transition-colors ${category === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Font list */}
      <div className="ph-panel-inset overflow-hidden rounded-md">
        {loading ? (
          <div className="flex h-[140px] items-center justify-center text-xs text-muted-foreground">Loading fonts...</div>
        ) : (
          <List height={140} itemCount={filtered.length} itemSize={28} width="100%">
            {({ index, style }) => {
              const font = filtered[index];
              if (!font) return null;
              return (
                <div style={style}>
                  <button
                    onClick={onAction(async () => {
                      const { loadGoogleFont } = await import("utils/fonts/googleFonts");
                      await loadGoogleFont(font[0], ["400", "700"]);
                      editor.chain().focus().setFontFamily(font[0]).run();
                      setSearchTerm("");
                    })}
                    onMouseEnter={async () => {
                      const { loadGoogleFont } = await import("utils/fonts/googleFonts");
                      loadGoogleFont(font[0], ["400"]);
                      if (!originalFont) setOriginalFont(editor.getAttributes("textStyle").fontFamily || "inherit");
                      setPreviewFont(font[0]);
                      editor.chain().focus().setFontFamily(font[0]).run();
                    }}
                    onMouseLeave={() => {
                      if (originalFont) editor.chain().focus().setFontFamily(originalFont).run();
                      setPreviewFont(null);
                    }}
                    className="w-full truncate px-2 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-accent-foreground"
                    style={{ fontFamily: font[0] }}
                  >
                    {font[0]}
                  </button>
                </div>
              );
            }}
          </List>
        )}
      </div>
    </div>
  );
}
