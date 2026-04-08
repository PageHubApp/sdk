import { Element, useEditor } from "@craftjs/core";
import { AddElement } from "../../../Viewport/Toolbox/lib";
import { ToolbarItem } from "../../ToolbarItem";
import { useGetTypeProp, useTypeProps } from "../../Tools/lib";

export const ContainerTypeInput = () => {
  const { nodeProps } = useTypeProps();

  const flexDirection = useGetTypeProp(
    {
      propKey: "flexDirection",
    },
    nodeProps
  );

  const { actions, query } = useEditor();

  return (
    <>
      <ToolbarItem
        propKey="flexDirection"
        type="select"
        labelHide={true}
        label="Flex Direction"
        cols={true}
        inline
      >
        <option value=""> </option>

        <option value="flex-col">Column</option>
        <option value="flex-row">Row</option>

        <option value="flex-col-reverse">Reverse Column</option>
        <option value="flex-row-reverse">Reverse Row</option>
      </ToolbarItem>

      <button
        className="btn-primary w-full p-3"
        onClick={async () => {
          // Dynamically import Container to avoid circular dependency
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
      </button>
    </>
  );
};
