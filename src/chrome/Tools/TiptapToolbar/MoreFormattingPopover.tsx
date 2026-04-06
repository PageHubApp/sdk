import { Editor } from "@tiptap/react";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { REACT_TOOLTIP_SURFACE_CLASS } from "components/layout/tooltipSurface";
import { Tooltip as ReactTooltip } from "react-tooltip";
import {
  MdFormatAlignCenter,
  MdFormatAlignLeft,
  MdFormatAlignRight,
  MdFormatIndentIncrease,
  MdFormatLineSpacing,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatStrikethrough,
  MdImage,
  MdSubscript,
  MdSuperscript,
} from "react-icons/md";
import { TbChevronDown, TbEraser } from "react-icons/tb";
import { Tooltip } from "components/layout/Tooltip";
import { DeleteNodeButton } from "../../NodeControllers/Tools/DeleteNodeButton";

interface MoreFormattingPopoverProps {
  editor: Editor;
  handleButtonClick: (cb: () => void) => (e: React.MouseEvent) => void;
  onInsertImage: () => void;
}

const VARIABLES = [
  { id: "company.name", label: "Company" },
  { id: "company.tagline", label: "Tagline" },
  { id: "company.email", label: "Email" },
  { id: "company.phone", label: "Phone" },
  { id: "company.location", label: "Location" },
  { id: "company.website", label: "Website" },
  { id: "year", label: "Year" },
];

export function MoreFormattingPopover({ editor, handleButtonClick, onInsertImage }: MoreFormattingPopoverProps) {
  return (
    <Popover className="relative">
      <Tooltip content="More" placement="top" tooltipClassName="text-xs! px-2! py-1!">
        <PopoverButton className="tool-button">
          <TbChevronDown className="size-5" />
        </PopoverButton>
      </Tooltip>

      <PopoverPanel
        anchor={{ to: "bottom end", gap: 8 }}
        portal
        className="pagehub-sdk-root z-99999 rounded-lg border border-border bg-card p-2 shadow-xl"
      >
        <ReactTooltip
          id="more-tip"
          variant="light"
          classNameArrow="hidden"
          className={`${REACT_TOOLTIP_SURFACE_CLASS} z-999999!`}
        />
        <div className="flex gap-3">
          <div className="flex flex-col gap-2">
            {/* Alignment */}
            <div>
              <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Align</div>
              <div className="flex gap-1">
                {[
                  { align: "left", icon: <MdFormatAlignLeft className="size-5" />, label: "Left" },
                  { align: "center", icon: <MdFormatAlignCenter className="size-5" />, label: "Center" },
                  { align: "right", icon: <MdFormatAlignRight className="size-5" />, label: "Right" },
                ].map(a => (
                  <button key={a.align} onClick={handleButtonClick(() => editor.chain().focus().setTextAlign(a.align).run())}
                    className={`tool-button ${editor.isActive({ textAlign: a.align }) ? "bg-muted text-foreground" : ""}`}
                    data-tooltip-id="more-tip"
                    data-tooltip-content={a.label}
                   >
                    {a.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Lists */}
            <div>
              <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Lists</div>
              <div className="flex gap-1">
                <Btn editor={editor} onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} tip="Bullet List" icon={<MdFormatListBulleted className="size-5" />} handleButtonClick={handleButtonClick} />
                <Btn editor={editor} onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} tip="Numbered List" icon={<MdFormatListNumbered className="size-5" />} handleButtonClick={handleButtonClick} />
                <Btn editor={editor} onClick={() => editor.chain().focus().liftListItem("listItem").run()} tip="Outdent" icon={<MdFormatIndentIncrease className="size-5 rotate-180" />} handleButtonClick={handleButtonClick} />
                <Btn editor={editor} onClick={() => editor.chain().focus().sinkListItem("listItem").run()} tip="Indent" icon={<MdFormatIndentIncrease className="size-5" />} handleButtonClick={handleButtonClick} />
              </div>
            </div>

            {/* Formatting */}
            <div>
              <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Format</div>
              <div className="flex gap-1">
                <Btn editor={editor} onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} tip="Strikethrough (⌘⇧S)" icon={<MdFormatStrikethrough className="size-5" />} handleButtonClick={handleButtonClick} />
                <Btn editor={editor} onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} tip="Superscript" icon={<MdSuperscript className="size-5" />} handleButtonClick={handleButtonClick} />
                <Btn editor={editor} onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} tip="Subscript" icon={<MdSubscript className="size-5" />} handleButtonClick={handleButtonClick} />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-1 border-t border-border pt-2">
              <Btn editor={editor} onClick={onInsertImage} tip="Insert Image" icon={<MdImage className="size-5" />} handleButtonClick={handleButtonClick} />
              <Btn editor={editor} onClick={() => editor.chain().focus().setHorizontalRule().run()} tip="Horizontal Rule" icon={<MdFormatLineSpacing className="size-5" />} handleButtonClick={handleButtonClick} />
              <Btn editor={editor} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} tip="Clear Formatting" icon={<TbEraser className="size-5" />} handleButtonClick={handleButtonClick} />
              <DeleteNodeButton />
            </div>
          </div>

          {/* Variables */}
          <div className="border-l border-border pl-3">
            <div className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Variables</div>
            <div className="ph-select-item-host">
            {VARIABLES.map(v => (
              <button key={v.id} type="button" onClick={handleButtonClick(() => (editor.chain().focus() as any).insertVariable({ id: v.id }).run())}
                className="ph-select-item text-muted-foreground">
                {v.label}
              </button>
            ))}
            </div>
          </div>
        </div>
      </PopoverPanel>
    </Popover>
  );
}

function Btn({ onClick, active, tip, icon, handleButtonClick }: {
  editor: Editor; onClick: () => void; active?: boolean; tip: string; icon: React.ReactNode;
  handleButtonClick: (cb: () => void) => (e: React.MouseEvent) => void;
}) {
  return (
    <button onClick={handleButtonClick(onClick)}
      className={`tool-button ${active ? "bg-muted text-foreground" : ""}`}
      data-tooltip-id="more-tip"
      data-tooltip-content={tip}
     >
      {icon}
    </button>
  );
}
