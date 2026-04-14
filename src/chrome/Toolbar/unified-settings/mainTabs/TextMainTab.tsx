import { useEffect, useRef } from "react";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { IpsumGenerator } from "../../inputs/media/IpsumGenerator";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
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
      <ToolbarSection
        title="Content"
        icon={SECTION_ICONS["Content"]}
        help="The HTML content displayed in this text block."
      >
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
  });
};
