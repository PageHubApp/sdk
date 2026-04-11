import { useNode } from "@craftjs/core";
import { TbTrash, TbTrashOff } from "react-icons/tb";
import { useUnifiedDelete } from "../../hooks/useUnifiedDelete";

interface DeleteNodeButtonProps {
  className?: string;
  title?: string;
  titleDisabled?: string;
  /** When a parent `NodeInlineTooltip` (or similar) shows the label, skip native `title` to avoid double tooltips. */
  suppressNativeTitle?: boolean;
  useSimpleDelete?: boolean;
  label?: string;
}

export const DeleteNodeButton = ({
  className = "tool-button",
  title = "Delete",
  titleDisabled = "Cannot delete",
  suppressNativeTitle = false,
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

  const nativeTitle =
    suppressNativeTitle ? undefined : canDelete ? title : titleDisabled;

  return (
    <div
      role="button"
      tabIndex={0}
      className={className}
      onClick={handleDelete}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") handleDelete(e as any); }}
      title={nativeTitle}
      aria-disabled={!canDelete || undefined}
    >
      {canDelete ? <TbTrash /> : <TbTrashOff />}
      {label && <span>{label}</span>}
    </div>
  );
};
