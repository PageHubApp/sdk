// @ts-nocheck
import { TbHandMove } from "react-icons/tb";
import { ToolbarSection } from "../../index";
import ClickItem from "../preset/ClickItem";
import { ColorInput } from "../color/ColorInput";
import { OpacityInput } from "../color/OpacityInput";

interface HoverClickInputProps {
  /**
   * Which hover properties to show
   * - "text": Only text color (for Text components)
   * - "container": Background, text, border colors + opacity (for Container components)
   * - "button": Background, text, border colors + opacity (for Button components)
   */
  variant?: "text" | "container" | "button";
}

export const HoverClickInput = ({ variant = "container" }: HoverClickInputProps) => {
  return (
    <>
      <ClickItem />

      <ToolbarSection title="Hover" icon={<TbHandMove />}>
        <ToolbarSection title="Colors" collapsible={false}>
          <ColorInput
            propKey="background"
            label="Background"
            prefix="bg"
            index="hover"
            propType="component"
            inline
          />
          <ColorInput
            propKey="color"
            label="Text"
            prefix="text"
            index="hover"
            propType="component"
            inline
          />
          <ColorInput
            propKey="borderColor"
            label="Border"
            prefix="border"
            index="hover"
            inline
          />
        </ToolbarSection>
        <div className="border-t border-border" />
        <OpacityInput label="Opacity" propKey="opacity" index="hover" propType="root" />
      </ToolbarSection>
    </>
  );
};
