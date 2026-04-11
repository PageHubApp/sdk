import { ROOT_NODE, useEditor as useCraftEditor } from "@craftjs/core";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { TbCheck, TbChevronDown, TbX } from "react-icons/tb";
import { FixedSizeList as List } from "react-window";
import { resolveTheme } from "../../../../utils/design/resolveTheme";
import { fonts } from "utils/tailwind";

interface FontPanelProps {
  editor: Editor;
  onAction: (cb: () => void) => (e: React.MouseEvent) => void;
  onClose: () => void;
}

const HEADING_OPTIONS = [
  { value: "paragraph", label: "Normal" },
  { value: "heading1", label: "H1" },
  { value: "heading2", label: "H2" },
  { value: "heading3", label: "H3" },
  { value: "heading4", label: "H4" },
];

const CATEGORIES: Record<string, (f: string[][]) => string[][]> = {
  Popular: f => f.slice(0, 20),
  Serif: f => f.filter(x => /serif|times|georgia|garamond|baskerville/i.test(x[0])),
  "Sans Serif": f => f.filter(x => /sans|helvetica|arial|roboto|open sans/i.test(x[0])),
  Display: f => f.filter(x => /display|impact|oswald|bebas/i.test(x[0])),
  Handwriting: f => f.filter(x => /script|hand|cursive|brush/i.test(x[0])),
  Monospace: f => f.filter(x => /mono|code|courier|consolas/i.test(x[0])),
  "All Fonts": f => f,
};

export function FontPanel({ editor, onAction, onClose }: FontPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [allFonts, setAllFonts] = useState<string[][]>(fonts);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All Fonts");
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  const [originalFont, setOriginalFont] = useState<string | null>(null);
  const committedRef = useRef(false);

  const { query } = useCraftEditor();
  const rootNode = query.node(ROOT_NODE).get();
  const typography = (resolveTheme(rootNode?.data?.props || {}).typography || []) as Array<Record<string, string>>;

  const activeFont = editor.getAttributes("textStyle").fontFamily || null;

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
    <div className="min-w-[460px] p-2.5">
      {/* Typography presets */}
      {typography.length > 0 && (
        <>
          <div className="mb-2 flex flex-wrap gap-1">
            {typography.map((style, index) => {
              const className = `ph-${style.name.replace(/([A-Z])/g, "-$1").replace(/\s+/g, "-").toLowerCase().replace(/^-/, "")}`;
              return (
                <button
                  key={index}
                  onClick={onAction(async () => {
                    if (style.fontFamily) {
                      const { loadGoogleFont } = await import("utils/fonts/googleFonts");
                      await loadGoogleFont(style.fontFamily, [style.fontWeight || "400"]);
                    }
                    editor.chain().focus().setMark("textStyle", { class: className }).run();
                  })}
                  className="flex items-center gap-1.5 rounded-md border border-base-300 px-2 py-1 transition-colors hover:bg-base-200"
                  style={{ fontFamily: style.fontFamily }}
                >
                  <span className="text-xs font-medium text-base-content">{style.name}</span>
                  {style.fontFamily && (
                    <span className="text-[10px] text-neutral-content">{style.fontFamily}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mb-2.5 h-px bg-base-300" />
        </>
      )}

      {/* Search + controls + close — all one row */}
      <div className="mb-2 flex items-center gap-1.5">
        <input
          type="text"
          placeholder="Search fonts..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onClick={e => e.stopPropagation()}
          className="min-w-0 flex-1 rounded-md border border-base-300 bg-base-100 px-2 py-1.5 text-xs text-base-content outline-none placeholder:text-neutral-content focus:border-ring focus:ring-1 focus:ring-ring"
        />
        <Listbox
          value={
            editor.isActive("paragraph") ? "paragraph"
            : editor.isActive("heading", { level: 1 }) ? "heading1"
            : editor.isActive("heading", { level: 2 }) ? "heading2"
            : editor.isActive("heading", { level: 3 }) ? "heading3"
            : editor.isActive("heading", { level: 4 }) ? "heading4"
            : "paragraph"
          }
          onChange={val => {
            if (val === "paragraph") editor.chain().focus().setParagraph().run();
            else {
              const level = parseInt(val.replace("heading", "")) as 1 | 2 | 3 | 4 | 5 | 6;
              editor.chain().focus().toggleHeading({ level }).run();
            }
          }}
        >
          <ListboxButton className="flex w-auto shrink-0 items-center gap-1 rounded-md border border-base-300 bg-base-100 px-2 py-1.5 text-xs text-neutral-content outline-none hover:bg-base-200 aria-expanded:bg-base-200">
            {({ value }) => (
              <>
                <span>{HEADING_OPTIONS.find(o => o.value === value)?.label ?? "Normal"}</span>
                <TbChevronDown className="size-3 opacity-50" />
              </>
            )}
          </ListboxButton>
          <ListboxOptions anchor="bottom start" className="pagehub-sdk-root ph-select-content" modal={false}>
            {HEADING_OPTIONS.map(o => (
              <ListboxOption key={o.value} value={o.value} className="ph-select-item">
                {o.label}
              </ListboxOption>
            ))}
          </ListboxOptions>
        </Listbox>
        <div className="flex shrink-0 items-center rounded-md border border-base-300">
          {[
            { label: "S", size: "12px" },
            { label: "M", size: "16px" },
            { label: "L", size: "20px" },
            { label: "XL", size: "24px" },
          ].map(s => (
            <button
              key={s.label}
              onClick={onAction(() => editor.chain().focus().setFontSize(s.size).run())}
              className="px-1.5 py-1.5 text-xs text-neutral-content transition-colors first:rounded-l-md last:rounded-r-md hover:bg-base-200 hover:text-base-content"
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="tool-button shrink-0 !h-7 !w-7 !p-0"
        >
          <TbX />
        </button>
      </div>

      {/* Category tabs */}
      <div className="mb-2 flex gap-0.5 whitespace-nowrap">
        {Object.keys(CATEGORIES).map(c => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`shrink-0 rounded-md px-2 py-1 text-xs transition-colors ${category === c ? "bg-primary text-primary-content" : "text-neutral-content hover:bg-base-200 hover:text-base-content"}`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Font list */}
      <div className="ph-panel-inset overflow-hidden rounded-md">
        {loading ? (
          <div className="flex h-[200px] items-center justify-center text-xs text-neutral-content">Loading fonts…</div>
        ) : (
          <List height={200} itemCount={filtered.length} itemSize={40} width="100%">
            {({ index, style }) => {
              const font = filtered[index];
              if (!font) return null;
              const isActive = activeFont === font[0];
              return (
                <div style={style}>
                  <button
                    onClick={onAction(() => {
                      committedRef.current = true;
                      editor.chain().focus().setFontFamily(font[0]).run();
                      import("utils/fonts/googleFonts").then(({ loadGoogleFont }) => {
                        loadGoogleFont(font[0], ["400", "700"]);
                      });
                      setOriginalFont(null);
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
                      if (!committedRef.current && originalFont) editor.chain().focus().setFontFamily(originalFont).run();
                      committedRef.current = false;
                      setPreviewFont(null);
                    }}
                    className={`flex h-full w-full items-center gap-2 px-2 text-left transition-colors hover:bg-base-200 ${isActive ? "bg-base-200/60" : ""}`}
                  >
                    <span className="flex-1 truncate text-sm text-base-content" style={{ fontFamily: font[0] }}>
                      {font[0]}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-content/40" style={{ fontFamily: font[0] }}>
                      Aa
                    </span>
                    {isActive && <TbCheck className="size-3.5 shrink-0 text-primary" />}
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
