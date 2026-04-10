import { useEditor } from "@craftjs/core";
import React, { useEffect, useRef } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import { SideBarAtom, SideBarOpen } from "utils/lib";
import { PreviewAtom } from "../Viewport/atoms";
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

  const { related } = useEditor((state, query) => {
    const currentlySelectedNodeId = query.getEvent("selected").first();

    return {
      related: currentlySelectedNodeId && state.nodes[currentlySelectedNodeId].related,
    };
  });

  const tool = related?.toolbar ? React.createElement(related.toolbar) : <EditorEmptyState />;

  // Right sidebar: push to end of the flex row via CSS order
  const orderClass = !sideBarLeft ? "order-last" : "";

  const isOpen = sideBarOpen && !preview;

  return (
    <aside
      role="complementary"
      aria-label="Component settings"
      key="sideMenu"
      id="toolbar"
      className={`relative flex h-full shrink-0 grow-0 flex-col overflow-hidden border-x border-base-300 bg-sidebar text-sidebar-foreground shadow-lg z-60 transition-[width,opacity] duration-200 ${isOpen ? "w-[360px] opacity-100" : "w-0 opacity-0"} ${orderClass}`}
      ref={ref}
    >
      <Header />
      <div
        className="z-0 flex w-full flex-1 select-none flex-col overflow-hidden bg-sidebar text-sidebar-foreground antialiased"
        aria-expanded={isOpen ? "true" : "false"}
      >
        {tool}
      </div>
    </aside>
  );
};
