import { useEditor, useNode } from "@craftjs/core";
import { useLayoutEffect } from "react";
import { useSelectionDom } from "./EditorSelectionDomContext";

export const RenderNodeDataStates = () => {
  const { isHover, name, dom, id } = useNode(node => ({
    isHover: node.events.hovered,
    dom: node.dom,
    name: node.data.custom.displayName || node.data.displayName,
  }));

  const { enabled } = useEditor(state => ({
    enabled: state.options.enabled,
  }));

  const selectionDom = useSelectionDom();
  const isActive = selectionDom.isActive(id);
  const isAncestorOfSelected = selectionDom.isAncestorOfSelected(id);

  useLayoutEffect(() => {
    if (!dom) return;
    if (!enabled) return;

    dom.setAttribute("data-enabled", "true");

    if (dom && name !== "Background") {
      if (isActive) {
        dom.setAttribute("data-selected", "true");
        // Only force relative positioning on elements that don't already
        // have a positioning context. absolute/fixed/sticky/relative all
        // create a containing block for the inline tool controllers.
        // Forcing relative on an absolute element would collapse it.
        const pos = window.getComputedStyle(dom).position;
        if (pos === "static") {
          dom.style.position = "relative";
          dom.setAttribute("data-position-override", "true");
        }
      } else {
        dom.removeAttribute("data-selected");
        // Restore original position if we overrode it
        if (dom.getAttribute("data-position-override")) {
          dom.style.position = "";
          dom.removeAttribute("data-position-override");
        }
      }

      if (isAncestorOfSelected) {
        dom.setAttribute("data-ancestor", "true");
      } else {
        dom.removeAttribute("data-ancestor");
      }

      if (isHover && !isActive) dom.setAttribute("data-hover", "true");
      else dom.removeAttribute("data-hover");
    }
  }, [isActive, isHover, isAncestorOfSelected, enabled, dom, name]);

  return null;
};
