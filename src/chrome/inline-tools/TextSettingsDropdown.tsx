import { useTiptapContext } from "./TiptapContext";
import { ToolbarItem } from "../toolbar/ToolbarItem";
import { ColorInput } from "../toolbar/inputs/color/ColorInput";
import { useState } from "react";
import { AiOutlineAlignRight } from "react-icons/ai";
import { TbAlignCenter, TbAlignLeft } from "react-icons/tb";

export function TextSettingsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const { editor: tiptapEditor } = useTiptapContext();

  if (!tiptapEditor) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Color Picker */}
      <div className="flex items-center gap-2">
        <span className="w-16 text-xs font-medium">Color</span>
        <div className="border-base-300 h-8 flex-1 overflow-hidden rounded-lg border">
          <ColorInput propKey="color" label="" prefix="text" labelHide={true} />
        </div>
      </div>

      {/* Text Alignment */}
      <div className="border-base-300 flex items-center gap-2 border-t pt-2">
        <span className="w-16 text-xs font-medium">Align</span>
        <div className="flex-1">
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
        </div>
      </div>
    </div>
  );
}
