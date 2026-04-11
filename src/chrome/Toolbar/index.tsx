import { useEditor } from "@craftjs/core";
import React, { useEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { useAtomState, useAtomValue } from "@zedux/react";
import { SideBarAtom, SideBarOpen } from "utils/lib";
import { useEditorToolbarOverlayLayout } from "../../utils/hooks/useEditorToolbarOverlayLayout";
import { PreviewAtom } from "../Viewport/atoms";
import { isFlyoutBlockingToolColumn, usePanelUrl } from "../../utils/usePanelUrl";
import { Header } from "../Viewport/Header";
import { EditorEmptyState } from "./EditorEmptyState";

export * from "./Helpers/ToolbarDashedButton";
export * from "./Helpers/ToolbarSegmentedControl";
export * from "./ToolbarDropdown";
export * from "./ToolbarItem";
export * from "./ToolbarSection";

export const Toolbar = () => {
  const [sideBarOpen, setSideBarOpen] = useAtomState(SideBarOpen);
  const sideBarLeft = useAtomValue(SideBarAtom);
  const isOverlayLayout = useEditorToolbarOverlayLayout();
  const ref = useRef(null);

  const handleClickOutside = event => {
    if (ref.current && !ref.current.contains(event.target)) {
      // setSideBarOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener("click", handleClickOutside, true);

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [ref]);

  const preview = useAtomValue(PreviewAtom);
  const { panel } = usePanelUrl();
  const flyoutBlockingToolColumn = isFlyoutBlockingToolColumn(panel);

  const { related } = useEditor((state, query) => {
    const currentlySelectedNodeId = query.getEvent("selected").first();

    return {
      related: currentlySelectedNodeId && state.nodes[currentlySelectedNodeId].related,
    };
  });

  const tool = related?.toolbar ? React.createElement(related.toolbar) : <EditorEmptyState />;

  // Right sidebar: push to end of the flex row via CSS order (docked only)
  const orderClass = !isOverlayLayout && !sideBarLeft ? "order-last" : "";

  const isOpen = sideBarOpen && !preview;

  const layoutClass = isOverlayLayout
    ? twMerge("absolute inset-y-0 z-[60]", sideBarLeft ? "left-0" : "right-0")
    : "relative h-full shrink-0 grow-0 z-[60]";

  const sizeClass = isOpen
    ? isOverlayLayout
      ? "w-[min(360px,100vw)] opacity-100"
      : "w-[360px] opacity-100"
    : "w-0 opacity-0 pointer-events-none";

  return (
    <aside
      role="complementary"
      aria-label="Component settings"
      key="sideMenu"
      id="toolbar"
      className={twMerge(
        "flex flex-col overflow-hidden border-x border-base-300 bg-sidebar text-sidebar-foreground shadow-lg transition-[width,opacity] duration-200",
        layoutClass,
        orderClass,
        sizeClass,
      )}
      ref={ref}
    >
      <Header />
      <div
        className={`z-0 flex w-full flex-1 select-none flex-col overflow-hidden bg-sidebar text-sidebar-foreground antialiased ${
          flyoutBlockingToolColumn ? "pointer-events-none" : ""
        }`}
        aria-expanded={isOpen ? "true" : "false"}
      >
        {tool}
      </div>
    </aside>
  );
};
