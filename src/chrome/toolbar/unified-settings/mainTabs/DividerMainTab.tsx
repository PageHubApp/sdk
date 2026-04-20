import { useNode } from "@craftjs/core";
import { useEditor } from "@craftjs/core";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { NoSettings } from "../../helpers/CloneHelper";
import { ColorInput } from "../../inputs/color/ColorInput";
import { useGetNode } from "../../dialogs/toolHooks";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";

export const DividerMainTab = () => {
  const { id } = useNode();
  const propValues = useGetNode().data.props;
  const { actions, query } = useEditor();

  if (propValues.relation?.relationType === "style") {
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
