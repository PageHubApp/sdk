import { useEditor, useNode } from "@craftjs/core";
import { TbCopy } from "react-icons/tb";
import { duplicateNodeById } from "../../Viewport/duplicateNodeById";

interface DuplicateNodeButtonProps {
  className?: string;
}

export const DuplicateNodeButton = ({ className = "tool-button" }: DuplicateNodeButtonProps) => {
  const { id } = useNode();

  const { actions, query } = useEditor();
  const {
    actions: { setProp },
  } = useEditor();

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await duplicateNodeById({ query, actions, setProp, id });
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
