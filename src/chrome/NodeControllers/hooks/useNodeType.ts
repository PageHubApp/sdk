import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";

export enum NodeType {
  Page = "page",
  Section = "section",
  Header = "header",
  Footer = "footer",
  Component = "component",
  Container = "container",
  Form = "form",
  Background = "background",
}

export const useNodeType = (): NodeType | null => {
  const { parent, currentNodeType } = useNode(node => ({
    parent: node.data.parent,
    currentNodeType: node.data.props?.type,
  }));

  const { query } = useEditor();
  const parentNode = query.node(parent || ROOT_NODE).get();
  const propType = parentNode?.data?.props?.type;

  // Return the current node's type if it matches our enum
  if (Object.values(NodeType).includes(currentNodeType as NodeType)) {
    return currentNodeType as NodeType;
  }

  // For sections inside pages
  if (propType === "page") return NodeType.Section;

  return null;
};

// Helper functions for easy type checking
export const useNodeTypeHelpers = () => {
  const type = useNodeType();

  // Check if parent is a section (for isContent)
  const { parent } = useNode(node => ({
    parent: node.data.parent,
  }));

  const { query } = useEditor();
  const parentNode = query.node(parent || ROOT_NODE).get();
  const grandParentNode = parentNode?.data?.parent
    ? query.node(parentNode.data.parent).get()
    : null;
  const isContent = grandParentNode?.data?.props?.type === "page";

  return {
    type,
    isPage: type === NodeType.Page,
    isSection: type === NodeType.Section,
    isHeader: type === NodeType.Header,
    isFooter: type === NodeType.Footer,
    isComponent: type === NodeType.Component,
    isContainer: type === NodeType.Container,
    isForm: type === NodeType.Form,
    isBackground: type === NodeType.Background,
    isContent,
  };
};
