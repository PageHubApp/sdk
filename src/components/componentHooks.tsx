import { useEditor } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { applyPattern } from "../utils/lib";
export const RenderPattern = ({
  children,
  props,
  settings,
  view,
  enabled,
  properties,
  preview,
  query,
}) => {
  const inlayProps = applyPattern({}, props, settings);
  const inlayClass = "flex flex-col flex-1 w-full";

  if (inlayProps?.style?.backgroundImage) {
    return (
      <div className={inlayClass} {...inlayProps}>
        {children}
      </div>
    );
  }

  return children;
};

export const inlayProps = [
  "backgroundGradient",
  "backgroundGradientTo",
  "backgroundGradientFrom",
  "px",
  "py",
  "flexDirection",
  "alignItems",
  "justifyContent",
  "flexGrow",
  "p",
  "gap",
];

export const useFindScrollingParent = id => {
  const [scrollingParent, setScrollingParent] = useState<HTMLElement | null>(null);
  const element: HTMLElement = document.querySelector(`[node-id="${id}"]`);
  const classesToCheck = ["overflow-auto", "overflow-y-auto"];

  useEffect(() => {
    let currentElement = element?.parentElement;
    while (currentElement && currentElement !== null) {
      const hasClass = classesToCheck.some(className =>
        currentElement.classList.contains(className)
      );

      if (currentElement.scrollHeight > currentElement.clientHeight && hasClass) {
        setScrollingParent(currentElement);
        break;
      }
      currentElement = currentElement.parentElement;
    }
  }, [element, classesToCheck]);

  return scrollingParent;
};

// Hook to check if an element is in the viewport of its parent scrolling container
export const useIsInViewport = (
  element: HTMLElement | null,
  scrollingParent: HTMLElement | null
) => {
  const [isInViewport, setIsInViewport] = useState(false);

  useEffect(() => {
    if (element && scrollingParent) {
      const rect = element.getBoundingClientRect();
      setIsInViewport(
        rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= scrollingParent.clientHeight &&
          rect.right <= scrollingParent.clientWidth
      );
    }
  }, [element, scrollingParent]);

  return isInViewport;
};

export const useScrollToSelected = (id, enabled) => {
  const { isSelected } = useEditor(state => ({
    isSelected: (() => {
      try {
        return state.events?.selected?.has?.(id) || false;
      } catch {
        return false;
      }
    })(),
  }));
  const prevSelectedRef = useRef(false);

  useEffect(() => {
    const wasSelected = prevSelectedRef.current;
    prevSelectedRef.current = isSelected;

    // Only scroll when this node becomes newly selected, not on enabled toggle
    if (!id || !enabled || !isSelected || wasSelected) return;

    const el: HTMLElement = document.querySelector(`[node-id="${id}"]`);
    if (!el) return;

    const classesToCheck = ["overflow-auto", "overflow-y-auto"];
    let scrollingDiv = null;
    let currentElement = el.parentElement;
    while (currentElement !== null) {
      const hasClass = classesToCheck.some(className =>
        currentElement.classList.contains(className)
      );

      if (currentElement.scrollHeight > currentElement.clientHeight && hasClass) {
        scrollingDiv = currentElement;
        break;
      }
      currentElement = currentElement.parentElement;
    }

    if (!scrollingDiv) return;

    // Use getBoundingClientRect to compare exactly where the element is
    // relative to the scrolling container's screen viewport box
    const rect = el.getBoundingClientRect();
    const scrollingRect = scrollingDiv.getBoundingClientRect();

    // Consider it in viewport if it's vertically mostly inside the scroll area
    // Allowing a small 20px buffer
    const inViewport =
      rect.top >= scrollingRect.top - 20 && rect.bottom <= scrollingRect.bottom + 20;

    if (!inViewport) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [id, enabled, isSelected]);
};

/**
 * Gets child nodes of a specific type from a parent container
 * Shared utility used by auto-list-grouped Containers and similar consumers
 */
export const useChildNodes = (parentId: string, componentName: string) => {
  return useEditor((_, query) => {
    try {
      const node = query.node(parentId).get();
      const children = node.data.nodes
        .map(childId => {
          try {
            const childNode = query.node(childId).get();

            // Only include components of the specified type
            if (childNode.data.name !== componentName) return null;

            return {
              id: childId,
              name: childNode.data.name,
              props: childNode.data.props,
              displayName: childNode.data.displayName || componentName,
            };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean); // Remove nulls

      return { children };
    } catch (e) {
      return { children: [] };
    }
  });
};
