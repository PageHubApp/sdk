import { useEditor, useNode } from "@craftjs/core";
import { addHandler, buildClonedTree, saveHandler } from "../../Viewport/lib";
import { useCallback } from "react";
import { TbCopy } from "react-icons/tb";

interface DuplicateNodeButtonProps {
  className?: string;
}

export const DuplicateNodeButton = ({
  className = "tool-button",
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
    <button type="button" className={className} onClick={handleDuplicate}>
      <TbCopy />
    </button>
  );
};
