// @ts-nocheck
import { useNode } from "@craftjs/core";
import { ViewAtom } from "../../../Viewport/atoms";
import { TbBoxPadding, TbInfoSquare } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { TailwindStyles } from "utils/tailwind";
import { ItemAdvanceToggle } from "../../Helpers/ItemSelector";
import { ToolbarSection } from "../../ToolbarSection";
import { UniversalInput } from "../UniversalInput";

export const PaddingInput = ({ propKey = "padding" }) => {
  const { propValues } = useNode(node => ({
    propValues: node.data.props,
  }));

  const view = useAtomValue(ViewAtom);

  return (
    <>
      <ToolbarSection
        title="Padding"
        icon={<TbBoxPadding />}
        full={1}
        help="The space inside this component."
        footer={
          <ItemAdvanceToggle propKey={propKey} title="More padding properties">
            <ToolbarSection full={2} collapsible={false}>
              <UniversalInput propKey="pt" propTag="pt" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="Top" showVarSelector={true} inline />
              <UniversalInput propKey="pb" propTag="pb" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="Bottom" showVarSelector={true} inline />
              <UniversalInput propKey="pl" propTag="pl" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="Left" showVarSelector={true} inline />
              <UniversalInput propKey="pr" propTag="pr" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="Right" showVarSelector={true} inline />
            </ToolbarSection>
          </ItemAdvanceToggle>
        }
      >
        <UniversalInput propKey="p" propTag="p" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="All Sides" showVarSelector={true} inline />
        <UniversalInput propKey="px" propTag="px" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="Horizontal" showVarSelector={true} inline />
        <UniversalInput propKey="py" propTag="py" allowedTypes={["tailwind", "calc", "px", "em", "rem", "%"]} label="Vertical" showVarSelector={true} inline />
      </ToolbarSection>

      {view === "mobile" &&
        TailwindStyles.px.indexOf(propValues[view]?.px) > TailwindStyles.px.indexOf("px-3") && (
          <ToolbarSection>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <TbInfoSquare /> Padding may be too large for mobile.
            </div>
          </ToolbarSection>
        )}
    </>
  );
};
