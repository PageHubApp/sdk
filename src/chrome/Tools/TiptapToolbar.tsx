import { useEditor as useCraftEditor } from "@craftjs/core";
import { Editor } from "@tiptap/react";
import { Tooltip } from "components/layout/Tooltip";
import React, { useRef, useState } from "react";
import { useClampToViewport } from "../hooks/useClampToViewport";
import {
  MdFormatBold,
  MdFormatItalic,
  MdFormatUnderlined,
  MdLink,
} from "react-icons/md";
import { useAtomState } from "@zedux/react";
import { getMediaContent } from "utils/lib";
import { isPaletteReference, paletteToCSSVar } from "utils/design/palette";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { useSDK } from "../../context";
import { MediaManagerModal } from "../Toolbar/Inputs/media/MediaManagerModal";
import { ColorPickerAtom } from "../Toolbar/Tools/ColorPickerDialog";
import { ToolbarPortalDropdown } from "./ToolbarPortalDropdown";
import { FontPickerDropdown } from "./TiptapToolbar/FontPickerDropdown";
import { LinkSelector } from "./TiptapToolbar/LinkSelector";
import { MoreFormattingPopover } from "./TiptapToolbar/MoreFormattingPopover";

interface TiptapToolbarProps {
  editor: Editor | null;
  className?: string;
}

export function TiptapToolbar({ editor, className = "" }: TiptapToolbarProps) {
  const [showMediaModal, setShowMediaModal] = useState(false);
  const toolbarRef = useClampToViewport<HTMLDivElement>();
  const [colorDialog, setColorDialog] = useAtomState(ColorPickerAtom);
  const backgroundColorButtonRef = useRef<HTMLButtonElement>(null);
  const foregroundColorButtonRef = useRef<HTMLButtonElement>(null);
  const { query } = useCraftEditor();
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderTiptapAi = config.editorChromeSlots?.renderTiptapAiToolbar;

  if (!editor) return null;

  const handleButtonClick = (callback: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  const resolveColorValue = (value: unknown): string => {
    let colorValue: string;
    if (typeof value === "string") {
      colorValue = value;
    } else if (value && typeof value === "object") {
      const v = (value as Record<string, unknown>).value;
      if (typeof v === "string") colorValue = v;
      else if (v && typeof v === "object" && (v as Record<string, number>).r !== undefined) {
        const rgba = v as Record<string, number>;
        colorValue = `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
      } else colorValue = String(v);
    } else colorValue = String(value);
    return isPaletteReference(colorValue) ? paletteToCSSVar(colorValue) : colorValue;
  };

  const openColorPicker = (
    ref: React.RefObject<HTMLButtonElement>,
    currentValue: string,
    prefix: string,
    propKey: string,
    apply: (color: string) => void
  ) => {
    if (!ref.current) return;
    setColorDialog({
      enabled: true,
      value: currentValue,
      prefix,
      changed: (value: unknown) => apply(resolveColorValue(value)),
      showPallet: true,
      e: ref.current.getBoundingClientRect(),
      propKey,
    });
  };

  return (
    <div className="pointer-events-none absolute z-9999 w-full cursor-pointer">
      <div ref={toolbarRef} className="tool-bg pointer-events-auto relative left-1/2 z-50 mt-2 flex h-10 w-fit -translate-x-1/2 flex-row items-center justify-center gap-0 font-sans">
        {isAiEnabled && renderTiptapAi && <>{renderTiptapAi({ editor, query })}</>}

        {/* Bold */}
        <FormatButton editor={editor} command={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} tooltip="Bold (⌘B)" icon={<MdFormatBold className="size-5" />} handleButtonClick={handleButtonClick} />

        {/* Italic */}
        <FormatButton editor={editor} command={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} tooltip="Italic (⌘I)" icon={<MdFormatItalic className="size-5" />} handleButtonClick={handleButtonClick} />

        {/* Underline */}
        <FormatButton editor={editor} command={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} tooltip="Underline (⌘U)" icon={<MdFormatUnderlined className="size-5" />} handleButtonClick={handleButtonClick} />

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Font Picker + Typography Presets */}
        <FontPickerDropdown editor={editor} handleButtonClick={handleButtonClick} />

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Link */}
        <ToolbarPortalDropdown
          trigger={
            <Tooltip content="Insert Link (⌘K)" placement="top" tooltipClassName="text-xs! px-2! py-1!">
              <button type="button" className="tool-button">
                <MdLink className="size-5" />
              </button>
            </Tooltip>
          }
        >
          <div className="w-80 rounded-lg border border-border bg-card p-4 shadow-xl">
            <LinkSelector editor={editor} />
          </div>
        </ToolbarPortalDropdown>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* Color buttons */}
        <div className="flex items-center gap-1 px-1">
          <button
            type="button"
            ref={backgroundColorButtonRef}
            onClick={handleButtonClick(() =>
              openColorPicker(backgroundColorButtonRef, editor.getAttributes("highlight").color || "#ffff00", "bg", "backgroundColor",
                color => editor.chain().focus().setHighlight({ color }).run())
            )}
            className="size-6 cursor-pointer rounded border-2 border-border transition-colors hover:border-border"
            style={{ backgroundColor: editor.getAttributes("highlight").color || "#ffffff" }}
                       title="Background Color"
          />
          <button
            type="button"
            ref={foregroundColorButtonRef}
            onClick={handleButtonClick(() =>
              openColorPicker(foregroundColorButtonRef, editor.getAttributes("textStyle").color || "#000000", "text", "color",
                color => editor.chain().focus().setColor(color).run())
            )}
            className="size-6 cursor-pointer rounded border-2 border-border transition-colors hover:border-border"
            style={{ backgroundColor: editor.getAttributes("textStyle").color || "#000000" }}
                       title="Text Color"
          />
        </div>

        <div className="mx-1 h-5 w-px bg-border" />

        {/* More */}
        <MoreFormattingPopover editor={editor} handleButtonClick={handleButtonClick} onInsertImage={() => setShowMediaModal(true)} />
      </div>

      {/* Media Manager Modal */}
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

function FormatButton({ command, active, tooltip, icon, handleButtonClick }: {
  editor: Editor; command: () => void; active: boolean; tooltip: string; icon: React.ReactNode;
  handleButtonClick: (cb: () => void) => (e: React.MouseEvent) => void;
}) {
  return (
    <Tooltip content={tooltip} placement="top" tooltipClassName="text-xs! px-2! py-1!">
      <button
        type="button"
        onClick={handleButtonClick(command)}
        className={`tool-button ${active ? "bg-muted text-foreground" : ""}`}
             >
        {icon}
      </button>
    </Tooltip>
  );
}
