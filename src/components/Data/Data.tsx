import { useEditor, useNode } from "@craftjs/core";
import React from "react";
import { useContainerRender, type ContainerProps } from "../Container/Container";
import { useDataSource } from "../../utils/data/useDataSource";
import { partitionDataChildIds } from "../../utils/data/emptySlot";
import type { DataProps } from "./Data.body";
export type { DataProps };

export const Data = (incomingProps: Partial<DataProps>) => {
  const { enabled, query } = useEditor(state => ({ enabled: state.options.enabled }));
  const { childNodes } = useNode(node => ({ childNodes: node.data.nodes as string[] }));

  // Split the Craft children into the repeater template vs the empty-state slot
  // (`custom.dataRole: "empty"`). React children mount 1:1 with `node.data.nodes`
  // in order; guard on matching counts and fall back to "all template, no empty
  // slot" if that ever doesn't hold, so editing never blanks the node.
  const { templateChildIds, emptyChildIds } = partitionDataChildIds(
    childNodes,
    id => query.node(id).get()?.data?.custom?.dataRole as string | undefined
  );
  const childArray = React.Children.toArray(incomingProps.children);
  let templateChildren: React.ReactNode = incomingProps.children;
  let emptyChildren: React.ReactNode = undefined;
  if (emptyChildIds.length > 0 && childArray.length === childNodes.length) {
    const emptySet = new Set(emptyChildIds);
    const tpl: React.ReactNode[] = [];
    const emp: React.ReactNode[] = [];
    childNodes.forEach((id, i) => (emptySet.has(id) ? emp : tpl).push(childArray[i]));
    templateChildren = tpl;
    emptyChildren = <>{emp}</>;
  }

  const { renderChildren } = useDataSource(incomingProps.dataSource, {
    livePreview: incomingProps.livePreview,
    enabled,
    emptyState: emptyChildren,
  });
  return useContainerRender(
    { ...incomingProps, children: templateChildren } as Partial<ContainerProps>,
    { renderChildren }
  );
};

Data.craft = {
  displayName: "Data",
  rules: {
    canDrag: () => true,
    canDelete: () => true,
  },
};
