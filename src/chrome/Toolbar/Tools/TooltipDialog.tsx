// @ts-nocheck
import { useGetRectLater } from "../../Tools/Dialog";
import { ulVariants } from "../../Viewport/ToolboxContextual";
import { getRect } from "../../Viewport/useRect";
import { AnimatePresence, motion } from "framer-motion";
import { useRef } from "react";
import { useAtomValue } from "@zedux/react";
import { ToolTipDialogAtom } from "./dialogAtoms";

export { ToolTipDialogAtom } from "./dialogAtoms";

export const ToolTipDialog = () => {
  const dialog = useAtomValue(ToolTipDialogAtom);
  const ref = useRef(null);
  const rect = getRect(dialog.e);
  const refRect = useGetRectLater(ref);

  const style = {
    top: dialog.placement === "bottom" ? rect.bottom + 10 : rect.top - refRect.height - 10,
    left: rect.left - refRect.width / 2,
    zIndex: 1000,
  } as any;

  return (
    <AnimatePresence>
      {dialog.enabled && (
        <motion.div
          animate={{ opacity: 1, width: "unset", height: "unset" }}
          variants={ulVariants}
          transition={ulVariants.transition}
          initial={{ opacity: 0, width: 0, height: 0 }}
          exit={{ opacity: 0, width: 0, height: 0 }}
          key={`tooltip-${dialog.key}`}
          id={`tooltip-${dialog.key}`}
          data-tooltip={true}
          style={style}
          className={"pointer-events-none absolute z-20 flex"}
        >
          <div
            ref={ref}
            key={`tooltip-${dialog.key}`}
            className="pointer-events-none absolute whitespace-nowrap rounded-lg border border-border bg-muted px-3 py-1.5 text-xs font-normal text-foreground drop-shadow-2xl"
          >
            {dialog.value}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
