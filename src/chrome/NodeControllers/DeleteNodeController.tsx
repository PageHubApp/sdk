// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { motion } from "framer-motion";
import RenderNodeControlInline from "../RenderNodeControlInline";
import { DeleteNodeButton } from "./Tools/DeleteNodeButton";

export const DeleteNodeController = () => {
  const { id } = useNode();

  const { isActive } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  if (!isActive) return null;

  return (
    <RenderNodeControlInline
      key={`${id}-delete`}
      position="top"
      align="left"
      className="pointer-events-auto select-none items-center whitespace-nowrap"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{
          opacity: 1,
          y: 0,
          transition: {
            delay: 0.5,
            duration: 0.5,
            type: "spring",
            stiffness: 200,
            damping: 20,
            mass: 0.5,
          },
        }}
        exit={{
          opacity: 0,
          transition: {
            delay: 0.2,
            duration: 0.3,
            type: "spring",
            stiffness: 200,
            damping: 20,
            mass: 0.5,
          },
        }}
        className="fontfamily-base m-1 flex items-center justify-center rounded-lg bg-muted p-1.5 text-base! font-normal!"
      >
        <DeleteNodeButton className="text-sm text-foreground hover:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground" />
      </motion.div>
    </RenderNodeControlInline>
  );
};
