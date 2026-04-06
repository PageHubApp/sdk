import { useNode } from "@craftjs/core";
import { TailwindStyles } from "utils/tailwind";
import { ItemAdvanceToggle } from "../../Helpers/ItemSelector";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { TailwindInput } from "../advanced/TailwindInput";
import { TbBorderAll } from "react-icons/tb";
import { ColorInput } from "../color/ColorInput";
import { RadiusInput } from "./RadiusInput";

export const BorderInput = ({ index = "" }) => {
  const { props } = useNode(node => ({
    props: node.data.props,
  }));

  return (
    <>
      <ToolbarSection
        full={1}
        title="Border"
        icon={<TbBorderAll />}
        help="Border width, color, style, and which sides to show."
        footer={
          <ItemAdvanceToggle propKey="border" title="More border properties">
            <ToolbarSection full={1} collapsible={false}>
              <ToolbarItem
                propKey="borderStyle"
                propType="class"
                type="select"
                label="Style"
                index={index}
                inline
              >
                <option value=""> </option>
                {TailwindStyles.borderStyle.map((_, k) => (
                  <option key={_}>{_}</option>
                ))}
              </ToolbarItem>
            </ToolbarSection>

            <ToolbarSection full={2} title="" collapsible={false}>
              <ToolbarItem
                propKey="borderTop"
                propType="class"
                type="checkbox"
                option=""
                on="border-t"
                labelHide={true}
                label="Top"
                index={index}
                inline
                inputWidth="w-fit"
              />
              <ToolbarItem
                propKey="borderBottom"
                propType="class"
                type="checkbox"
                option=""
                on="border-b"
                labelHide={true}
                label="Bottom"
                index={index}
                inline
                inputWidth="w-fit"
              />
              <ToolbarItem
                propKey="borderLeft"
                propType="class"
                type="checkbox"
                option=""
                on="border-l"
                labelHide={true}
                label="Left"
                index={index}
                inline
                inputWidth="w-fit"
              />
              <ToolbarItem
                propKey="borderRight"
                propType="class"
                type="checkbox"
                option=""
                on="border-r"
                labelHide={true}
                label="Right"
                index={index}
                inline
                inputWidth="w-fit"
              />
            </ToolbarSection>

            <ToolbarSection full={1} title="Divide" subtitle={true} collapsible={false}>
              <TailwindInput propKey="divideX" label="Divide X" prop="divideX" type="select" />
              <TailwindInput propKey="divideY" label="Divide Y" prop="divideY" type="select" />
              <TailwindInput propKey="divideStyle" label="Divide Style" prop="divideStyle" type="select" />
              <ColorInput
                propKey="divideColor"
                label="Divide Color"
                prefix="divide"
                propType="class"
                index={index}
                inline
              />
            </ToolbarSection>
          </ItemAdvanceToggle>
        }
      >
        <ToolbarItem
          propKey="border"
          propType="class"
          type="select"
          label="Size"
          index={index}
          max={TailwindStyles.border.length - 1}
          min={0}
          valueLabels={TailwindStyles.border}
          showVarSelector={true}
          inline
        />

        <RadiusInput />

        {/\bborder(-[^\s])?/.test(props?.className || "") && (
          <>
            <ColorInput
              propKey="borderColor"
              label="Color"
              prefix="border"
              propType="class"
              index={index}
              inline
            />
          </>
        )}
      </ToolbarSection>
    </>
  );
};
