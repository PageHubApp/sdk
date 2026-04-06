import { Editor } from "@tiptap/react";
import { ROOT_NODE, useEditor as useCraftEditor } from "@craftjs/core";
import { useEffect, useState } from "react";
import { MdFontDownload } from "react-icons/md";
import { TbChevronDown } from "react-icons/tb";
import { FixedSizeList as List } from "react-window";
import { Tooltip } from "components/layout/Tooltip";
import { fonts } from "utils/tailwind";
import { ItemToggle } from "../../Toolbar/Helpers/ItemSelector";
import { ToolbarPortalDropdown } from "../ToolbarPortalDropdown";

interface FontPickerDropdownProps {
  editor: Editor;
  handleButtonClick: (cb: () => void) => (e: React.MouseEvent) => void;
}

export function FontPickerDropdown({ editor, handleButtonClick }: FontPickerDropdownProps) {
  const { query } = useCraftEditor();
  const [fontSearchTerm, setFontSearchTerm] = useState("");
  const [allFontFamilies, setAllFontFamilies] = useState<string[][]>(fonts);
  const [loadingFonts, setLoadingFonts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All Fonts");
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  const [originalFont, setOriginalFont] = useState<string | null>(null);

  const fontCategories: Record<string, string[][]> = {
    Popular: allFontFamilies.slice(0, 20),
    Serif: allFontFamilies.filter(f => /serif|times|georgia|garamond|baskerville/i.test(f[0])),
    "Sans Serif": allFontFamilies.filter(f => /sans|helvetica|arial|roboto|open sans/i.test(f[0])),
    Display: allFontFamilies.filter(f => /display|impact|oswald|bebas/i.test(f[0])),
    Handwriting: allFontFamilies.filter(f => /script|hand|cursive|brush/i.test(f[0])),
    Monospace: allFontFamilies.filter(f => /mono|code|courier|consolas/i.test(f[0])),
    "All Fonts": allFontFamilies,
  };

  const filteredFonts = (fontCategories[selectedCategory] || allFontFamilies).filter(
    f => !fontSearchTerm || f[0].toLowerCase().includes(fontSearchTerm.toLowerCase())
  );

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
        setLoadingFonts(true);
        const googleFonts = await fetchGoogleFonts();
        const popular = getPopularFonts();
        const funky = getFunkyFonts();
        const others = googleFonts.filter(f => !popular.includes(f.family) && !funky.includes(f.family)).map(f => [f.family]).sort((a, b) => a[0].localeCompare(b[0]));
        setAllFontFamilies([...popular.map(f => [f]), ...funky.filter(f => !popular.includes(f)).map(f => [f]), ...others]);
      } catch { setAllFontFamilies(fonts); } finally { setLoadingFonts(false); }
    })();
  }, []);

  // Typography presets from design system
  const rootNode = query.node(ROOT_NODE).get();
  const typography = (rootNode?.data?.props as Record<string, unknown>)?.typography as Array<Record<string, string>> || [];

  return (
    <>
      {/* Typography Presets */}
      <ToolbarPortalDropdown
        trigger={
          <Tooltip content="Typography Presets" placement="top" tooltipClassName="text-xs! px-2! py-1!">
            <button className="tool-button">
              <MdFontDownload className="size-5" />
              <span className="text-xs">Styles</span>
              <TbChevronDown className="size-3" />
            </button>
          </Tooltip>
        }
      >
        <div className="ph-panel w-fit min-w-48 p-2">
          <div className="flex flex-col gap-1">
            {typography.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">No typography styles defined in Design System</div>
            ) : (
              typography.map((font, index) => {
                const className = `ph-${font.name.replace(/([A-Z])/g, "-$1").replace(/\s+/g, "-").toLowerCase().replace(/^-/, "")}`;
                return (
                  <button
                    key={index}
                    onClick={handleButtonClick(async () => {
                      if (font.fontFamily) {
                        const { loadGoogleFont } = await import("utils/fonts/googleFonts");
                        await loadGoogleFont(font.fontFamily, [font.fontWeight || "400"]);
                      }
                      editor.chain().focus().setMark("textStyle", { class: className }).run();
                    })}
                    className="group/item flex flex-col items-start rounded-lg border border-transparent px-3 py-2 text-left transition-all duration-150 hover:border-primary/20 hover:bg-accent/50"
                    style={{ fontFamily: font.fontFamily, fontSize: "14px" }}
                  >
                    <span className="text-sm font-medium text-foreground">{font.name}</span>
                    <span className="text-xs text-muted-foreground">{font.fontFamily} • {font.fontSize}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </ToolbarPortalDropdown>

      {/* Font Picker */}
      <ToolbarPortalDropdown
        trigger={
          <Tooltip content="Font" placement="top" tooltipClassName="text-xs! px-2! py-1!">
            <button className="tool-button">
              <MdFontDownload className="size-5" />
              <span className="text-xs">Font</span>
              <TbChevronDown className="size-3" />
            </button>
          </Tooltip>
        }
      >
        <div className="ph-panel w-fit min-w-32 p-2">
          <div className="flex h-[250px] w-96 gap-4 rounded-lg bg-card/50 backdrop-blur-sm">
            {/* Font list */}
            <div className="flex flex-1 flex-col">
              <div className="mb-2 flex gap-2">
                <input type="text" placeholder="Search fonts..." value={fontSearchTerm}
                  onChange={e => setFontSearchTerm(e.target.value)}
                  className="input flex-1 px-3! py-2! placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring"
                  onClick={e => e.stopPropagation()} />
                <ItemToggle
                  items={Object.keys(fontCategories).map(c => ({ id: c, content: `${c} (${(fontCategories[c] || []).length})`, icon: "" }))}
                  selected={selectedCategory} onChange={c => setSelectedCategory(c)} option={true} />
              </div>
              <div className="ph-panel-inset flex-1 overflow-hidden">
                {loadingFonts ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading fonts...</div>
                ) : (
                  <List height={200} itemCount={filteredFonts.length} itemSize={32} width="100%">
                    {({ index, style }) => {
                      const font = filteredFonts[index];
                      if (!font) return null;
                      return (
                        <div style={style}>
                          <button
                            onClick={handleButtonClick(async () => {
                              const { loadGoogleFont } = await import("utils/fonts/googleFonts");
                              await loadGoogleFont(font[0], ["400", "700"]);
                              editor.chain().focus().setFontFamily(font[0]).run();
                              setFontSearchTerm("");
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
                            className="w-full truncate whitespace-nowrap border-b border-border px-4 py-2 text-left text-sm text-muted-foreground transition-all duration-150 last:border-b-0 hover:bg-accent/50 hover:text-accent-foreground"
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

            {/* Right column — heading level, font size, colors */}
            <div className="flex w-32 shrink-0 flex-col">
              <div className="mb-3">
                <select
                  onChange={e => {
                    const v = e.target.value;
                    if (v === "paragraph") editor.chain().focus().setParagraph().run();
                    else { const level = parseInt(v.replace("heading", "")) as 1 | 2 | 3 | 4 | 5 | 6; editor.chain().focus().toggleHeading({ level }).run(); }
                  }}
                  value={
                    editor.isActive("paragraph") ? "paragraph"
                    : editor.isActive("heading", { level: 1 }) ? "heading1"
                    : editor.isActive("heading", { level: 2 }) ? "heading2"
                    : editor.isActive("heading", { level: 3 }) ? "heading3"
                    : editor.isActive("heading", { level: 4 }) ? "heading4"
                    : "paragraph"
                  }
                  className="input-dialog-md w-full text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring"
                >
                  <option value="paragraph">Normal Text</option>
                  <option value="heading1">Heading 1</option>
                  <option value="heading2">Heading 2</option>
                  <option value="heading3">Heading 3</option>
                  <option value="heading4">Heading 4</option>
                </select>
              </div>

              <div className="mb-3">
                <div className="mb-2 text-xs text-muted-foreground">Font Size</div>
                <div className="flex items-center gap-2">
                  {[{ label: "S", size: "12px" }, { label: "M", size: "16px" }, { label: "L", size: "20px" }, { label: "XL", size: "24px" }].map(s => (
                    <button key={s.label} onClick={handleButtonClick(() => editor.chain().focus().setFontSize(s.size).run())}
                      className="rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground">
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ToolbarPortalDropdown>
    </>
  );
}
