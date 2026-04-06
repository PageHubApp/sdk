import { useEffect, useRef } from "react";
import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { IpsumGenerator } from "../../Inputs/media/IpsumGenerator";
import { PresetGroupRenderer } from "../../Inputs/preset/PresetRenderer";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { selectorPresets } from "utils/design/selectorPresets";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const TextMainTab = () => {
  const ref = useRef(null);

  useEffect(() => {
    const time = setTimeout(() => {
      ref?.current?.editor.focus();
      ref?.current?.editor.setSelection(ref?.current?.editor.getLength(), 0);
    }, 100);

    return () => {
      clearTimeout(time);
    };
  }, [ref]);

  return renderComponentSlots({
    Content: (
      <ToolbarSection title="Content" icon={SECTION_ICONS["Content"]} help="The HTML content displayed in this text block.">
        <ToolbarItem
          propKey="text"
          propType="component"
          type="codemirror"
          codeType="html"
          labelHide={true}
          placeholder="Enter HTML content"
          inline={false}
          label=""
        />
        <SettingsAiSlot />
        <IpsumGenerator propKey="text" propType="component" />
      </ToolbarSection>
    ),
    Presets: (
      <ToolbarSection title="Presets" icon={SECTION_ICONS["Presets"]} help="Quick-apply text styles and layouts.">
        <PresetGroupRenderer presets={selectorPresets.text} />
      </ToolbarSection>
    ),
  });
};
