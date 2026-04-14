import { Element, useEditor } from "@craftjs/core";
import { ToolbarDashedButton } from "../../helpers/ToolbarDashedButton";
import { AddElement } from "../../../viewport/toolbox/toolboxUtils";

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
              className="gap-section flex w-full flex-col"
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
