import { atom } from "@zedux/react";
import { useNode } from "@craftjs/core";
import React, { useRef } from "react";
import { TbSettings } from "react-icons/tb";
import { useSetAtomState } from "../../../utils/atoms";
import { v4 as uuidv4 } from "uuid";
import { AnimatedTooltipButton } from "./AnimatedButton";
import DraggablePortalDialog from "../../toolbar/dialogs/DraggablePortalDialog";

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

      <DraggablePortalDialog state={itemListState} target={dom} opener={ref}>
        <div className="flex flex-col gap-3">{children}</div>
      </DraggablePortalDialog>
    </div>
  );
}

export const NodeToolWrapper = ({
  children,
  className = "",
  col = false,
  dense = false,
}: {
  children: React.ReactNode;
  className?: string;
  animate?: any;
  col?: boolean;
  /** Tight strip — matches `DeleteNodeController` gap (e.g. Button wand + trash). */
  dense?: boolean;
}) =>
  children ? (
    <div
      className={`node-control flex items-center justify-center ${
        col ? "flex-col" : "flex-row"
      } pointer-events-auto ${dense ? "relative z-110 gap-0.5" : "z-50 gap-2"} ${className}`}
      onMouseDown={e => e.stopPropagation()}
    >
      {children}
    </div>
  ) : null;
