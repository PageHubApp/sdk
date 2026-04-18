import React from "react";
import { TbCode } from "react-icons/tb";
import { LoadingBarSuspenseFallback } from "../../../primitives/LoadingBar";
import { ClassItem } from "../../items/ClassItem";
import { ToolbarSection } from "../../ToolbarSection";
const CSSEditorInput = React.lazy(() =>
  import("./CSSEditorInput").then(m => ({ default: m.CSSEditorInput }))
);

export const ClassNameInput = () => (
  <ClassItem
    propKey="className"
    type="className"
    propType="component"
    label=""
    labelHide={true}
    clearAllPlacement="after-append"
  >
    <React.Suspense fallback={<LoadingBarSuspenseFallback />}>
      <CSSEditorInput />
    </React.Suspense>
  </ClassItem>
);
