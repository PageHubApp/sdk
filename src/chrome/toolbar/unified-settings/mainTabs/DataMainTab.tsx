import { useNode } from "@craftjs/core";
import { LayoutPresetInput } from "../../inputs/layout/LayoutPresetInput";
import { useLayoutPreset } from "../../inputs/layout/hooks/useLayoutPreset";
import { ToolbarSection } from "../../ToolbarSection";
import { useGetNode } from "../../dialogs/toolHooks";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";
import { useSDK } from "../../../../core/context";

/** Renders the host-provided data source section via editorChromeSlots. */
const DataSourceSlot = () => {
  const { id } = useNode();
  const { config } = useSDK();
  const render = config.editorChromeSlots?.renderDataSourceSection;
  if (!render) return null;
  return <>{render({ nodeId: id })}</>;
};

export const DataMainTab = () => {
  const node = useGetNode();
  const props = node.data?.props;
  const layoutPreset = useLayoutPreset({ propKey: "layoutPreset" });

  const layoutSection = (
    <ToolbarSection
      title="Content"
      icon={SECTION_ICONS.Content}
      propKey="display"
      help="Layout mode, presets, and display (flex, grid, block) for the repeated item template."
      defaultOpen
    >
      <LayoutPresetInput lp={layoutPreset} sectionWrapper={false} />
    </ToolbarSection>
  );

  return (
    <>
      <DataSourceSlot />
      {renderComponentSlots({
        Content: layoutSection,
      })}
    </>
  );
};
