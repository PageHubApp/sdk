import { ROOT_NODE } from "@craftjs/utils";
import { useEditor as useCraftEditor } from "@craftjs/core";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { TbCheck, TbChevronDown, TbX } from "react-icons/tb";
import { FixedSizeList as List } from "react-window";
import { resolveTheme } from "@/utils/design/resolveTheme";
import { fonts } from "@/utils/tailwind";
import type { PagehubTextRichMode } from "@/core/tiptapExtensions/pagehubTextTiptapExtensions";

interface FontPanelProps {
  editor: Editor;
  richTextMode?: PagehubTextRichMode;
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

export function FontPanel({ editor, richTextMode = "full", onAction, onClose }: FontPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [allFonts, setAllFonts] = useState<string[][]>(fonts);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("All Fonts");
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  const [originalFont, setOriginalFont] = useState<string | null>(null);
  const committedRef = useRef(false);

  const { query } = useCraftEditor();
  const rootNode = query.node(ROOT_NODE).get();
  const typography = (resolveTheme(rootNode?.data?.props || {}).typography || []) as Array<
    Record<string, string>
  >;

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
        const { fetchGoogleFonts, getPopularFonts, getFunkyFonts } =
          await import("@/utils/fonts/googleFonts");
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
              const className = `ph-${style.name
                .replace(/([A-Z])/g, "-$1")
                .replace(/\s+/g, "-")
                .toLowerCase()
                .replace(/^-/, "")}`;
              return (
                <button
                  key={index}
                  onClick={onAction(async () => {
                    if (style.fontFamily) {
                      const { loadGoogleFont } = await import("@/utils/fonts/googleFonts");
                      await loadGoogleFont(style.fontFamily, [style.fontWeight || "400"]);
                    }
                    editor.chain().focus().setMark("textStyle", { class: className }).run();
                  })}
                  className="border-base-300 hover:bg-base-200 flex items-center gap-1.5 rounded-md border px-2 py-1 transition-colors"
                  style={{ fontFamily: style.fontFamily }}
                >
                  <span className="text-base-content text-xs font-medium">{style.name}</span>
                  {style.fontFamily && (
                    <span className="text-neutral-content text-[10px]">{style.fontFamily}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="bg-base-300 mb-2.5 h-px" />
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
          className="border-base-300 bg-base-100 text-base-content placeholder:text-neutral-content focus:border-ring focus:ring-ring min-w-0 flex-1 rounded-md border px-2 py-1.5 text-xs outline-none focus:ring-1"
        />
        {richTextMode !== "inline" && (
          <Listbox
            value={
              editor.isActive("paragraph")
                ? "paragraph"
                : editor.isActive("heading", { level: 1 })
                  ? "heading1"
                  : editor.isActive("heading", { level: 2 })
                    ? "heading2"
                    : editor.isActive("heading", { level: 3 })
                      ? "heading3"
                      : editor.isActive("heading", { level: 4 })
                        ? "heading4"
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
            <ListboxButton className="border-base-300 bg-base-100 text-neutral-content hover:bg-base-200 aria-expanded:bg-base-200 flex w-auto shrink-0 items-center gap-1 rounded-md border px-2 py-1.5 text-xs outline-none">
              {({ value }) => (
                <>
                  <span>{HEADING_OPTIONS.find(o => o.value === value)?.label ?? "Normal"}</span>
                  <TbChevronDown className="size-3 opacity-50" />
                </>
              )}
            </ListboxButton>
            <ListboxOptions
              anchor="bottom start"
              className="pagehub-sdk-root ph-select-content"
              modal={false}
            >
              {HEADING_OPTIONS.map(o => (
                <ListboxOption key={o.value} value={o.value} className="ph-select-item">
                  {o.label}
                </ListboxOption>
              ))}
            </ListboxOptions>
          </Listbox>
        )}
        <div className="border-base-300 flex shrink-0 items-center rounded-md border">
          {[
            { label: "S", size: "12px" },
            { label: "M", size: "16px" },
            { label: "L", size: "20px" },
            { label: "XL", size: "24px" },
          ].map(s => (
            <button
              key={s.label}
              onClick={onAction(() => editor.chain().focus().setFontSize(s.size).run())}
              className="text-neutral-content hover:bg-base-200 hover:text-base-content px-1.5 py-1.5 text-xs transition-colors first:rounded-l-md last:rounded-r-md"
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="tool-button !h-7 !w-7 shrink-0 !p-0"
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
          <div className="text-neutral-content flex h-[200px] items-center justify-center text-xs">
            Loading fonts…
          </div>
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
                      import("@/utils/fonts/googleFonts").then(({ loadGoogleFont }) => {
                        loadGoogleFont(font[0], ["400", "700"]);
                      });
                      setOriginalFont(null);
                      setSearchTerm("");
                    })}
                    onMouseEnter={async () => {
                      const { loadGoogleFont } = await import("@/utils/fonts/googleFonts");
                      loadGoogleFont(font[0], ["400"]);
                      if (!originalFont)
                        setOriginalFont(editor.getAttributes("textStyle").fontFamily || "inherit");
                      setPreviewFont(font[0]);
                      editor.chain().focus().setFontFamily(font[0]).run();
                    }}
                    onMouseLeave={() => {
                      if (!committedRef.current && originalFont)
                        editor.chain().focus().setFontFamily(originalFont).run();
                      committedRef.current = false;
                      setPreviewFont(null);
                    }}
                    className={`hover:bg-base-200 flex h-full w-full items-center gap-2 px-2 text-left transition-colors ${isActive ? "bg-base-200/60" : ""}`}
                  >
                    <span
                      className="text-base-content flex-1 truncate text-sm"
                      style={{ fontFamily: font[0] }}
                    >
                      {font[0]}
                    </span>
                    <span
                      className="text-neutral-content/40 shrink-0 text-xs"
                      style={{ fontFamily: font[0] }}
                    >
                      Aa
                    </span>
                    {isActive && <TbCheck className="text-primary size-3.5 shrink-0" />}
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
