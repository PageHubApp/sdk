// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { addHandler, buildClonedTree, saveHandler } from "../../Viewport/lib";
import { motion } from "framer-motion";
import { useCallback } from "react";
import { TbCopy } from "react-icons/tb";

interface DuplicateNodeButtonProps {
  className?: string;
  iconSize?: number;
}

export const DuplicateNodeButton = ({
  className = "inline-flex items-center justify-center text-muted-foreground hover:text-accent-foreground hover:bg-accent p-1 rounded-lg transition-colors",
  iconSize = 14,
}: DuplicateNodeButtonProps) => {
  const { id } = useNode();

  const { actions, query } = useEditor();
  const {
    actions: { setProp },
  } = useEditor();

  const getCloneTree = useCallback(
    tree => buildClonedTree({ tree, query, setProp, createLinks: false }),
    [query, setProp]
  );

  const handleSaveTemplate = useCallback(
    () => saveHandler({ query, id, component: null, actions }),
    [id, query, actions]
  );

  const handleAdd = useCallback(() => {
    addHandler({
      actions,
      query,
      getCloneTree,
      id,
      setProp,
    });
  }, [actions, getCloneTree, id, query, setProp]);

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await handleSaveTemplate();

      // Use requestAnimationFrame to batch the add operation
      requestAnimationFrame(() => {
        handleAdd();
      });
    } catch (error) {
      console.error("Error duplicating node:", error);
    }
  };

  return (
    <motion.div role="button" tabIndex={0} className={className} onClick={handleDuplicate} whileTap={{ scale: 0.9 }}>
      <TbCopy size={14} />
    </motion.div>
  );
};
