import { useEditor, useNode } from "@craftjs/core";
import { useEffect, useState } from "react";

export const GlobalSectionIndicator = () => {
  const { id, dom, type, name } = useNode(node => ({
    dom: node.dom,
    type: node.data.props.type,
    name: node.data.custom.displayName || node.data.displayName,
  }));

  const { isActive, hasSelectedChild } = useEditor((_, query) => {
    const isActive = query.getEvent("selected").contains(id);

    // Check if any child is selected
    const selectedNodes = query.getEvent("selected").all();
    const hasSelectedChild = selectedNodes.some(selectedId => {
      if (selectedId === id) return false; // Don't count self
      const node = query.node(selectedId).get();
      // Check if this selected node is a descendant of our node
      let parent = node.data.parent;
      while (parent) {
        if (parent === id) return true;
        const parentNode = query.node(parent).get();
        parent = parentNode?.data.parent;
      }
      return false;
    });

    return { isActive, hasSelectedChild };
  });

  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!dom || isActive || hasSelectedChild) {
      setIsHovering(false);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      const isWithinBounds =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      setIsHovering(isWithinBounds);
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [dom, isActive, hasSelectedChild]);

  // Only show for header and footer types
  if (type !== "header" && type !== "footer") return null;

  // Don't show if this node or any of its children are selected
  if (isActive || hasSelectedChild) return null;

  // Only show when hovering
  if (!isHovering) return null;

  return null;
};
