import { useNode } from "@craftjs/core";
import { TbTrash, TbTrashOff } from "react-icons/tb";
import { useUnifiedDelete } from "../../hooks/useUnifiedDelete";

interface DeleteNodeButtonProps {
  className?: string;
  title?: string;
  titleDisabled?: string;
  useSimpleDelete?: boolean;
  label?: string;
}

export const DeleteNodeButton = ({
  className = "tool-button",
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
    <button
      type="button"
      className={className}
      onClick={handleDelete}
      title={canDelete ? title : titleDisabled}
      disabled={!canDelete}
    >
      {canDelete ? <TbTrash /> : <TbTrashOff />}
      {label && <span>{label}</span>}
    </button>
  );
};
