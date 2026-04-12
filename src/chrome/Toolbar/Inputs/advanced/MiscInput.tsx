import { TbSettings } from "react-icons/tb";
import { ToolbarSection } from "../../ToolbarSection";
import { TailwindInput } from "./TailwindInput";

export const MiscInput = () => (
  <ToolbarSection
    title="Misc"
    icon={<TbSettings />}
    nested={true}
    collapsible={true}
    defaultOpen={false}
  >
    <TailwindInput propKey="boxSizing" label="Box Sizing" prop="boxSizing" type="select" />
    <TailwindInput propKey="isolation" label="Isolation" prop="isolation" type="select" />
    <TailwindInput propKey="columns" label="Columns" prop="columns" type="select" />
    <TailwindInput propKey="breakBefore" label="Break Before" prop="breakBefore" type="select" />
    <TailwindInput propKey="breakInside" label="Break Inside" prop="breakInside" type="select" />
    <TailwindInput propKey="breakAfter" label="Break After" prop="breakAfter" type="select" />
    <TailwindInput propKey="listStyleType" label="List Style" prop="listStyleType" type="select" />
    <TailwindInput
      propKey="listStylePosition"
      label="List Position"
      prop="listStylePosition"
      type="select"
    />
    <TailwindInput propKey="tableLayout" label="Table Layout" prop="tableLayout" type="select" />
    <TailwindInput propKey="captionSide" label="Caption Side" prop="captionSide" type="select" />
    <TailwindInput propKey="content" label="Content" prop="content" type="select" />
    <TailwindInput propKey="srOnly" label="Screen Reader" prop="srOnly" type="select" />
    <TailwindInput propKey="fill" label="SVG Fill" prop="fill" type="select" />
    <TailwindInput propKey="stroke" label="SVG Stroke" prop="stroke" type="select" />
    <TailwindInput propKey="strokeWidth" label="Stroke Width" prop="strokeWidth" type="select" />
  </ToolbarSection>
);
