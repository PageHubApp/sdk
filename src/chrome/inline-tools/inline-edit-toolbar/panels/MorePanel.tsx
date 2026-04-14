import { Editor } from "@tiptap/react";
import { REACT_TOOLTIP_SURFACE_CLASS } from "@/chrome/primitives/layout/tooltipSurface";
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
import { TbEraser, TbX } from "react-icons/tb";
import { DeleteNodeButton } from "../../../canvas/node-tools/DeleteNodeButton";
import { getEditorVariableOptions } from "@/utils/editorVariableOptions";

interface MorePanelProps {
  editor: Editor;
  query: any;
  onAction: (cb: () => void) => (e: React.MouseEvent) => void;
  onInsertImage: () => void;
  onClose: () => void;
}

export function MorePanel({ editor, query, onAction, onInsertImage, onClose }: MorePanelProps) {
  const variableOptions = getEditorVariableOptions(query);
  return (
    <div className="flex flex-col gap-0.5 px-1 py-1">
      <ReactTooltip
        id="more-tip"
        variant="light"
        classNameArrow="hidden"
        className={`${REACT_TOOLTIP_SURFACE_CLASS} z-999999!`}
      />

      <div className="flex items-center">
        {[
          { align: "left", icon: <MdFormatAlignLeft />, label: "Align left" },
          { align: "center", icon: <MdFormatAlignCenter />, label: "Align center" },
          { align: "right", icon: <MdFormatAlignRight />, label: "Align right" },
        ].map(a => (
          <button
            key={a.align}
            onClick={onAction(() => editor.chain().focus().setTextAlign(a.align).run())}
            className={`tool-button ${editor.isActive({ textAlign: a.align }) ? "bg-base-200 text-base-content" : ""}`}
            data-tooltip-id="more-tip"
            data-tooltip-content={a.label}
          >
            {a.icon}
          </button>
        ))}

        <div className="bg-border mx-0.5 h-5 w-px" />

        <Btn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          tip="Bullet list"
          icon={<MdFormatListBulleted />}
          onAction={onAction}
        />
        <Btn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          tip="Numbered list"
          icon={<MdFormatListNumbered />}
          onAction={onAction}
        />
        <Btn
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          tip="Outdent"
          icon={<MdFormatIndentIncrease className="rotate-180" />}
          onAction={onAction}
        />
        <Btn
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          tip="Indent"
          icon={<MdFormatIndentIncrease />}
          onAction={onAction}
        />

        <div className="bg-border mx-0.5 h-5 w-px" />

        <Btn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          tip="Strikethrough"
          icon={<MdFormatStrikethrough />}
          onAction={onAction}
        />
        <Btn
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          active={editor.isActive("superscript")}
          tip="Superscript"
          icon={<MdSuperscript />}
          onAction={onAction}
        />
        <Btn
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          active={editor.isActive("subscript")}
          tip="Subscript"
          icon={<MdSubscript />}
          onAction={onAction}
        />

        <div className="bg-border mx-0.5 h-5 w-px" />

        <Btn onClick={onInsertImage} tip="Insert image" icon={<MdImage />} onAction={onAction} />
        <Btn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          tip="Horizontal rule"
          icon={<MdFormatLineSpacing />}
          onAction={onAction}
        />
        <Btn
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          tip="Clear formatting"
          icon={<TbEraser />}
          onAction={onAction}
        />
        <DeleteNodeButton className="tool-button" />

        <div className="bg-border mx-0.5 h-5 w-px" />

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="tool-button"
          data-tooltip-id="more-tip"
          data-tooltip-content="Close"
        >
          <TbX />
        </button>
      </div>

      {variableOptions.length > 0 && (
        <div className="border-base-300 flex flex-wrap items-center gap-1 border-t pt-1">
          <span className="text-neutral-content/60 text-[10px] font-semibold tracking-wider uppercase">
            Vars
          </span>
          {variableOptions.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={onAction(() =>
                (editor.chain().focus() as any).insertVariable({ id: v.id }).run()
              )}
              className="border-base-300 text-base-content hover:bg-base-200 rounded-md border px-1.5 py-0.5 text-xs transition-colors"
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Btn({
  onClick,
  active,
  tip,
  icon,
  onAction,
}: {
  onClick: () => void;
  active?: boolean;
  tip: string;
  icon: React.ReactNode;
  onAction: (cb: () => void) => (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onAction(onClick)}
      className={`tool-button ${active ? "bg-base-200 text-base-content" : ""}`}
      data-tooltip-id="more-tip"
      data-tooltip-content={tip}
    >
      {icon}
    </button>
  );
}
