import { useTiptapContext } from "../../inline-tools/TiptapContext";
import { ToolbarItem } from "../../toolbar/ToolbarItem";
import { ColorInput } from "../../toolbar/inputs/color/ColorInput";
import { NodeToolWrapper } from "./NodeDialog";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../primitives/layout/tooltipSurface";
import { TbAlignCenter, TbAlignLeft, TbAlignRight } from "react-icons/tb";

export function TextSettingsTopNodeTool() {
  // Get the Tiptap editor from context
  const { editor: tiptapEditor } = useTiptapContext();

  return (
    <NodeToolWrapper
      className="bg-primary text-base-content m-1 rounded-lg px-3 shadow-inner"
      animate={{
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          y: 0,
          transition: {
            delay: 0.5,
            duration: 0.5,
            type: "spring",
            stiffness: 200,
            damping: 20,
            mass: 0.5,
          },
        },
        exit: {
          opacity: 0,

          transition: {
            delay: 0.2,
            duration: 0.3,
            type: "spring",
            stiffness: 200,
            damping: 20,
            mass: 0.5,
          },
        },
      }}
    >
      <div className="border-base-300 h-6 w-16 overflow-hidden rounded-lg border">
        <ColorInput propKey="color" label="" prefix="text" labelHide={true} />
      </div>

      {/* Tiptap Formatting Buttons */}
      {tiptapEditor && (
        <>
          <button
            onClick={() => tiptapEditor.chain().focus().toggleBold().run()}
            className={`hover:bg-neutral rounded-md px-2 py-1 text-sm ${
              tiptapEditor.isActive("bold") ? "bg-neutral text-primary" : "text-base-content"
            }`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Bold"
          >
            <strong>B</strong>
          </button>

          <button
            onClick={() => tiptapEditor.chain().focus().toggleItalic().run()}
            className={`hover:bg-neutral rounded-md px-2 py-1 text-sm ${
              tiptapEditor.isActive("italic") ? "bg-neutral text-primary" : "text-base-content"
            }`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Italic"
          >
            <em>I</em>
          </button>

          <button
            onClick={() => tiptapEditor.chain().focus().toggleUnderline().run()}
            className={`hover:bg-neutral rounded-md px-2 py-1 text-sm ${
              tiptapEditor.isActive("underline") ? "bg-neutral text-primary" : "text-base-content"
            }`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Underline"
          >
            <u>U</u>
          </button>

          <button
            onClick={() => tiptapEditor.chain().focus().toggleStrike().run()}
            className={`hover:bg-neutral rounded-md px-2 py-1 text-sm ${
              tiptapEditor.isActive("strike") ? "bg-neutral text-primary" : "text-base-content"
            }`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Strikethrough"
          >
            <s>S</s>
          </button>

          <button
            onClick={() => tiptapEditor.chain().focus().toggleCode().run()}
            className={`hover:bg-neutral rounded-md px-2 py-1 text-sm ${
              tiptapEditor.isActive("code") ? "bg-neutral text-primary" : "text-base-content"
            }`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Code"
          >
            <code>&lt;/&gt;</code>
          </button>
        </>
      )}

      <ToolbarItem
        propKey="textAlign"
        type="radio"
        label=""
        labelHide={true}
        cols={true}
        wrap="control"
        options={[
          { value: "text-left", label: <TbAlignLeft /> },
          { value: "text-center", label: <TbAlignCenter /> },
          { value: "text-right", label: <TbAlignRight /> },
        ]}
      />
    </NodeToolWrapper>
  );
}
