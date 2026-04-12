import { useNode } from "@craftjs/core";
import { useEditor } from "@craftjs/core";
import { SettingsAiSlot } from "../../../SettingsAiSlot";
import { NoSettings } from "../../Helpers/CloneHelper";
import { ColorInput } from "../../Inputs/color/ColorInput";
import { useGetNode } from "../../Tools/lib";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const DividerMainTab = () => {
  const { id } = useNode();
  const propValues = useGetNode().data.props;
  const { actions, query } = useEditor();

  if (propValues.relationType === "style") {
    return (
      <ToolbarSection>
        <NoSettings query={query} actions={actions} id={id} />
        <SettingsAiSlot />
      </ToolbarSection>
    );
  }

  return renderComponentSlots({
    Properties: (
      <ToolbarSection
        full={1}
        title="Properties"
        icon={SECTION_ICONS["Properties"]}
        help="Divider color."
      >
        <ColorInput propKey="background" label="Background" prefix="bg" propType="class" />
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
};
