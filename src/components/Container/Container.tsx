import { useEditor, useNode } from "@craftjs/core";
import React from "react";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { useMounted } from "../../utils/hooks/useMounted";
import { extractRootDataFromQuery } from "../../utils/page/pageManagement";
import type { RenderCtx } from "../../render/RenderCtx";

import {
  renderContainerBody,
  type ContainerProps,
  type ContainerRenderOptions,
} from "./Container.body";
export {
  renderContainerBody,
  type ContainerProps,
  type ContainerRenderOptions,
};

/** Editor wrapper — builds RenderCtx from Craft hooks then delegates. */
export function useContainerRender(
  incomingProps: Partial<ContainerProps>,
  opts?: ContainerRenderOptions
) {
  const baseProps: any = {
    type: "container",
    canDelete: true,
    canEditName: true,
    isHomePage: false,
    ...incomingProps,
  };
  const {
    connectors: { connect, drag },
  } = useNode();
  const { query, enabled } = useEditor(state => getClonedState(baseProps, state));
  const { name, id, isHovered, hasChildNodes, isCanvasNode, isActive } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
    isActive: node.events.selected,
    isHovered: node.events.hovered,
    hasChildNodes: node.data.nodes.length > 0,
    isCanvasNode: node.data.isCanvas,
  }));
  const propsClone: any = setClonedProps(baseProps, query, ["order"]);
  const isMounted = useMounted();
  const { rootProps, pageMedia, pageIndex } = React.useMemo(
    () => extractRootDataFromQuery(query),
    [query]
  );
  const ctx: RenderCtx = {
    id, enabled, isMounted, isActive, isHovered,
    hasChildNodes, isCanvasNode, name,
    connect, drag, setProp: () => {},
    rootProps, pageMedia, pageIndex, query,
  };
  return renderContainerBody(propsClone, ctx, opts);
}

export const Container = (incomingProps: Partial<ContainerProps>) => {
  return useContainerRender(incomingProps);
};

const SECTION_PARENTS = new Set(["page", "component", "header", "footer"]);

const canMoveIn = (nodes: any, into: any) => {
  return nodes.every((node: any) => {
    if (node?.data?.props?.type === "form") {
      if (into.data?.props?.type === "form") return false;
    }
    if (node?.data?.props?.type === "page") {
      return into.id === "ROOT";
    }
    if (node?.data?.props?.type === "section") {
      return SECTION_PARENTS.has(into.data?.props?.type);
    }
    return true;
  });
};

Container.craft = {
  displayName: "Container",
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: (node: any, into: any) => canMoveIn(node, into),
  },
};
