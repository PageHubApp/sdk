// @ts-nocheck
import { Element, useEditor, useNode } from "@craftjs/core";
import { Container } from "../../components/Container";
import { motion } from "framer-motion";
import { TbPlus } from "react-icons/tb";
import { useSetAtomState } from "../../utils/atoms";
import { HeaderMenuAtom } from "utils/lib";
import { useNodeTypeHelpers } from "../NodeControllers/hooks/useNodeType";
import { AddElement } from "../Viewport/Toolbox/lib";

interface AddElementButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export const AddElementButton = ({ className = "", children }: AddElementButtonProps) => {
  const { actions, query } = useEditor();
  const { id } = useNode();
  const { isPage, isSection } = useNodeTypeHelpers();
  const setHeaderMenu = useSetAtomState(HeaderMenuAtom);

  const handleClick = async () => {
    if (isPage || isSection) {
      // Direct add for pages/sections
      let newElement = null;
      
      // Dynamically import Container to break circular dependencies
      console.log("isPage", isPage);
      console.log("isSection", isSection);

      if (isPage) {
        // Add a section to a page
        newElement = AddElement({
          element: (
            <Element
              canvas
              is={Container}
              canDelete={true}
              className="flex flex-col w-full gap-(--section-gap)"
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
              className="flex flex-col w-full gap-(--section-gap)"
              custom={{ displayName: "Container" }}
            />
          ),
          actions,
          query,
          addTo: id,
        });
      }

      // Select the newly added element after a short delay
      if (newElement) {
        setTimeout(() => {
          const newNodeId = newElement.rootNodeId;
          if (newNodeId) {
            actions.selectNode(newNodeId);
          }
        }, 100);
      }
    } else {
      // Open menu for other cases
      setHeaderMenu(prev => ({ ...prev, isOpen: true, menuType: "components" }));
    }
  };

  const getButtonText = () => {
    if (isPage) return "Add Section";
    if (isSection) return "Add Content";
    return "Add Component";
  };

  return (
    <motion.button
      whileTap={{ scale: 0.99 }}
      className={`w-fit ${className}`}
      onClick={handleClick}
    >
      <span className="text-xs"><TbPlus /></span>

      {children || getButtonText()}
    </motion.button>
  );
};
