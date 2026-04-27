import { Editor } from "@tiptap/react";
import { VariableInsertPanel } from "./VariableInsertPanel";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import {
  TbAlignCenter,
  TbAlignLeft,
  TbAlignRight,
  TbEraser,
  TbIndentIncrease,
  TbLineHeight,
  TbList,
  TbListNumbers,
  TbPhoto,
  TbStrikethrough,
  TbSubscript,
  TbSuperscript,
  TbX,
} from "react-icons/tb";
import { DeleteNodeButton } from "../../../canvas/node-tools/DeleteNodeButton";
import type { PagehubTextRichMode } from "@/core/tiptapExtensions/pagehubTextTiptapExtensions";

interface MorePanelProps {
  editor: Editor;
  query: any;
  nodeId?: string;
  richTextMode?: PagehubTextRichMode;
  onAction: (cb: () => void) => (e: React.MouseEvent) => void;
  onInsertImage: () => void;
  onClose: () => void;
}

export function MorePanel({
  editor,
  query,
  nodeId,
  richTextMode = "full",
  onAction,
  onInsertImage,
  onClose,
}: MorePanelProps) {
  return (
    <div className="flex flex-col gap-0.5 px-1 py-1">
      <div className="flex items-center">
        {richTextMode !== "inline" &&
          [
            { align: "left", icon: <TbAlignLeft />, label: "Align left" },
            { align: "center", icon: <TbAlignCenter />, label: "Align center" },
            { align: "right", icon: <TbAlignRight />, label: "Align right" },
          ].map(a => (
            <button
              key={a.align}
              onClick={onAction(() => editor.chain().focus().setTextAlign(a.align).run())}
              className={`tool-button ${editor.isActive({ textAlign: a.align }) ? "bg-base-200 text-base-content" : ""}`}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content={a.label}
            >
              {a.icon}
            </button>
          ))}

        {richTextMode !== "inline" && <div className="bg-border mx-0.5 h-5 w-px" />}

        {richTextMode !== "inline" && (
          <>
            <Btn
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              tip="Bullet list"
              icon={<TbList />}
              onAction={onAction}
            />
            <Btn
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              tip="Numbered list"
              icon={<TbListNumbers />}
              onAction={onAction}
            />
            <Btn
              onClick={() => editor.chain().focus().liftListItem("listItem").run()}
              tip="Outdent"
              icon={<TbIndentIncrease className="rotate-180" />}
              onAction={onAction}
            />
            <Btn
              onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
              tip="Indent"
              icon={<TbIndentIncrease />}
              onAction={onAction}
            />

            <div className="bg-border mx-0.5 h-5 w-px" />
          </>
        )}

        <Btn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          tip="Strikethrough"
          icon={<TbStrikethrough />}
          onAction={onAction}
        />
        <Btn
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          active={editor.isActive("superscript")}
          tip="Superscript"
          icon={<TbSuperscript />}
          onAction={onAction}
        />
        <Btn
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          active={editor.isActive("subscript")}
          tip="Subscript"
          icon={<TbSubscript />}
          onAction={onAction}
        />

        {richTextMode !== "inline" && (
          <>
            <div className="bg-border mx-0.5 h-5 w-px" />

            <Btn
              onClick={onInsertImage}
              tip="Insert image"
              icon={<TbPhoto />}
              onAction={onAction}
            />
            <Btn
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              tip="Horizontal rule"
              icon={<TbLineHeight />}
              onAction={onAction}
            />
          </>
        )}
        <Btn
          onClick={() =>
            richTextMode === "inline"
              ? editor.chain().focus().setContent("", { emitUpdate: false }).unsetAllMarks().run()
              : editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
          tip="Clear formatting"
          icon={<TbEraser />}
          onAction={onAction}
        />
        <DeleteNodeButton className="tool-button" />

        <div className="bg-border mx-0.5 h-5 w-px" />

        <VariableInsertPanel editor={editor} query={query} nodeId={nodeId} onAction={onAction} />

        <div className="bg-border mx-0.5 h-5 w-px" />

        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="tool-button"
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content="Close"
        >
          <TbX />
        </button>
      </div>
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
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={tip}
    >
      {icon}
    </button>
  );
}
