// @ts-nocheck
import { atom } from "@zedux/react";
import { useNode } from "@craftjs/core";
import { motion } from "framer-motion";
import React, { useRef } from "react";
import { TbSettings } from "react-icons/tb";
import { useSetAtomState } from "../../utils/atoms";
import { v4 as uuidv4 } from "uuid";
import { AnimatedTooltipButton } from "./AnimatedButton";
import Dialog from "./Dialog";

const MemoizedAnimatedTooltipButton = React.memo(AnimatedTooltipButton);

export function NodeDialog({ tooltip = "", button = <TbSettings />, children = null }) {
  const itemListState = atom(uuidv4(), false);

  const setIsOpen = useSetAtomState(itemListState);

  const openDialog = () => {
    setIsOpen(true);
  };

  const { id } = useNode();
  const dom = document.querySelector(`[node-id="${id}"]`);
  const ref = useRef(null);
  return (
    <div ref={ref}>
      <MemoizedAnimatedTooltipButton content={tooltip} placement="bottom" onClick={openDialog}>
        {button}
      </MemoizedAnimatedTooltipButton>

      <Dialog state={itemListState} target={dom} opener={ref}>
        <div className="flex flex-col gap-3">{children}</div>
      </Dialog>
    </div>
  );
}

export const NodeToolWrapper = ({ children, className = "", animate = {}, col = false }) =>
  children ? (
    <motion.div
      className={`flex items-center justify-center ${
        col ? "flex-col" : "flex-row"
      } pointer-events-auto z-50 gap-2 rounded-lg border border-border bg-background px-2 py-1.5 shadow-sm ${className}`}
      {...animate}
    >
      {children}
    </motion.div>
  ) : null;

export default NodeDialog;
