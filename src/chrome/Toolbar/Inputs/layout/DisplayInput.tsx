import { TbAdjustments } from "react-icons/tb";
import { ItemAdvanceToggle } from "../../Helpers/ItemSelector";
import { ToolbarSection } from "../../ToolbarSection";
import { TailwindInput } from "../advanced/TailwindInput";
import { InteractivityInput } from "../advanced/InteractivityInput";
import { MiscInput } from "../advanced/MiscInput";
import { CursorInput } from "../advanced/CursorInput";
import { OverflowInput } from "./OverflowInput";
import { PositionOffsetsInput } from "./PositionOffsetsInput";
import { UniversalInput } from "../UniversalInput";
import { OrderInput } from "./OrderInput";

export const DisplayInput = ({ showCursor = true }: { showCursor?: boolean }) => (
  <ToolbarSection
    title="Display"
    icon={<TbAdjustments />}
    footer={
      <ItemAdvanceToggle propKey="display" title="More display properties">
        <ToolbarSection full={1} collapsible={false}>
          <TailwindInput propKey="visibility" label="Visibility" prop="visibility" type="select" />
          <UniversalInput
            propKey="zIndex"
            propTag="z"
            tailwindKey="zIndex"
            allowedTypes={["tailwind", "calc"]}
            label="Z-Index"
            showVarSelector={true}
            inline
          />
          <TailwindInput propKey="pointerEvents" label="Pointer Events" prop="pointerEvents" type="select" />
          <TailwindInput propKey="userSelect" label="User Select" prop="userSelect" type="select" />
        </ToolbarSection>
      </ItemAdvanceToggle>
    }
  >
    <UniversalInput
      propKey="display"
      propTag="block"
      tailwindKey="display"
      allowedTypes={["tailwind", "calc"]}
      label="Display"
      labelHide={false}
      showVarSelector={true}
    />

    <UniversalInput
      propKey="position"
      propTag="relative"
      tailwindKey="position"
      allowedTypes={["tailwind", "calc"]}
      label="Position"
      labelHide={false}
      showVarSelector={true}
    />

    {showCursor ? <CursorInput /> : null}

    <OverflowInput />

    <OrderInput />

    <PositionOffsetsInput />
    <InteractivityInput />
    <MiscInput />
  </ToolbarSection>
);
