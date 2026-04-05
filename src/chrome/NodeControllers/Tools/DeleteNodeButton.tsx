// @ts-nocheck
import { useNode } from "@craftjs/core";
import { motion } from "framer-motion";
import { TbTrash, TbTrashOff } from "react-icons/tb";
import { useUnifiedDelete } from "../../hooks/useUnifiedDelete";

interface DeleteNodeButtonProps {
  className?: string;
  iconSize?: number;
  title?: string;
  titleDisabled?: string;
  useSimpleDelete?: boolean;
  label?: string;
}

export const DeleteNodeButton = ({
  className = "inline-flex items-center justify-center text-destructive hover:text-destructive-foreground hover:bg-destructive p-1 rounded-lg transition-colors",
  iconSize = 14,
  title = "Delete",
  titleDisabled = "Cannot delete",
  useSimpleDelete = false,
  label,
}: DeleteNodeButtonProps) => {
  const { canDelete } = useNode(node => ({
    canDelete: node.data.props?.canDelete !== false,
  }));

  const { deleteSelectedNode } = useUnifiedDelete();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!canDelete) return;

    deleteSelectedNode(useSimpleDelete);
  };

  return (
    <motion.div
      role="button"
      whileTap={{ scale: 0.9 }}
      className={className}
      onClick={handleDelete}
      title={canDelete ? title : titleDisabled}
      aria-disabled={!canDelete}
      style={{ opacity: canDelete ? 1 : 0.5, cursor: canDelete ? "pointer" : "not-allowed" }}
    >
      {canDelete ? <TbTrash size={iconSize} /> : <TbTrashOff size={iconSize} />}
      {label && <span>{label}</span>}
    </motion.div>
  );
};
