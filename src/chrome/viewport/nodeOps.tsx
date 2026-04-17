/**
 * Node tree operations — delete, add, save, clone, build trees.
 */

import { getRandomId, ROOT_NODE } from "@craftjs/utils";
import React from "react";
import generate from "../../utils/data/nameGenerator";
import { DeleteMedia } from "./api";
import { phStorage } from "../../utils/phStorage";

const fromEntries = (pairs: [string, any][]) => {
  if (Object.fromEntries) return Object.fromEntries(pairs);
  return pairs.reduce((acc, [id, value]) => ({ ...acc, [id]: value }), {} as Record<string, any>);
};

export const removeHasManyRelation = (node: any, query: any, actions: any) => {
  if (node.data.props?.belongsTo) {
    const belongsTo = query.node(node.data.props.belongsTo).get();
    if (belongsTo) {
      actions.setProp(
        node.data.props.belongsTo,
        (prop: any) => (prop.hasMany = prop.hasMany.filter((_: string) => _ !== node.id))
      );
    }
  }
};

export const deleteNode = async (
  query: any,
  actions: any,
  active: string | null,
  settings: any
) => {
  const selected = active || query.getEvent("selected").first();
  if (!selected) return;

  const node = query.node(selected).get();
  if (node.data.props.canDelete === false) return;

  if (node.data.props?.hasMany?.length) {
    node.data.props.hasMany.forEach((cloneId: string) => {
      try {
        const clone = query.node(cloneId).get();
        if (!clone) return;
        // Unlink the clone root
        actions.setProp(cloneId, (prop: any) => {
          prop.belongsTo = null;
          prop.relationType = "";
          prop.savedComponentName = "";
        });
        // Recursively unlink descendants
        const unlinkDescendants = (parentId: string) => {
          const parent = query.node(parentId).get();
          (parent?.data?.nodes || []).forEach((childId: string) => {
            const child = query.node(childId).get();
            if (child?.data?.props?.belongsTo) {
              actions.setProp(childId, (p: any) => {
                p.belongsTo = null;
                p.relationType = "";
              });
            }
            unlinkDescendants(childId);
          });
        };
        unlinkDescendants(cloneId);
      } catch {}
    });
  }

  removeHasManyRelation(node, query, actions);

  if (!node.data.parent || selected === ROOT_NODE) return;

  const parentId = node.data.parent;
  const { type, videoId, image, ico } = node.data.props || {};

  if (type === "cdn" && videoId) DeleteMedia(videoId, settings, query, actions);
  if (image) DeleteMedia(image, settings, query, actions);
  if (ico) DeleteMedia(ico, settings, query, actions);

  if (!query.node(selected).get()) return;
  actions.delete(selected);
  actions.selectNode(parentId);
};

export const addHandler = ({ actions, query, getCloneTree, id, data = null, setProp }: any) => {
  data = data || phStorage.getJSON("clipboard", {});
  const newNodes = JSON.parse(data.nodes);

  Object.keys(newNodes).forEach(_ => {
    const d = newNodes[_].props;
    if (d?.type === "page") {
      if (!d.canDelete) d.canDelete = true;
      if (newNodes[_].custom.displayName === "Home Page") {
        newNodes[_].custom.displayName = "Page";
        newNodes[_].props.isHomePage = false;
      }
      newNodes[_].custom.displayName = generate().spaced;
    }
  });

  const nodePairs = Object.keys(newNodes).map(nodeId => {
    const da = query
      .parseSerializedNode(newNodes[nodeId])
      .toNode((node: any) => (node.id = nodeId));
    return [nodeId, da];
  });
  const tree = { rootNodeId: data.rootNodeId, nodes: fromEntries(nodePairs as [string, any][]) };
  const newTree = getCloneTree(tree);

  const theNode = query.node(id).get();
  const parentNode = query.node(theNode?.data?.parent || ROOT_NODE).get();
  const indexToAdd = parentNode.data.nodes.indexOf(id);

  requestAnimationFrame(() => {
    actions.addNodeTree(newTree, parentNode.id, indexToAdd + 1);
    setTimeout(() => actions.selectNode(newTree.rootNodeId), 50);
  });
};

export const saveHandler = async ({ query, id, component = null, actions = null }: any) => {
  const tree = query.node(id).toNodeTree();
  const nodePairs = Object.keys(tree.nodes).map((nodeId: string) => [
    nodeId,
    query.node(nodeId).toSerializedNode(),
  ]);
  const entries = fromEntries(nodePairs as [string, any][]);
  const serializedNodesJSON = JSON.stringify(entries);

  const rootNode = query.node(tree.rootNodeId).get();
  const componentName =
    rootNode?.data?.custom?.displayName ||
    rootNode?.data?.displayName ||
    rootNode?.data?.name ||
    `Component ${Date.now()}`;

  const saveData = { rootNodeId: tree.rootNodeId, nodes: serializedNodesJSON, name: componentName };

  if (component && actions) {
    const originalNode = query.node(id).get();
    const originalParent = originalNode.data.parent;
    const originalParentNode = query.node(originalParent).get();
    const originalIndex = originalParentNode.data.nodes.indexOf(id);

    const { Container } = await import("../../components/Container");
    const Element = (await import("@craftjs/core")).Element;

    const componentWrapper = query
      .parseReactElement(
        <Element
          canvas
          is={Container}
          type="component"
          custom={{ displayName: componentName }}
          className="flex flex-col gap-0 bg-transparent"
        />
      )
      .toNodeTree();

    actions.addNodeTree(componentWrapper, ROOT_NODE);
    const componentId = componentWrapper.rootNodeId;

    actions.move(id, componentId, 0);

    const clonedTree = buildClonedTree({
      tree: query.node(id).toNodeTree(),
      query,
      setProp: actions.setProp,
      createLinks: true,
    });
    actions.addNodeTree(clonedTree, originalParent, originalIndex);

    setTimeout(async () => {
      const { setRecursiveBelongsTo } = await import("@/utils/componentUtils");
      setRecursiveBelongsTo(
        clonedTree.rootNodeId,
        id,
        query,
        actions,
        (clonedNodeId: string, prop: any) => {
          if (clonedNodeId === clonedTree.rootNodeId) prop.savedComponentName = componentName;
        }
      );
      actions.selectNode(clonedTree.rootNodeId);
    }, 50);

    const componentTreePairs = Object.keys(tree.nodes).map((nodeId: string) => [
      nodeId,
      query.node(nodeId).toSerializedNode(),
    ]);
    return {
      rootNodeId: id,
      nodes: JSON.stringify(fromEntries(componentTreePairs as [string, any][])),
      name: componentName,
    };
  }

  phStorage.set("clipboard", saveData);
  return saveData;
};

export const getNodeTree = ({ tree, query }: any) => {
  const newNodes: Record<string, any> = {};
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
    return newNodeId;
  };

  return { rootNodeId: changeNodeId(tree.nodes[tree.rootNodeId]), nodes: newNodes };
};

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
        setProp(oldid, (prop: any) => {
          prop.hasMany = prop.hasMany || [];
          prop.hasMany.push(newNodeId);
        });
      });
    });
  }

  return { rootNodeId, nodes: newNodes, originalRootId: createLinks ? tree.rootNodeId : null };
};

export type Position = "top" | "bottom" | "left" | "right";
export type Align = "start" | "middle" | "end";
