// @ts-nocheck
import { TbAdjustments } from "react-icons/tb";
import { ToolbarSection } from "../../ToolbarSection";
import { CursorInput } from "../advanced/CursorInput";
import { OverflowInput } from "./OverflowInput";
import { UniversalInput } from "../UniversalInput";
import { OrderInput } from "./OrderInput";

export const DisplayInput = ({ showCursor = true }: { showCursor?: boolean }) => (
  <ToolbarSection title="Display" icon={<TbAdjustments />}>
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
  </ToolbarSection>
);
