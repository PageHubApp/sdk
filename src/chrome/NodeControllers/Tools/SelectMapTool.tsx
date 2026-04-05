// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import { RenderNodeControlInline } from "../../RenderNodeControlInline";
import { Tooltip } from "components/layout/Tooltip";
import { motion } from "framer-motion";
import { TbMap2 } from "react-icons/tb";

export const SelectMapTool = () => {
  const { id } = useNode();
  const { query, actions } = useEditor();

  // Find the Map parent
  const findMapParent = (nodeId: string): string | null => {
    try {
      const node = query.node(nodeId).get();
      if (!node?.data?.parent) return null;

      const parentNode = query.node(node.data.parent).get();
      if (!parentNode) return null;

      const parentName = parentNode.data.name;
      const parentDisplayName = parentNode.data.displayName;

      if (parentName === "Map" || parentDisplayName === "Map") {
        return parentNode.id;
      }

      // Recursively check parent's parent
      return findMapParent(parentNode.id);
    } catch (e) {
      return null;
    }
  };

  const mapId = findMapParent(id);

  // Only show the button if we're inside a Map
  if (!mapId) return null;

  const handleSelectMap = () => {
    actions.selectNode(mapId);
  };

  return (
    <RenderNodeControlInline
      key={`${id}-select-map`}
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
          content="Select Map"
          className="tool-bg h-fit pointer-events-auto select-none items-center whitespace-nowrap"
        >
          <div
            role="button"
            tabIndex={0}
            className="flex cursor-pointer items-center justify-center text-sm text-foreground hover:text-muted-foreground disabled:cursor-not-allowed disabled:text-muted-foreground"
            onClick={handleSelectMap}
          >
            <TbMap2 size={14} />
          </div>
        </Tooltip>
      </motion.div>
    </RenderNodeControlInline>
  );
};

export default SelectMapTool;
