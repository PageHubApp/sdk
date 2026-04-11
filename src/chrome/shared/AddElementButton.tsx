import { Element, useEditor, useNode } from "@craftjs/core";
import { Container } from "../../components/Container";
import { TbPlus } from "react-icons/tb";
import { useNodeTypeHelpers } from "../NodeControllers/hooks/useNodeType";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { AddElement } from "../Viewport/Toolbox/lib";

interface AddElementButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export const AddElementButton = ({ className = "", children }: AddElementButtonProps) => {
  const { actions, query } = useEditor();
  const { id } = useNode();
  const { isPage, isSection } = useNodeTypeHelpers();
  const { open: openPanel } = usePanelUrl();

  // Empty inner containers: hide "Add Component" (keep handler + copy below for when we turn this back on).
  if (!isPage && !isSection) {
    return null;
  }

  const handleClick = async () => {
    if (isPage || isSection) {
      // Direct add for pages/sections
      let newElement = null;
      
      // Dynamically import Container to break circular dependencies
      if (isPage) {
        // Add a section to a page
        newElement = AddElement({
          element: (
            <Element
              canvas
              is={Container}
              canDelete={true}
              className="flex flex-col w-full gap-section"
              custom={{ displayName: "Section" }}
            />
          ),
          actions,
          query,
          addTo: id,
        });
      } else if (isSection) {
        // Add content to a section
        newElement = AddElement({
          element: (
            <Element
              canvas
              is={Container}
              canDelete={true}
              className="flex flex-col w-full gap-section"
              custom={{ displayName: "Container" }}
            />
          ),
          actions,
          query,
          addTo: id,
        });
      }

    } else {
      // Open menu for other cases
      openPanel("components");
    }
  };

  const getButtonText = () => {
    if (isPage) return "Add Section";
    if (isSection) return "Add Content";
    return "Add Component";
  };

  return (
    <button
      className={`w-fit ${className}`}
      onClick={handleClick}
    >
      <span className="text-xs"><TbPlus /></span>

      {children || getButtonText()}
    </button>
  );
};
