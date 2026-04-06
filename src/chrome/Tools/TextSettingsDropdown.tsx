import { useTiptapContext } from "../TiptapContext";
import { ToolbarItem } from "../Toolbar/ToolbarItem";
import { ColorInput } from "../Toolbar/Inputs/color/ColorInput";
import { PresetInput } from "../Toolbar/Inputs/preset/PresetInput";
import { textPresets } from "../../components/settings-stub";
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
        <div className="h-8 flex-1 overflow-hidden rounded-lg border border-border">
          <ColorInput propKey="color" label="" prefix="text" labelHide={true} />
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex items-center gap-2">
        <span className="w-16 text-xs font-medium">Preset</span>
        <div className="flex-1">
          <PresetInput
            presets={textPresets}
            type="select"
            label=""
            labelHide={true}
            wrap="control"
          />
        </div>
      </div>

      {/* Text Alignment */}
      <div className="flex items-center gap-2 border-t border-border pt-2">
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

export default TextSettingsDropdown;
