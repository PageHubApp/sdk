import { TbHandClick } from "react-icons/tb";
import { ToolbarSection } from "../../ToolbarSection";
import { TailwindInput } from "./TailwindInput";

export const InteractivityInput = () => (
  <ToolbarSection
    title="Interactivity"
    icon={<TbHandClick />}
    nested={true}
    collapsible={true}
    defaultOpen={false}
  >
    <TailwindInput propKey="resize" label="Resize" prop="resize" type="select" />
    <TailwindInput propKey="touchAction" label="Touch Action" prop="touchAction" type="select" />
    <TailwindInput
      propKey="scrollBehavior"
      label="Scroll Behavior"
      prop="scrollBehavior"
      type="select"
    />
    <TailwindInput propKey="scrollSnapType" label="Snap Type" prop="scrollSnapType" type="select" />
    <TailwindInput
      propKey="scrollSnapAlign"
      label="Snap Align"
      prop="scrollSnapAlign"
      type="select"
    />
    <TailwindInput propKey="scrollSnapStop" label="Snap Stop" prop="scrollSnapStop" type="select" />
    <TailwindInput propKey="appearance" label="Appearance" prop="appearance" type="select" />
  </ToolbarSection>
);
