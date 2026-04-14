import { useEditor, useNode } from "@craftjs/core";
import { useEffect } from "react";
import { registerProximityTarget, unregisterProximityTarget } from "./proximityHoverRegistry";

/**
 * Components opt out of proximity hover via `custom.hoverable = false`.
 * Everything with a DOM element is hoverable by default.
 */
function isInteractiveElementFromNode(node: {
  data?: { custom?: Record<string, any> };
}): boolean {
  return node.data?.custom?.hoverable !== false;
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
