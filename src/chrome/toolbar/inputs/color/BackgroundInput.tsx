import { useNode } from "@craftjs/core";
import { ItemAdvanceToggle } from "../../helpers/ItemSelector";
import { ToolbarSection } from "../../ToolbarSection";
import { TailwindInput } from "../advanced/TailwindInput";
import { PiImageFill } from "react-icons/pi";
import { BackgroundSettingsInput } from "./BackgroundSettingsInput";
import { ColorInput } from "./ColorInput";
import { GradientInput } from "./GradientInput";

export const BackgroundInput = ({ children }: { children?: React.ReactNode }) => {
  return (
    <ToolbarSection
      title="Background"
      icon={<PiImageFill />}
      help="Background color, image, and gradient."
      bodyClassName="px-3"
      footer={
        <ItemAdvanceToggle propKey="background" title="More background properties">
          <ToolbarSection full={1} collapsible={false}>
            <TailwindInput propKey="bgClip" label="BG Clip" prop="bgClip" type="select" />
            <TailwindInput propKey="bgBlend" label="BG Blend" prop="bgBlend" type="select" />
            <TailwindInput propKey="mixBlend" label="Mix Blend" prop="mixBlend" type="select" />
          </ToolbarSection>
        </ItemAdvanceToggle>
      }
    >
      <ColorInput propKey="background" label="Color" prefix="bg" inline />

      <BackgroundSettingsInput />

      {/* Pattern — passed as children from UnifiedSettings */}
      {children}

      {/* Gradient */}
      <ToolbarSection title="Gradient" nested={true}>
        <GradientInput />
      </ToolbarSection>
    </ToolbarSection>
  );
};
