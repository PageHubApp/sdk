import { useEditor, useNode } from "@craftjs/core";
import { useEffect } from "react";
import { registerProximityTarget, unregisterProximityTarget } from "./proximityHoverRegistry";

function isInteractiveElementFromNode(node: {
  data?: { name?: string; displayName?: string };
}): boolean {
  const n = node.data?.name;
  const d = node.data?.displayName;
  return (
    n === "Container" ||
    d === "Container" ||
    n === "Button" ||
    d === "Button" ||
    n === "Text" ||
    d === "Text" ||
    n === "Image" ||
    d === "Image" ||
    n === "Nav" ||
    d === "Nav" ||
    n === "Header" ||
    d === "Header" ||
    n === "Footer" ||
    d === "Footer"
  );
}

/**
 * Registers this node's DOM for document-level proximity hover (ProximityHoverManager).
 */
export const ProximityHover = () => {
  const { id, dom, isInteractiveElement } = useNode(node => ({
    dom: node.dom,
    isInteractiveElement: isInteractiveElementFromNode(node),
  }));

  const { isSelected } = useEditor((_, query) => ({
    isSelected: query.getEvent("selected").contains(id),
  }));

  useEffect(() => {
    if (!dom || !isInteractiveElement) return;
    registerProximityTarget(id, dom);
    return () => unregisterProximityTarget(id);
  }, [id, dom, isInteractiveElement]);

  useEffect(() => {
    if (!dom || !isInteractiveElement || !isSelected) return;
    if (!dom.matches(":hover")) dom.removeAttribute("data-hover");
  }, [dom, isInteractiveElement, isSelected]);

  return null;
};
