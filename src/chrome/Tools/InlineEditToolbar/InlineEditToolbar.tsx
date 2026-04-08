import { useEditor as useCraftEditor } from "@craftjs/core";
import { Editor } from "@tiptap/react";
import { REACT_TOOLTIP_SURFACE_CLASS } from "components/layout/tooltipSurface";
import { Tooltip } from "components/layout/Tooltip";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tooltip as ReactTooltip } from "react-tooltip";
import { useClampToViewport } from "../../hooks/useClampToViewport";
import { MdFormatBold, MdFormatItalic, MdFormatUnderlined, MdLink } from "react-icons/md";
import { MdFontDownload } from "react-icons/md";
import { TbChevronDown } from "react-icons/tb";
import { getMediaContent } from "utils/lib";
import { paletteToCSSVar } from "utils/design/palette";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { useSDK } from "../../../context";
import { MediaManagerModal } from "../../Toolbar/Inputs/media/MediaManagerModal";
import { TokenPicker } from "../../Toolbar/Inputs/color/TokenPicker";
import { StylesPanel } from "./panels/StylesPanel";
import { FontPanel } from "./panels/FontPanel";
import { LinkPanel } from "./panels/LinkPanel";
import { MorePanel } from "./panels/MorePanel";

type PanelId = "styles" | "font" | "link" | "more" | "ai" | "bgcolor" | "textcolor" | null;

interface InlineEditToolbarProps {
  editor: Editor | null;
  className?: string;
}

export function InlineEditToolbar({ editor }: InlineEditToolbarProps) {
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useClampToViewport<HTMLDivElement>();
  const { query } = useCraftEditor();
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderTiptapAi = config.editorChromeSlots?.renderTiptapAiToolbar;
  const renderTiptapAiPanel = config.editorChromeSlots?.renderTiptapAiPanel;

  // Toggle panel — same panel closes it, different panel switches
  const toggle = useCallback((id: PanelId) => {
    setActivePanel(prev => (prev === id ? null : id));
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!activePanel) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setActivePanel(null);
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    return () => document.removeEventListener("mousedown", handleMouseDown, true);
  }, [activePanel]);

  // Close on Escape
  useEffect(() => {
    if (!activePanel) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActivePanel(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [activePanel]);

  if (!editor) return null;

  const handleButtonClick = (callback: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };



  return (
    <div className="pointer-events-none absolute z-50 w-full cursor-pointer" ref={containerRef}>
      <div ref={toolbarRef} className="pointer-events-auto relative left-1/2 z-50 mt-2 w-fit -translate-x-1/2 font-sans">
        {/* === Toolbar Bar === */}
        <div className="tool-bg flex h-10 flex-row items-center justify-center gap-0">
          {/* AI slot */}
          {isAiEnabled && renderTiptapAi && <>
            {renderTiptapAi({ editor, query, activePanel, setActivePanel })}
            <div className="mx-1 h-5 w-px bg-border" />
          </>}

          {/* Bold / Italic / Underline */}
          <FormatButton editor={editor} command={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} tooltip="Bold (⌘B)" icon={<MdFormatBold />} onAction={handleButtonClick} />
          <FormatButton editor={editor} command={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} tooltip="Italic (⌘I)" icon={<MdFormatItalic />} onAction={handleButtonClick} />
          <FormatButton editor={editor} command={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} tooltip="Underline (⌘U)" icon={<MdFormatUnderlined />} onAction={handleButtonClick} />

          <div className="mx-1 h-5 w-px bg-border" />

          {/* Styles + Font triggers */}
          <Tooltip content="Typography Presets" placement="top" tooltipClassName="text-xs! px-2! py-1!">
            <button className={`tool-button ${activePanel === "styles" ? "bg-neutral text-base-content" : ""}`} onClick={() => toggle("styles")}>
              <MdFontDownload />
              <span className="text-xs">Styles</span>
              <TbChevronDown className="size-3!" />
            </button>
          </Tooltip>
          <Tooltip content="Font" placement="top" tooltipClassName="text-xs! px-2! py-1!">
            <button className={`tool-button ${activePanel === "font" ? "bg-neutral text-base-content" : ""}`} onClick={() => toggle("font")}>
              <MdFontDownload />
              <span className="text-xs">Font</span>
              <TbChevronDown className="size-3!" />
            </button>
          </Tooltip>

          <div className="mx-1 h-5 w-px bg-border" />

          {/* Link trigger */}
          <Tooltip content="Insert Link (⌘K)" placement="top" tooltipClassName="text-xs! px-2! py-1!">
            <button className={`tool-button ${activePanel === "link" ? "bg-neutral text-base-content" : ""}`} onClick={() => toggle("link")}>
              <MdLink />
            </button>
          </Tooltip>

          <div className="mx-1 h-5 w-px bg-border" />

          {/* Color buttons */}
          <div className="flex items-center gap-1 px-1">
            <button
              type="button"
              onClick={() => toggle("bgcolor")}
              className={`size-6 cursor-pointer rounded border-2 transition-colors ${activePanel === "bgcolor" ? "border-primary" : "border-base-300"}`}
              style={{ backgroundColor: editor.getAttributes("highlight").color || "#ffffff" }}
              data-tooltip-id="iet-tip" data-tooltip-content="Background Color" data-tooltip-place="top"
            />
            <button
              type="button"
              onClick={() => toggle("textcolor")}
              className={`size-6 cursor-pointer rounded border-2 transition-colors ${activePanel === "textcolor" ? "border-primary" : "border-base-300"}`}
              style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000000" }}
              data-tooltip-id="iet-tip" data-tooltip-content="Text Color" data-tooltip-place="top"
            />
          </div>

          <div className="mx-1 h-5 w-px bg-border" />

          {/* More trigger */}
          <Tooltip content="More" placement="top" tooltipClassName="text-xs! px-2! py-1!">
            <button className={`tool-button ${activePanel === "more" ? "bg-neutral text-base-content" : ""}`} onClick={() => toggle("more")}>
              <TbChevronDown />
            </button>
          </Tooltip>
        </div>

        {/* === Panel Slot === */}
        {activePanel && (
          <div className="pointer-events-auto absolute left-1/2 top-full mt-2 -translate-x-1/2">
            <div className="tool-bg w-fit">
              {activePanel === "styles" && <StylesPanel editor={editor} onAction={handleButtonClick} />}
              {activePanel === "font" && <FontPanel editor={editor} onAction={handleButtonClick} />}
              {activePanel === "link" && <LinkPanel editor={editor} />}
              {activePanel === "more" && <MorePanel editor={editor} onAction={handleButtonClick} onInsertImage={() => { setActivePanel(null); setShowMediaModal(true); }} />}
              {activePanel === "ai" && renderTiptapAiPanel?.({ editor, query })}
              {activePanel === "bgcolor" && (
                <TokenPicker
                  value={editor.getAttributes("highlight").color}
                  onChange={(data) => {
                    const cssVar = paletteToCSSVar(data.value);
                    editor.chain().focus().setHighlight({ color: cssVar }).run();
                  }}
                />
              )}
              {activePanel === "textcolor" && (
                <TokenPicker
                  value={editor.getAttributes("textStyle").color}
                  onChange={(data) => {
                    const cssVar = paletteToCSSVar(data.value);
                    editor.chain().focus().setColor(cssVar).run();
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <ReactTooltip id="iet-tip" variant="light" classNameArrow="hidden" className={REACT_TOOLTIP_SURFACE_CLASS} />

      <MediaManagerModal
        isOpen={showMediaModal}
        onClose={() => setShowMediaModal(false)}
        onSelect={mediaId => {
          const imageUrl = getMediaContent(query, mediaId);
          if (imageUrl) editor?.chain().focus().setImage({ src: imageUrl }).run();
          setShowMediaModal(false);
        }}
        selectionMode={true}
      />
    </div>
  );
}

function FormatButton({ command, active, tooltip, icon, onAction }: {
  editor: Editor; command: () => void; active: boolean; tooltip: string; icon: React.ReactNode;
  onAction: (cb: () => void) => (e: React.MouseEvent) => void;
}) {
  return (
    <Tooltip content={tooltip} placement="top" tooltipClassName="text-xs! px-2! py-1!">
      <button type="button" onClick={onAction(command)} className={`tool-button ${active ? "bg-neutral text-base-content" : ""}`}>
        {icon}
      </button>
    </Tooltip>
  );
}
