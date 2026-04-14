import { TailwindStyles } from "@/utils/tailwind";
import { ToolbarItem } from "../../ToolbarItem";
import { ToolbarSection } from "../../ToolbarSection";
import { FlexDirectionInput } from "./FlexDirectionInput";
import { GapInput } from "./GapInput";
import { TailwindInput } from "../advanced/TailwindInput";

type FlexMode = "columns" | "rows" | undefined;

interface FlexInputProps {
  propKey?: string;
  mode?: FlexMode;
}

export const FlexInput = ({ propKey = "flexDirection", mode }: FlexInputProps) => (
  <>
    <ToolbarSection title="Settings" collapsible={true} nested={true}>
      <FlexDirectionInput mode={mode} />

      <GapInput />
    </ToolbarSection>

    {/* Container Alignment - controls children */}
    <ToolbarSection title="Alignment" collapsible={true} nested={true}>
      <ToolbarItem
        propKey="alignItems"
        type="select"
        label="Align Items"
        labelHide={true}
        cols={true}
        inline
      >
        <option value=""> </option>
        {TailwindStyles.alignItems.map((_, k) => (
          <option key={k}>{_}</option>
        ))}
      </ToolbarItem>

      <ToolbarItem
        propKey="justifyContent"
        type="select"
        labelHide={true}
        label="Justify Content"
        cols={true}
        inline
      >
        <option value=""> </option>
        {TailwindStyles.justifyContent.map((_, k) => (
          <option key={k}>{_}</option>
        ))}
      </ToolbarItem>

      <ToolbarItem
        propKey="justifyItems"
        type="select"
        labelHide={true}
        label="Justify Items"
        cols={true}
        inline
      >
        <option value=""> </option>
        {TailwindStyles.justifyItems.map((_, k) => (
          <option key={k}>{_}</option>
        ))}
      </ToolbarItem>
    </ToolbarSection>

    {/* Self Alignment - controls this item within parent */}
    <ToolbarSection title="Self Alignment" collapsible={true} nested={true}>
      <ToolbarItem
        propKey="alignSelf"
        type="select"
        label="Align Self"
        labelHide={true}
        cols={true}
        inline
      >
        <option value=""> </option>
        {TailwindStyles.alignSelf.map((_, k) => (
          <option key={k}>{_}</option>
        ))}
      </ToolbarItem>

      <ToolbarItem
        propKey="justifySelf"
        type="select"
        labelHide={true}
        label="Justify Self"
        cols={true}
        inline
      >
        <option value=""> </option>
        {TailwindStyles.justifySelf.map((_, k) => (
          <option key={k}>{_}</option>
        ))}
      </ToolbarItem>
    </ToolbarSection>

    {/* Advanced - Grow/Shrink */}
    <ToolbarSection title="Advanced" collapsible={true} nested={true} defaultOpen={false}>
      <TailwindInput propKey="flexBase" label="Grow/Shrink" prop="flexBase" />
    </ToolbarSection>
  </>
);
