import { Element, useEditor, useNode } from "@craftjs/core";
import { AddElement } from "../../Viewport/Toolbox/lib";

export const useContainerLayoutManager = () => {
  const { actions, query } = useEditor();
  const { id } = useNode();

  const adjustContainerCount = async (
    targetColumns: number,
    layoutMode: "flex-row" | "flex-col" | "grid"
  ) => {
    // Dynamically import Container to avoid circular dependency
    const { Container } = await import("../../../components/Container");

    const currentNode = query.node(id).get();
    const currentChildren = currentNode?.data?.nodes || [];

    // Count existing containers
    const containerCount = currentChildren.filter(nodeId => {
      const node = query.node(nodeId).get();
      return node?.data?.displayName === "Container";
    }).length;

    if (containerCount < targetColumns) {
      // Add missing containers
      const containersToAdd = targetColumns - containerCount;
      for (let i = 0; i < containersToAdd; i++) {
        AddElement({
          element: (
            <Element
              canvas
              is={Container}
              canDelete={true}
              className="flex w-full flex-col gap-4"
              custom={{ displayName: "Container" }}
            />
          ),
          actions,
          query,
          addTo: id,
        });
      }
    } else if (containerCount > targetColumns) {
      // Remove excess containers (keep the first targetColumns containers)
      const containerIds = currentChildren.filter(nodeId => {
        const node = query.node(nodeId).get();
        return node?.data?.displayName === "Container";
      });

      const containersToRemove = containerIds.slice(targetColumns);
      containersToRemove.forEach(containerId => {
        actions.delete(containerId);
      });
    }
  };

  return { adjustContainerCount };
};
