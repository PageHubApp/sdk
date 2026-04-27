import { useNode } from "@craftjs/core";
import { LayoutPresetInput } from "../../inputs/layout/LayoutPresetInput";
import { useLayoutPreset } from "../../inputs/layout/hooks/useLayoutPreset";
import { useSDK } from "../../../../core/context";
import { renderComponentSlots } from "../helpers";
import { ToolbarSection } from "../../ToolbarSection";

/** Renders the host-provided data source section via editorChromeSlots (parity with Container). */
const DataSourceSlot = () => {
  const { id } = useNode();
  const { config } = useSDK();
  const render = config.editorChromeSlots?.renderDataSourceSection;
  if (!render) return null;
  return <>{render({ nodeId: id })}</>;
};

export const GridMainTab = () => {
  const layoutPreset = useLayoutPreset({ propKey: "layoutPreset", lockMode: "grid" });

  return (
    <>
      {renderComponentSlots({
        Content: (
          <ToolbarSection collapsible={false}>
            <LayoutPresetInput lp={layoutPreset} gridOnly sectionWrapper={false} />
          </ToolbarSection>
        ),
      })}
      <DataSourceSlot />
    </>
  );
};
