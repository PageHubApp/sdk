// @ts-nocheck
import { useEditor } from "@craftjs/core";
import { motion } from "framer-motion";
import React, { useEffect, useRef } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import { SideBarAtom, SideBarOpen } from "utils/lib";
import { PreviewAtom } from "../Viewport/atoms";
import { Header } from "../Viewport/Header";
import { EditorEmptyState } from "./EditorEmptyState";

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

  const variants = {
    open: { opacity: 1, width: "360px" },
    closed: { opacity: 0, width: "0px" },
    transition: { type: "linear", duration: 0.2 },
  };

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

  return (
    <motion.aside
      role="complementary"
      aria-label="Component settings"
      animate={sideBarOpen && !preview ? "open" : "closed"}
      initial="closed"
      variants={variants}
      transition={variants.transition}
      key="sideMenu"
      id="toolbar"
      className={
        `relative flex h-full shrink-0 grow-0 flex-col overflow-hidden border-x border-border bg-sidebar text-sidebar-foreground shadow-lg z-60 ${orderClass}`
      }
      ref={ref}
    >
      <Header />
      <div
        className="z-0 flex w-full flex-1 select-none flex-col overflow-hidden bg-sidebar text-sidebar-foreground antialiased"
        aria-expanded={sideBarOpen && !preview ? "true" : "false"}
      >
        {tool}
      </div>
    </motion.aside>
  );
};
