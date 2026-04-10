import { Element, useEditor } from "@craftjs/core";
import { ToolbarDashedButton } from "../../Helpers/ToolbarDashedButton";
import { AddElement } from "../../../Viewport/Toolbox/lib";

/**
 * Quick-add nested Container — rendered in the Layout tab (LayoutPresetInput) for Container
 * nodes, after layout presets, dashed affordance to match other toolbar “add” controls.
 */
export const ContainerTypeInput = (_props?: { hasHeader?: boolean; hasFooter?: boolean }) => {
  const { actions, query } = useEditor();

  return (
    <ToolbarDashedButton
      onClick={async () => {
        const { Container } = await import("../../../../components/Container");

        AddElement({
          element: (
            <Element
              canvas
              is={Container}
              canDelete={true}
              className="flex flex-col w-full gap-section"
              custom={{ displayName: "Container" }}
            />
          ),
          actions,
          query,
        });
      }}
    >
      Add Container
    </ToolbarDashedButton>
  );
};
