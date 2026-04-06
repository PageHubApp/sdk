import React from "react";
import { TbCode } from "react-icons/tb";
import { ClassItem } from "../../Items/ClassItem";
import { ToolbarSection } from "../../ToolbarSection";
const CSSEditorInput = React.lazy(() => import("./CSSEditorInput").then(m => ({ default: m.CSSEditorInput })));

export const ClassNameInput = () => (
  <ToolbarSection title="Custom CSS" icon={<TbCode />}>
    <ClassItem
      propKey="className"
      type="className"
      propType="component"
      label=""
      labelHide={true}
    />
    <CSSEditorInput inline />
  </ToolbarSection>
);
