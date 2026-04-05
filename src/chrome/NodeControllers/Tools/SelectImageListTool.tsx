// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { RenderNodeControlInline } from "../../RenderNodeControlInline";
import { Tooltip } from "components/layout/Tooltip";
import { motion } from "framer-motion";
import { TbPhotoCog } from "react-icons/tb";

export const SelectImageListTool = () => {
  const { id } = useNode();
  const { query, actions } = useEditor();

  // Find the ImageList parent
  const findImageListParent = (nodeId: string): string | null => {
    try {
      const node = query.node(nodeId).get();
      if (!node?.data?.parent) return null;

      const parentNode = query.node(node.data.parent).get();
      if (!parentNode) return null;

      // Check if this parent is an ImageList
      const parentName = parentNode.data.name;
      const parentDisplayName = parentNode.data.displayName;

      if (parentName === "ImageList" || parentDisplayName === "ImageList") {
        return parentNode.id;
      }

      // Recursively check parent's parent
      return findImageListParent(parentNode.id);
    } catch (e) {
      return null;
    }
  };

  const imageListId = findImageListParent(id);

  // Only show the button if we're inside an ImageList
  if (!imageListId) return null;

  const handleSelectImageList = () => {
    actions.selectNode(imageListId);
  };

  return (
    <RenderNodeControlInline
      key={`${id}-select-image-list`}
      position="right"
      align="middle"
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
        className="fontfamily-base m-1 flex items-center justify-center rounded-lg bg-muted p-0.5 text-base! font-normal!"
      >
        <Tooltip
          content="Select Image List"
          className="tool-bg h-fit pointer-events-auto select-none items-center whitespace-nowrap"
        >
          <div
            role="button"
            tabIndex={0}
            className="flex items-center justify-center cursor-pointer text-sm text-foreground hover:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
            onClick={handleSelectImageList}
          >
            <TbPhotoCog size={14} />
          </div>
        </Tooltip>
      </motion.div>
    </RenderNodeControlInline>
  );
};

export default SelectImageListTool;
