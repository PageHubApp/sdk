import { Editor } from "@tiptap/react";
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
import { TbEraser } from "react-icons/tb";
import { DeleteNodeButton } from "../../../NodeControllers/Tools/DeleteNodeButton";

const VARIABLES = [
  { id: "company.name", label: "Company" },
  { id: "company.tagline", label: "Tagline" },
  { id: "company.email", label: "Email" },
  { id: "company.phone", label: "Phone" },
  { id: "company.location", label: "Location" },
  { id: "company.website", label: "Website" },
  { id: "year", label: "Year" },
];

interface MorePanelProps {
  editor: Editor;
  onAction: (cb: () => void) => (e: React.MouseEvent) => void;
  onInsertImage: () => void;
}

export function MorePanel({ editor, onAction, onInsertImage }: MorePanelProps) {
  return (
    <div className="flex flex-col items-center gap-1 px-1.5 py-1">
      <ReactTooltip id="more-tip" variant="light" classNameArrow="hidden" className={`${REACT_TOOLTIP_SURFACE_CLASS} z-999999!`} />

      <div className="flex items-center">
        {[
          { align: "left", icon: <MdFormatAlignLeft />, label: "Left" },
          { align: "center", icon: <MdFormatAlignCenter />, label: "Center" },
          { align: "right", icon: <MdFormatAlignRight />, label: "Right" },
        ].map(a => (
          <button key={a.align} onClick={onAction(() => editor.chain().focus().setTextAlign(a.align).run())}
            className={`panel-btn ${editor.isActive({ textAlign: a.align }) ? "bg-neutral text-base-content" : ""}`} data-tooltip-id="more-tip" data-tooltip-content={a.label}>
            {a.icon}
          </button>
        ))}

        <div className="mx-0.5 h-4 w-px bg-border" />

        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} tip="Bullet List" icon={<MdFormatListBulleted />} onAction={onAction} />
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} tip="Numbered List" icon={<MdFormatListNumbered />} onAction={onAction} />
        <Btn onClick={() => editor.chain().focus().liftListItem("listItem").run()} tip="Outdent" icon={<MdFormatIndentIncrease className="rotate-180" />} onAction={onAction} />
        <Btn onClick={() => editor.chain().focus().sinkListItem("listItem").run()} tip="Indent" icon={<MdFormatIndentIncrease />} onAction={onAction} />

        <div className="mx-0.5 h-4 w-px bg-border" />

        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} tip="Strikethrough" icon={<MdFormatStrikethrough />} onAction={onAction} />
        <Btn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} tip="Superscript" icon={<MdSuperscript />} onAction={onAction} />
        <Btn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} tip="Subscript" icon={<MdSubscript />} onAction={onAction} />

        <div className="mx-0.5 h-4 w-px bg-border" />

        <Btn onClick={onInsertImage} tip="Insert Image" icon={<MdImage />} onAction={onAction} />
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} tip="Horizontal Rule" icon={<MdFormatLineSpacing />} onAction={onAction} />
        <Btn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} tip="Clear Formatting" icon={<TbEraser />} onAction={onAction} />
        <DeleteNodeButton className="panel-btn" />
      </div>

      <div className="flex items-center gap-0.5 border-t border-base-300 pt-1">
        <span className="mr-0.5 text-[9px] font-medium uppercase tracking-wider text-neutral-content">Vars</span>
        {VARIABLES.map(v => (
          <button key={v.id} type="button" onClick={onAction(() => (editor.chain().focus() as any).insertVariable({ id: v.id }).run())}
            className="rounded px-1 py-px text-[10px] text-neutral-content transition-colors hover:bg-neutral hover:text-base-content">
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Btn({ onClick, active, tip, icon, onAction }: {
  onClick: () => void; active?: boolean; tip: string; icon: React.ReactNode;
  onAction: (cb: () => void) => (e: React.MouseEvent) => void;
}) {
  return (
    <button onClick={onAction(onClick)}
      className={`panel-btn ${active ? "bg-neutral text-base-content" : ""}`}
      data-tooltip-id="more-tip" data-tooltip-content={tip}>
      {icon}
    </button>
  );
}
