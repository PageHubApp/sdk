/**
 * Pure CraftJS tree-cloning utility.
 *
 * Lives in `core/` rather than `chrome/viewport/nodeOps.tsx` so that
 * `core/savedComponents.tsx` (used by both editor and viewer resolvers)
 * can call it without dragging the editor's viewport node-ops module
 * into the viewer / static-renderer bundles. Pure data-shape work — no
 * React, no editor chrome.
 */
import { getRandomId } from "@craftjs/utils";
import { addHasMany } from "../utils/relation";

export const buildClonedTree = ({ tree, query, setProp, createLinks = true }: any) => {
  const newNodes: Record<string, any> = {};
  const linksToCreate: Array<{ oldid: string; newNodeId: string }> = [];

  const changeNodeId = (node: any, newParentId?: string): string => {
    const newNodeId = getRandomId();
    const childNodes = node.data.nodes.map((childId: string) =>
      changeNodeId(tree.nodes[childId], newNodeId)
    );
    const linkedNodes = Object.keys(node.data.linkedNodes).reduce(
      (acc: Record<string, string>, id) => {
        acc[id] = changeNodeId(tree.nodes[node.data.linkedNodes[id]], newNodeId);
        return acc;
      },
      {}
    );

    const oldid = node.id;
    const freshNode = query
      .parseFreshNode({
        ...node,
        id: newNodeId,
        data: {
          ...node.data,
          parent: newParentId || node.data.parent,
          nodes: childNodes,
          linkedNodes,
        },
      })
      .toNode();
    newNodes[newNodeId] = freshNode;

    if (createLinks && query.node(oldid).get()) linksToCreate.push({ oldid, newNodeId });
    return newNodeId;
  };

  const rootNodeId = changeNodeId(tree.nodes[tree.rootNodeId]);

  if (linksToCreate.length > 0) {
    requestAnimationFrame(() => {
      linksToCreate.forEach(({ oldid, newNodeId }) => {
        setProp(oldid, (prop: any) => addHasMany(prop, newNodeId));
      });
    });
  }

  return {
    rootNodeId,
    nodes: newNodes,
    originalRootId: createLinks ? tree.rootNodeId : null,
  };
};
