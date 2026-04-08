import { useTiptapContext } from "../../TiptapContext";
import { ToolbarItem } from "../../Toolbar/ToolbarItem";
import { ColorInput } from "../../Toolbar/Inputs/color/ColorInput";
import { NodeToolWrapper } from "../../Tools/NodeDialog";
import { AiOutlineAlignRight } from "react-icons/ai";
import { TbAlignCenter, TbAlignLeft } from "react-icons/tb";

export function TextSettingsTopNodeTool() {
  // Get the Tiptap editor from context
  const { editor: tiptapEditor } = useTiptapContext();

  // Debug logging
  console.log("TextSettingsTopNodeTool - tiptapEditor:", tiptapEditor);
  console.log("TextSettingsTopNodeTool - editor type:", typeof tiptapEditor);

  console.log(tiptapEditor);

  return (
    <NodeToolWrapper
      className="m-1 rounded-lg bg-primary px-3 text-base-content shadow-inner"
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
      <div className="h-6 w-16 overflow-hidden rounded-lg border border-base-300">
        <ColorInput propKey="color" label="" prefix="text" labelHide={true} />
      </div>

      {/* Tiptap Formatting Buttons */}
      {tiptapEditor && (
        <>
          <button
            onClick={() => tiptapEditor.chain().focus().toggleBold().run()}
            className={`rounded-lg px-2 py-1 text-sm hover:bg-neutral ${
              tiptapEditor.isActive("bold") ? "bg-neutral text-primary" : "text-base-content"
            }`}
            title="Bold"
          >
            <strong>B</strong>
          </button>

          <button
            onClick={() => tiptapEditor.chain().focus().toggleItalic().run()}
            className={`rounded-lg px-2 py-1 text-sm hover:bg-neutral ${
              tiptapEditor.isActive("italic") ? "bg-neutral text-primary" : "text-base-content"
            }`}
            title="Italic"
          >
            <em>I</em>
          </button>

          <button
            onClick={() => tiptapEditor.chain().focus().toggleUnderline().run()}
            className={`rounded-lg px-2 py-1 text-sm hover:bg-neutral ${
              tiptapEditor.isActive("underline") ? "bg-neutral text-primary" : "text-base-content"
            }`}
            title="Underline"
          >
            <u>U</u>
          </button>

          <button
            onClick={() => tiptapEditor.chain().focus().toggleStrike().run()}
            className={`rounded-lg px-2 py-1 text-sm hover:bg-neutral ${
              tiptapEditor.isActive("strike") ? "bg-neutral text-primary" : "text-base-content"
            }`}
            title="Strikethrough"
          >
            <s>S</s>
          </button>

          <button
            onClick={() => tiptapEditor.chain().focus().toggleCode().run()}
            className={`rounded-lg px-2 py-1 text-sm hover:bg-neutral ${
              tiptapEditor.isActive("code") ? "bg-neutral text-primary" : "text-base-content"
            }`}
            title="Code"
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
          { value: "text-right", label: <AiOutlineAlignRight /> },
        ]}
      />
    </NodeToolWrapper>
  );
}

