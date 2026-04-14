import { useEditor, useNode } from "@craftjs/core";
import { TbArrowUp } from "react-icons/tb";

interface SelectParentNodeToolProps {
  parentType: string; // The component type to look for (e.g., "Nav", "Container")
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const SelectParentNodeTool = ({
  parentType,
  icon = <TbArrowUp className="size-4" />,
  children,
}: SelectParentNodeToolProps) => {
  const { id } = useNode();
  const { query, actions } = useEditor();

  // Find the parent of the specified type
  const findParentOfType = (nodeId: string, targetType: string): string | null => {
    try {
      const node = query.node(nodeId).get();
      if (!node?.data?.parent) return null;

      const parentNode = query.node(node.data.parent).get();
      if (!parentNode) return null;

      // Check if this parent matches the target type
      // Check both the component name and displayName
      const parentName = parentNode.data.name;
      const parentDisplayName = parentNode.data.displayName;

      if (parentName === targetType || parentDisplayName === targetType) {
        return parentNode.id;
      }

      // Recursively check parent's parent
      return findParentOfType(parentNode.id, targetType);
    } catch (e) {
      return null;
    }
  };

  const parentId = findParentOfType(id, parentType);

  // Only show the button if a parent of the specified type exists
  if (!parentId) return null;

  const handleSelectParent = () => {
    actions.selectNode(parentId);
  };

  return (
    <>
      <button type="button" className="tool-button" onClick={handleSelectParent}>
        {icon}
      </button>
      {children}
    </>
  );
};

export default SelectParentNodeTool;
