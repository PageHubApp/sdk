import { useNode } from "@craftjs/core";
import { TailwindStyles } from "utils/tailwind";
import { ItemAdvanceToggle } from "../../Helpers/ItemSelector";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { TailwindInput } from "../advanced/TailwindInput";
import { PiImageFill } from "react-icons/pi";
import { BackgroundSettingsInput } from "./BackgroundSettingsInput";
import { ColorInput } from "./ColorInput";
import { OverlayInput } from "../layout/OverlayInput";

export const BackgroundInput = ({ children }: { children?: React.ReactNode }) => {
  const { props } = useNode(node => ({
    props: node.data.props,
  }));

  return (
    <ToolbarSection
      title="Background"
      icon={<PiImageFill />}
      help="Background image, color, gradient, and overlay."
      bodyClassName="px-3"
      footer={
        <ItemAdvanceToggle propKey="background" title="More background properties">
          <ToolbarSection full={1} collapsible={false}>
            <TailwindInput propKey="bgClip" label="BG Clip" prop="bgClip" type="select" />
            <TailwindInput propKey="bgBlend" label="BG Blend" prop="bgBlend" type="select" />
            <TailwindInput propKey="mixBlend" label="Mix Blend" prop="mixBlend" type="select" />
            {children}
          </ToolbarSection>
        </ItemAdvanceToggle>
      }
    >
      <BackgroundSettingsInput />

      {/* Overlay — only when background image is set */}
      {props?.backgroundImage && <OverlayInput />}

      {/* Gradient */}
      <ToolbarSection title="Gradient" nested={true}>
        <ToolbarItem
          propKey={"backgroundGradient"}
          propType="class"
          type="select"
          label={""}
          labelHide={true}
        >
          <option value="">None</option>
          {TailwindStyles.gradients.map((_, k) => (
            <option key={_}>{_}</option>
          ))}
        </ToolbarItem>

        {/\bbg-linear/.test(props?.className || "") && (
          <>
            <ColorInput
              propKey="backgroundGradientFrom"
              label="From"
              prefix="from"
              propType="class"
            />
            <ColorInput
              propKey="backgroundGradientTo"
              label="To"
              prefix="to"
              propType="class"
            />
          </>
        )}
      </ToolbarSection>
    </ToolbarSection>
  );
};
