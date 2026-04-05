// @ts-nocheck
import { ROOT_NODE, useEditor as useCraftEditor } from "@craftjs/core";
import { Editor } from "@tiptap/react";
import { Tooltip } from "components/layout/Tooltip";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { motion } from "framer-motion";
import { Tooltip as ReactTooltip } from "react-tooltip";
import React, { useEffect, useRef, useState } from "react";
import { useClampToViewport } from "../hooks/useClampToViewport";
import {
  MdFontDownload,
  MdFormatAlignCenter,
  MdFormatAlignLeft,
  MdFormatAlignRight,
  MdFormatBold,
  MdFormatIndentIncrease,
  MdFormatItalic,
  MdFormatLineSpacing,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatStrikethrough,
  MdFormatUnderlined,
  MdImage,
  MdLink,
  MdSubscript,
  MdSuperscript,
} from "react-icons/md";
import { TbChevronDown, TbEraser, TbVariable } from "react-icons/tb";
import { FixedSizeList as List } from "react-window";
import { useAtomState } from "@zedux/react";
import { getMediaContent } from "utils/lib";
import { isPaletteReference, paletteToCSSVar } from "utils/design/palette";
import { fonts } from "utils/tailwind";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { useSDK } from "../../context";
import { DeleteNodeButton } from "../NodeControllers/Tools/DeleteNodeButton";
import { ItemToggle } from "../Toolbar/Helpers/ItemSelector";
import { MediaManagerModal } from "../Toolbar/Inputs/media/MediaManagerModal";
import { ColorPickerAtom } from "../Toolbar/Tools/ColorPickerDialog";
import { PageSelector } from "../Viewport/PageSelector";
import { TextSettingsDropdown } from "./TextSettingsDropdown";
import { ToolbarPortalDropdown } from "./ToolbarPortalDropdown";

interface TiptapToolbarProps {
  editor: Editor | null;
  className?: string;
}

export const TiptapToolbar: React.FC<TiptapToolbarProps> = ({ editor, className = "" }) => {
  const [fontSearchTerm, setFontSearchTerm] = useState("");
  const [showMediaModal, setShowMediaModal] = useState(false);
  // Clamp toolbar bar within viewport bounds
  const toolbarRef = useClampToViewport<HTMLDivElement>();

  // Color picker state
  const [colorDialog, setColorDialog] = useAtomState(ColorPickerAtom);
  const backgroundColorButtonRef = useRef<HTMLButtonElement>(null);
  const foregroundColorButtonRef = useRef<HTMLButtonElement>(null);

  // Get Craft.js query for media operations
  const { query } = useCraftEditor();
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderTiptapAi = config.editorChromeSlots?.renderTiptapAiToolbar;

  // State for Google Fonts with categories
  const [allFontFamilies, setAllFontFamilies] = useState<string[][]>(fonts); // Start with legacy fonts
  const [loadingFonts, setLoadingFonts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("All Fonts");

  // State for font preview
  const [previewFont, setPreviewFont] = useState<string | null>(null);
  const [originalFont, setOriginalFont] = useState<string | null>(null);

  // Font categories
  const fontCategories = {
    Popular: allFontFamilies.slice(0, 20),
    Serif: allFontFamilies.filter(
      font =>
        font[0].toLowerCase().includes("serif") ||
        font[0].toLowerCase().includes("times") ||
        font[0].toLowerCase().includes("georgia") ||
        font[0].toLowerCase().includes("garamond") ||
        font[0].toLowerCase().includes("baskerville")
    ),
    "Sans Serif": allFontFamilies.filter(
      font =>
        font[0].toLowerCase().includes("sans") ||
        font[0].toLowerCase().includes("helvetica") ||
        font[0].toLowerCase().includes("arial") ||
        font[0].toLowerCase().includes("roboto") ||
        font[0].toLowerCase().includes("open sans")
    ),
    Display: allFontFamilies.filter(
      font =>
        font[0].toLowerCase().includes("display") ||
        font[0].toLowerCase().includes("impact") ||
        font[0].toLowerCase().includes("oswald") ||
        font[0].toLowerCase().includes("bebas")
    ),
    Handwriting: allFontFamilies.filter(
      font =>
        font[0].toLowerCase().includes("script") ||
        font[0].toLowerCase().includes("hand") ||
        font[0].toLowerCase().includes("cursive") ||
        font[0].toLowerCase().includes("brush")
    ),
    Monospace: allFontFamilies.filter(
      font =>
        font[0].toLowerCase().includes("mono") ||
        font[0].toLowerCase().includes("code") ||
        font[0].toLowerCase().includes("courier") ||
        font[0].toLowerCase().includes("consolas")
    ),
    "All Fonts": allFontFamilies,
  };

  // Filter fonts based on search term and category
  const filteredFonts = fontCategories[selectedCategory as keyof typeof fontCategories].filter(
    font => !fontSearchTerm || font[0].toLowerCase().includes(fontSearchTerm.toLowerCase())
  );

  // Cleanup preview when dropdown closes
  useEffect(() => {
    if (!originalFont && previewFont) {
      // If we have a preview but no original stored, restore to default
      editor.chain().focus().setFontFamily("inherit").run();
      setPreviewFont(null);
    }
  }, [originalFont, previewFont, editor]);

  // Load all Google Fonts on mount
  useEffect(() => {
    const loadAllFonts = async () => {
      try {
        // Dynamically import to avoid circular dependencies
        const { fetchGoogleFonts, getPopularFonts, getFunkyFonts } = await import(
          "utils/fonts/googleFonts"
        );

        setLoadingFonts(true);
        const googleFonts = await fetchGoogleFonts();

        // Organize: Popular first, then Funky, then all others
        const popular = getPopularFonts();
        const funky = getFunkyFonts();
        const others = googleFonts
          .filter(f => !popular.includes(f.family) && !funky.includes(f.family))
          .map(f => [f.family])
          .sort((a, b) => a[0].localeCompare(b[0]));

        const allFontsList = [
          ...popular.map(f => [f]),
          ...funky.filter(f => !popular.includes(f)).map(f => [f]),
          ...others,
        ];
        setAllFontFamilies(allFontsList);
      } catch (error) {
        console.error("Error loading Google Fonts:", error);
        // Fallback to legacy fonts
        setAllFontFamilies(fonts);
      } finally {
        setLoadingFonts(false);
      }
    };

    loadAllFonts();
  }, []);

  if (!editor) {
    return null;
  }

  const handleButtonClick = (callback: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  // Color picker functions
  const openBackgroundColorPicker = () => {
    if (backgroundColorButtonRef.current) {
      const rect = backgroundColorButtonRef.current.getBoundingClientRect();
      setColorDialog({
        enabled: true,
        value: editor?.getAttributes("highlight").color || "#ffff00",
        prefix: "bg",
        changed: (value: any) => {
          if (editor) {
            let colorValue: string;
            if (typeof value === "string") {
              colorValue = value;
            } else if (value && typeof value === "object" && value.value) {
              if (typeof value.value === "string") {
                colorValue = value.value;
              } else if (value.value.r !== undefined) {
                colorValue = `rgba(${value.value.r},${value.value.g},${value.value.b},${value.value.a})`;
              } else {
                colorValue = String(value.value);
              }
            } else {
              colorValue = String(value);
            }

            // Convert palette references to CSS variables
            if (isPaletteReference(colorValue)) {
              colorValue = paletteToCSSVar(colorValue);
            }

            editor.chain().focus().setHighlight({ color: colorValue }).run();
          }
        },
        showPallet: true,
        e: rect,
        propKey: "backgroundColor",
      });
    }
  };

  const openForegroundColorPicker = () => {
    if (foregroundColorButtonRef.current) {
      const rect = foregroundColorButtonRef.current.getBoundingClientRect();
      setColorDialog({
        enabled: true,
        value: editor?.getAttributes("textStyle").color || "#000000",
        prefix: "text",
        changed: (value: any) => {
          if (editor) {
            let colorValue: string;
            if (typeof value === "string") {
              colorValue = value;
            } else if (value && typeof value === "object" && value.value) {
              if (typeof value.value === "string") {
                colorValue = value.value;
              } else if (value.value.r !== undefined) {
                colorValue = `rgba(${value.value.r},${value.value.g},${value.value.b},${value.value.a})`;
              } else {
                colorValue = String(value.value);
              }
            } else {
              colorValue = String(value);
            }

            // Convert palette references to CSS variables
            if (isPaletteReference(colorValue)) {
              colorValue = paletteToCSSVar(colorValue);
            }

            editor.chain().focus().setColor(colorValue).run();
          }
        },
        showPallet: true,
        e: rect,
        propKey: "color",
      });
    }
  };

  return (
    <div className="absolute z-9999 w-full">
      <div ref={toolbarRef} className="tool-bg pointer-events-auto z-50 relative left-1/2 -translate-x-1/2 mt-2 flex h-10 w-fit flex-row items-center justify-center gap-0 font-sans">
        {isAiEnabled && renderTiptapAi && <>{renderTiptapAi({ editor, query })}</>}

        {/* Bold */}
        <Tooltip content="Bold (⌘B)" placement="top" tooltipClassName="text-xs! px-2! py-1!">
          <motion.button
            onClick={handleButtonClick(() => editor.chain().focus().toggleBold().run())}
            className={`tool-button ${editor.isActive("bold") ? "bg-muted text-foreground" : ""}`}
            whileTap={{ scale: 0.9 }}
          >
            <MdFormatBold className="size-4" />
          </motion.button>
        </Tooltip>

        {/* Italic */}
        <Tooltip content="Italic (⌘I)" placement="top" tooltipClassName="text-xs! px-2! py-1!">
          <motion.button
            onClick={handleButtonClick(() => editor.chain().focus().toggleItalic().run())}
            className={`tool-button ${editor.isActive("italic") ? "bg-muted text-foreground" : ""}`}
            whileTap={{ scale: 0.9 }}
          >
            <MdFormatItalic className="size-4" />
          </motion.button>
        </Tooltip>

        {/* Underline */}
        <Tooltip content="Underline (⌘U)" placement="top" tooltipClassName="text-xs! px-2! py-1!">
          <motion.button
            onClick={handleButtonClick(() => editor.chain().focus().toggleUnderline().run())}
            className={`tool-button ${editor.isActive("underline") ? "bg-muted text-foreground" : ""}`}
            whileTap={{ scale: 0.9 }}
          >
            <MdFormatUnderlined className="size-4" />
          </motion.button>
        </Tooltip>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Typography Presets */}
        <ToolbarPortalDropdown
          trigger={
            <Tooltip content="Typography Presets" placement="top" tooltipClassName="text-xs! px-2! py-1!">
              <motion.button className="tool-button" whileTap={{ scale: 0.9 }}>
                <MdFontDownload className="size-4" />
                <span className="text-xs">Styles</span>
                <TbChevronDown className="size-3" />
              </motion.button>
            </Tooltip>
          }
        >
          <div className="w-fit min-w-48 rounded-lg border border-border bg-background p-2 shadow-xl">
            <div className="flex flex-col gap-1">
              {(() => {
                const rootNode = query.node(ROOT_NODE).get();
                const typography = rootNode?.data?.props?.typography || [];

                if (typography.length === 0) {
                  return (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No typography styles defined in Design System
                    </div>
                  );
                }

                return typography.map((font: any, index: number) => {
                  const toCSSVarName = (name: string): string => {
                    return name
                      .replace(/([A-Z])/g, "-$1")
                      .replace(/\s+/g, "-")
                      .toLowerCase()
                      .replace(/^-/, "");
                  };

                  const className = `ph-${toCSSVarName(font.name)}`;

                  return (
                    <button
                      key={index}
                      onClick={handleButtonClick(async () => {
                        if (font.fontFamily) {
                          const { loadGoogleFont } = await import("utils/fonts/googleFonts");
                          await loadGoogleFont(font.fontFamily, [font.fontWeight || "400"]);
                        }
                        editor
                          .chain()
                          .focus()
                          .setMark("textStyle", { class: className })
                          .run();
                      })}
                      className="group/item flex flex-col items-start rounded-lg border border-transparent px-3 py-2 text-left transition-all duration-150 hover:border-primary/20 hover:bg-accent/50"
                      style={{ fontFamily: font.fontFamily, fontSize: "14px" }}
                    >
                      <span className="text-sm font-medium text-foreground">{font.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {font.fontFamily} • {font.fontSize}
                      </span>
                    </button>
                  );
                });
              })()}
            </div>
          </div>
        </ToolbarPortalDropdown>

        {/* Font Picker */}
        <ToolbarPortalDropdown
          trigger={
            <Tooltip content="Font" placement="top" tooltipClassName="text-xs! px-2! py-1!">
              <motion.button className="tool-button" whileTap={{ scale: 0.9 }}>
                <MdFontDownload className="size-4" />
                <span className="text-xs">Font</span>
                <TbChevronDown className="size-3" />
              </motion.button>
            </Tooltip>
          }
        >
          <div className="w-fit min-w-32 rounded-lg border border-border bg-background p-2 shadow-xl">
            <div className="flex h-[250px] w-96 gap-4 rounded-lg bg-card/50 backdrop-blur-sm">
              <div className="flex flex-1 flex-col">
                <div className="mb-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search fonts..."
                      value={fontSearchTerm}
                      onChange={e => setFontSearchTerm(e.target.value)}
                      className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
                      onClick={e => e.stopPropagation()}
                    />
                    <ItemToggle
                      items={Object.keys(fontCategories).map(category => ({
                        id: category,
                        content: `${category} (${fontCategories[category as keyof typeof fontCategories].length})`,
                        icon: "",
                      }))}
                      selected={selectedCategory}
                      onChange={category => setSelectedCategory(category)}
                      option={true}
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-hidden rounded-lg border border-border bg-background shadow-sm">
                  {loadingFonts ? (
                    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Loading fonts...
                    </div>
                  ) : (
                    <List
                      height={200}
                      itemCount={filteredFonts.length}
                      itemSize={32}
                      width="100%"
                    >
                      {({ index, style }) => {
                        const font = filteredFonts[index];
                        if (!font) return null;
                        return (
                          <div style={style}>
                            <button
                              key={font[0]}
                              onClick={handleButtonClick(async () => {
                                const { loadGoogleFont } = await import("utils/fonts/googleFonts");
                                await loadGoogleFont(font[0], ["400", "700"]);
                                editor.chain().focus().setFontFamily(font[0]).run();
                                setFontSearchTerm("");
                              })}
                              onMouseEnter={async () => {
                                const { loadGoogleFont } = await import("utils/fonts/googleFonts");
                                loadGoogleFont(font[0], ["400"]);
                                if (!originalFont) {
                                  const currentFont = editor.getAttributes("textStyle").fontFamily;
                                  setOriginalFont(currentFont || "inherit");
                                }
                                setPreviewFont(font[0]);
                                editor.chain().focus().setFontFamily(font[0]).run();
                              }}
                              onMouseLeave={() => {
                                if (originalFont) {
                                  editor.chain().focus().setFontFamily(originalFont).run();
                                }
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

              <div className="flex w-32 shrink-0 flex-col">
                <div className="mb-3">
                  <select
                    onChange={e => {
                      const value = e.target.value;
                      if (value === "paragraph") {
                        editor.chain().focus().setParagraph().run();
                      } else {
                        const level = parseInt(value.replace("heading", "")) as 1 | 2 | 3 | 4 | 5 | 6;
                        editor.chain().focus().toggleHeading({ level }).run();
                      }
                    }}
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
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring"
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
                    {[
                      { label: "S", size: "12px" },
                      { label: "M", size: "16px" },
                      { label: "L", size: "20px" },
                      { label: "XL", size: "24px" },
                    ].map(s => (
                      <motion.button
                        key={s.label}
                        onClick={handleButtonClick(() => editor.chain().focus().setFontSize(s.size).run())}
                        className="rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                        title={s.label}
                        whileTap={{ scale: 0.9 }}
                      >
                        {s.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="mb-3 space-y-3 p-1.5">
                  <div>
                    <div className="mb-2 text-xs text-muted-foreground">Background Color</div>
                    <motion.button
                      ref={backgroundColorButtonRef}
                      onClick={handleButtonClick(openBackgroundColorPicker)}
                      className="h-8 w-full rounded-lg border-2 border-border transition-colors hover:border-border"
                      style={{ backgroundColor: editor.getAttributes("highlight").color || "#ffffff" }}
                      whileTap={{ scale: 0.9 }}
                    />
                  </div>
                  <div>
                    <div className="mb-2 text-xs text-muted-foreground">Text Color</div>
                    <motion.button
                      ref={foregroundColorButtonRef}
                      onClick={handleButtonClick(openForegroundColorPicker)}
                      className="h-8 w-full rounded-lg border-2 border-border transition-colors hover:border-border"
                      style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000000" }}
                      whileTap={{ scale: 0.9 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ToolbarPortalDropdown>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Link */}
        <ToolbarPortalDropdown
          trigger={
            <Tooltip content="Insert Link (⌘K)" placement="top" tooltipClassName="text-xs! px-2! py-1!">
              <motion.button className="tool-button" whileTap={{ scale: 0.9 }}>
                <MdLink className="size-4" />
              </motion.button>
            </Tooltip>
          }
        >
          <div className="w-80 rounded-lg border border-border bg-card p-4 shadow-xl">
            <LinkSelector editor={editor} />
          </div>
        </ToolbarPortalDropdown>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* More - everything else (Headless UI Popover for auto viewport positioning) */}
        <Popover className="relative">
          <Tooltip content="More" placement="top" tooltipClassName="text-xs! px-2! py-1!">
            <PopoverButton as={motion.button} className="tool-button" whileTap={{ scale: 0.9 }}>
              <TbChevronDown className="size-4" />
            </PopoverButton>
          </Tooltip>

          <PopoverPanel
            anchor={{ to: "bottom end", gap: 8 }}
            portal
            className="pagehub-sdk-root z-[99999] rounded-lg border border-border bg-card p-2 shadow-xl"
          >
            <ReactTooltip
              id="more-tip"
              classNameArrow="hidden"
              className="max-w-[220px] rounded-lg! border! !border-border !bg-primary px-2! py-1! text-xs! font-normal! !text-primary-foreground shadow-lg! z-[999999]!"
            />
            <div className="flex gap-3">
              {/* Left column — button groups */}
              <div className="flex flex-col gap-2">
                {/* Alignment */}
                <div>
                  <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Align</div>
                  <div className="flex gap-1">
                    {[
                      { align: "left", icon: <MdFormatAlignLeft className="size-4" />, label: "Left" },
                      { align: "center", icon: <MdFormatAlignCenter className="size-4" />, label: "Center" },
                      { align: "right", icon: <MdFormatAlignRight className="size-4" />, label: "Right" },
                    ].map(a => (
                      <motion.button
                        key={a.align}
                        onClick={handleButtonClick(() => editor.chain().focus().setTextAlign(a.align).run())}
                        className={`tool-button ${editor.isActive({ textAlign: a.align }) ? "bg-muted text-foreground" : ""}`}
                        data-tooltip-id="more-tip"
                        data-tooltip-content={a.label}
                        whileTap={{ scale: 0.9 }}
                      >
                        {a.icon}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Lists */}
                <div>
                  <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Lists</div>
                  <div className="flex gap-1">
                    <motion.button onClick={handleButtonClick(() => editor.chain().focus().toggleBulletList().run())} className={`tool-button ${editor.isActive("bulletList") ? "bg-muted text-foreground" : ""}`} data-tooltip-id="more-tip" data-tooltip-content="Bullet List" whileTap={{ scale: 0.9 }}><MdFormatListBulleted className="size-4" /></motion.button>
                    <motion.button onClick={handleButtonClick(() => editor.chain().focus().toggleOrderedList().run())} className={`tool-button ${editor.isActive("orderedList") ? "bg-muted text-foreground" : ""}`} data-tooltip-id="more-tip" data-tooltip-content="Numbered List" whileTap={{ scale: 0.9 }}><MdFormatListNumbered className="size-4" /></motion.button>
                    <motion.button onClick={handleButtonClick(() => editor.chain().focus().liftListItem("listItem").run())} className="tool-button" data-tooltip-id="more-tip" data-tooltip-content="Outdent" whileTap={{ scale: 0.9 }}><MdFormatIndentIncrease className="size-4 rotate-180" /></motion.button>
                    <motion.button onClick={handleButtonClick(() => editor.chain().focus().sinkListItem("listItem").run())} className="tool-button" data-tooltip-id="more-tip" data-tooltip-content="Indent" whileTap={{ scale: 0.9 }}><MdFormatIndentIncrease className="size-4" /></motion.button>
                  </div>
                </div>

                {/* Formatting */}
                <div>
                  <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Format</div>
                  <div className="flex gap-1">
                    <motion.button onClick={handleButtonClick(() => editor.chain().focus().toggleStrike().run())} className={`tool-button ${editor.isActive("strike") ? "bg-muted text-foreground" : ""}`} data-tooltip-id="more-tip" data-tooltip-content="Strikethrough (⌘⇧S)" whileTap={{ scale: 0.9 }}><MdFormatStrikethrough className="size-4" /></motion.button>
                    <motion.button onClick={handleButtonClick(() => editor.chain().focus().toggleSuperscript().run())} className={`tool-button ${editor.isActive("superscript") ? "bg-muted text-foreground" : ""}`} data-tooltip-id="more-tip" data-tooltip-content="Superscript" whileTap={{ scale: 0.9 }}><MdSuperscript className="size-4" /></motion.button>
                    <motion.button onClick={handleButtonClick(() => editor.chain().focus().toggleSubscript().run())} className={`tool-button ${editor.isActive("subscript") ? "bg-muted text-foreground" : ""}`} data-tooltip-id="more-tip" data-tooltip-content="Subscript" whileTap={{ scale: 0.9 }}><MdSubscript className="size-4" /></motion.button>
                  </div>
                </div>

                {/* Actions row */}
                <div className="flex gap-1 border-t border-border pt-2">
                  <motion.button onClick={handleButtonClick(() => setShowMediaModal(true))} className="tool-button" data-tooltip-id="more-tip" data-tooltip-content="Insert Image" whileTap={{ scale: 0.9 }}><MdImage className="size-4" /></motion.button>
                  <motion.button onClick={handleButtonClick(() => editor.chain().focus().setHorizontalRule().run())} className="tool-button" data-tooltip-id="more-tip" data-tooltip-content="Horizontal Rule" whileTap={{ scale: 0.9 }}><MdFormatLineSpacing className="size-4" /></motion.button>
                  <motion.button onClick={handleButtonClick(() => editor.chain().focus().clearNodes().unsetAllMarks().run())} className="tool-button" data-tooltip-id="more-tip" data-tooltip-content="Clear Formatting" whileTap={{ scale: 0.9 }}><TbEraser className="size-4" /></motion.button>
                  <DeleteNodeButton iconSize={16} />
                </div>
              </div>

              {/* Right column — variables */}
              <div className="border-l border-border pl-3">
                <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Variables</div>
                {[
                  { id: "company.name", label: "Company" },
                  { id: "company.tagline", label: "Tagline" },
                  { id: "company.email", label: "Email" },
                  { id: "company.phone", label: "Phone" },
                  { id: "company.location", label: "Location" },
                  { id: "company.website", label: "Website" },
                  { id: "year", label: "Year" },
                ].map(v => (
                  <button
                    key={v.id}
                    onClick={handleButtonClick(() => editor.chain().focus().insertVariable({ id: v.id }).run())}
                    className="flex w-full items-center rounded-md px-1.5 py-1 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </PopoverPanel>
        </Popover>
      </div>

      {/* Media Manager Modal */}
      <MediaManagerModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelect={mediaId => {
          console.log("[PageHub] Selected media ID:", mediaId);
          const imageUrl = getMediaContent(query, mediaId);
          console.log("[PageHub] Generated image URL:", imageUrl);

          if (imageUrl) {
            editor?.chain().focus().setImage({ src: imageUrl }).run();
            console.log("[PageHub] Image inserted into Tiptap");
          } else {
            console.error("[PageHub] Failed to generate image URL for mediaId:", mediaId);
          }

          setShowMediaModal(false);
        }}
        selectionMode={true}
      />
    </div>
  );
}; // Link Selector Component for Tiptap
const LinkSelector: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [linkType, setLinkType] = useState<"external" | "page">("page");
  const [url, setUrl] = useState("");
  const [savedSelection, setSavedSelection] = useState<{
    from: number;
    to: number;
  } | null>(null);

  // Save selection when dropdown opens (on mouse enter)
  useEffect(() => {
    const { from, to } = editor.state.selection;
    if (from !== to) {
      setSavedSelection({ from, to });
      console.log("[PageHub] Saved selection:", { from, to });
    }
  }, [editor]);

  const handlePagePick = (page: { id: string; displayName: string; isHomePage: boolean }) => {
    console.log("[PageHub] Page picked:", page);
    const pageRef = `ref:${page.id}`;
    console.log("[PageHub] Setting link href to:", pageRef);

    // Use saved selection or current selection
    const selection = savedSelection || editor.state.selection;
    const { from, to } = selection;
    const hasSelection = from !== to;

    console.log("[PageHub] Has selection:", hasSelection, "from:", from, "to:", to);

    if (hasSelection) {
      const selectedText = editor.state.doc.textBetween(from, to);
      console.log("[PageHub] Selected text:", selectedText);

      // Use toggleLink to apply the link properly
      editor.chain().focus().setTextSelection({ from, to }).toggleLink({ href: pageRef }).run();

      console.log("[PageHub] Link applied to selection");

      // Check if link was applied
      setTimeout(() => {
        console.log("[PageHub] Link active at cursor:", editor.isActive("link"));
        console.log("[PageHub] Current HTML:", editor.getHTML());
      }, 100);
    } else {
      // No selection - insert text and then make it a link
      const startPos = editor.state.selection.from;
      editor
        .chain()
        .focus()
        .insertContent(page.displayName + " ")
        .setTextSelection({
          from: startPos,
          to: startPos + page.displayName.length,
        })
        .toggleLink({ href: pageRef })
        .run();
      console.log("[PageHub] Link inserted with page name as text");
    }

    setSavedSelection(null);
  };

  const handleExternalLink = () => {
    if (url) {
      console.log("[PageHub] Setting external link to:", url);

      // Use saved selection or current selection
      const selection = savedSelection || editor.state.selection;
      const { from, to } = selection;
      const hasSelection = from !== to;

      if (hasSelection) {
        const selectedText = editor.state.doc.textBetween(from, to);
        console.log("[PageHub] Selected text:", selectedText);

        // Use toggleLink to apply the link properly
        editor.chain().focus().setTextSelection({ from, to }).toggleLink({ href: url }).run();

        console.log("[PageHub] External link applied to selection");

        // Check if link was applied
        setTimeout(() => {
          console.log("[PageHub] Link active at cursor:", editor.isActive("link"));
          console.log("[PageHub] Current HTML:", editor.getHTML());
        }, 100);
      } else {
        // No selection - insert text and then make it a link
        const startPos = editor.state.selection.from;
        editor
          .chain()
          .focus()
          .insertContent(url + " ")
          .setTextSelection({ from: startPos, to: startPos + url.length })
          .toggleLink({ href: url })
          .run();
        console.log("[PageHub] External link inserted with URL as text");
      }

      setSavedSelection(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Link Type Toggle */}
      <div className="flex gap-2">
        <motion.button
          type="button"
          onClick={() => setLinkType("page")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs transition-colors ${linkType === "page"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
            }`}
          whileTap={{ scale: 0.9 }}
        >
          Internal Page
        </motion.button>
        <motion.button
          type="button"
          onClick={() => setLinkType("external")}
          className={`flex-1 rounded-lg px-3 py-2 text-xs transition-colors ${linkType === "external"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
            }`}
          whileTap={{ scale: 0.9 }}
        >
          <MdLink className="mr-1 inline" />
          External URL
        </motion.button>
      </div>

      {/* Conditional Content */}
      {linkType === "external" ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onClick={e => e.stopPropagation()}
          />
          <motion.button
            onClick={e => {
              e.stopPropagation();
              handleExternalLink();
            }}
            className="btn-primary w-fit"
            whileTap={{ scale: 0.9 }}
          >
            Insert
          </motion.button>
        </div>
      ) : (
        <div onClick={e => e.stopPropagation()}>
          <PageSelector onPagePick={handlePagePick} pickerMode={true} className="w-full" />
        </div>
      )}
    </div>
  );
};
