import { useNode } from "@craftjs/core";
import { useEditor } from "@craftjs/core";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { NoSettings } from "../../helpers/CloneHelper";
import { useGetNode } from "../../dialogs/toolHooks";
import { ToolbarSection } from "../../ToolbarSection";
import { renderComponentSlots } from "../helpers";

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
    Content: (
      <ToolbarSection collapsible={false}>
        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
};
