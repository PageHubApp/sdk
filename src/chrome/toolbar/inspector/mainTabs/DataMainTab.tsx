import { useNode } from "@craftjs/core";
import { LayoutPresetInput } from "../../inputs/layout/LayoutPresetInput";
import { useLayoutPreset } from "../../inputs/layout/hooks/useLayoutPreset";
import { ToolbarSection } from "../../ToolbarSection";
import { useGetNode } from "../../dialogs/toolHooks";
import { renderComponentSlots } from "../helpers";
import { SlotRenderer } from "../../../../registry";

/** Renders the host-provided data source section via the slot registry. */
const DataSourceSlot = () => {
  const { id } = useNode();
  return <SlotRenderer id="node/data-source-section" ctx={{ nodeId: id }} />;
};

export const DataMainTab = () => {
  const node = useGetNode();
  const props = node.data?.props;
  const layoutPreset = useLayoutPreset({ propKey: "layoutPreset" });

  const layoutSection = (
    <ToolbarSection collapsible={false}>
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
