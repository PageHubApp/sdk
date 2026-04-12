import { TbHandMove } from "react-icons/tb";
import { ToolbarSection } from "../../index";
import ActionInput from "../action/ActionInput";
import { ColorInput } from "../color/ColorInput";
import { OpacityInput } from "../color/OpacityInput";
import { TailwindInput } from "./TailwindInput";
import { UniversalInput } from "../UniversalInput";

interface HoverClickInputProps {
  /**
   * Which hover properties to show
   * - "text": Only text color (for Text components)
   * - "container": Background, text, border colors + opacity (for Container components)
   * - "button": Background, text, border colors + opacity (for Button components)
   */
  variant?: "text" | "container" | "button" | "link";
}

export const HoverClickInput = ({ variant = "container" }: HoverClickInputProps) => {
  return (
    <>
      <ActionInput />

      <ToolbarSection
        title="Hover"
        icon={<TbHandMove />}
        help="Style changes when the cursor hovers over this element."
      >
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
          <ColorInput propKey="borderColor" label="Border" prefix="border" index="hover" inline />
        </ToolbarSection>
        <div className="border-base-300 border-t" />
        <OpacityInput label="Opacity" propKey="opacity" index="hover" propType="root" />
        <div className="border-base-300 border-t" />
        <ToolbarSection title="Transform" collapsible={false}>
          <UniversalInput
            propKey="scale"
            propTag="scale"
            tailwindKey="scale"
            allowedTypes={["tailwind", "calc"]}
            label="Scale"
            index="hover"
            showVarSelector={true}
            inline
          />
          <UniversalInput
            propKey="translateY"
            propTag="translate-y"
            tailwindKey="translateY"
            allowedTypes={["tailwind", "calc"]}
            label="Translate Y"
            index="hover"
            showVarSelector={true}
            inline
          />
          <UniversalInput
            propKey="shadow"
            propTag="shadow"
            tailwindKey="shadow"
            allowedTypes={["tailwind", "calc"]}
            label="Shadow"
            index="hover"
            showVarSelector={true}
            inline
          />
          <UniversalInput
            propKey="ringWidth"
            propTag="ring"
            tailwindKey="ringWidth"
            allowedTypes={["tailwind", "calc"]}
            label="Ring"
            index="hover"
            showVarSelector={true}
            inline
          />
        </ToolbarSection>
      </ToolbarSection>
    </>
  );
};
