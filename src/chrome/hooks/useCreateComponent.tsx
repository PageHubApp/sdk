import { Element, useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useAtomState } from "@zedux/react";
import React from "react";
import { Container } from "../../components/Container";
import { Text } from "../../components/Text";
import { useSetAtomState } from "../../utils/atoms";
import { CanvasIsolateAtom } from "../../utils/componentIsolation";
import { ComponentsAtom, ViewModeAtom } from "../../utils/lib";

/**
 * Create a blank `type: "component"` Container under ROOT, register it in
 * ComponentsAtom, switch to canvas mode (if needed), and isolate it.
 *
 * Single source of truth — used by ComponentSelector, EditorEmptyState, and
 * the canvas viewport's "+ component" toolbar button.
 */
export function useCreateComponent(): () => void {
  const { query, actions } = useEditor();
  const [components, setComponents] = useAtomState(ComponentsAtom);
  const [viewModeRaw, setViewMode] = useAtomState(ViewModeAtom);
  const setCanvasIsolate = useSetAtomState(CanvasIsolateAtom);
  const viewMode = viewModeRaw as unknown as string;

  return React.useCallback(() => {
    try {
      const componentName = "New Component";
      const tree = query
        .parseReactElement(
          <Element
            canvas
            is={Container}
            type="component"
            custom={{ displayName: componentName }}
            className="flex flex-col items-start gap-4 bg-transparent p-6"
          >
            <Text text="Start editing your component..." />
          </Element>
        )
        .toNodeTree();
      actions.addNodeTree(tree, ROOT_NODE);
      const containerId = tree.rootNodeId;
      const contentNodeId = tree.nodes[containerId].data.nodes[0];

      requestAnimationFrame(() => {
        const contentTree = query.node(contentNodeId).toNodeTree();
        const nodePairs = Object.keys(contentTree.nodes).map((id) => [
          id,
          query.node(id).toSerializedNode(),
        ]);
        setComponents([
          ...components,
          {
            rootNodeId: contentNodeId,
            nodes: JSON.stringify(Object.fromEntries(nodePairs)),
            name: componentName,
          } as any,
        ]);
        if (viewMode !== "canvas") setViewMode("canvas" as any);
        setCanvasIsolate(containerId as any);
      });
    } catch (e) {
      console.error("[useCreateComponent] failed to create component", e);
    }
  }, [query, actions, components, setComponents, viewMode, setViewMode, setCanvasIsolate]);
}
