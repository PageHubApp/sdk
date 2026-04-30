import { useView } from "../core/store";
import { useEditor, useNode } from "@craftjs/core";
import { motion } from "framer-motion";
import React from "react";
import { TbLayoutColumns, TbLayoutRows, TbNote, TbPlus } from "react-icons/tb";
import { useNodeTypeHelpers } from "../utils/hooks/useNodeType";
import { ImageDefault } from "./Image";

// Lazy-load AddElementButton — editor-only, keeps chrome out of viewer bundle
const AddElementButton = React.lazy(() =>
  import("../chrome/primitives/AddElementButton").then(m => ({ default: m.AddElementButton }))
);

export const EmptyState = ({
  icon = null,
  text,
}: {
  icon?: React.ReactNode | null;
  text?: string;
}) => {
  const { enabled } = useEditor(state => ({
    enabled: state.options.enabled,
  }));

  const { isHover } = useNode(node => ({
    isHover: node.events.hovered,
  }));

  const view = useView();
  const { id } = useNode();

  const { isActive } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  const { nodeProps } = useNode(node => ({
    parent: node.data.parent,
    nodeProps: node.data.props,
    name: node.data.custom.displayName || node.data.displayName,
  }));

  const { isPage } = useNodeTypeHelpers();
  // Only swap to AddElementButton on hover/active for pages (sections: toolbox only; inner containers
  // keep the icon so height does not collapse — AddElementButton returns null there).
  const showAddButton = (isActive || isHover) && isPage;

  if (!enabled) {
    return null;
  }

  const cn = nodeProps?.className || "";
  const flex = cn.includes("flex-row") ? "flex-row" : cn.includes("flex-col") ? "flex-col" : "";

  if (["flex-row", "flex-row-reverse"].includes(flex)) icon = <TbLayoutRows />;

  if (["flex-col", "flex-col-reverse"].includes(flex)) icon = <TbLayoutColumns />;

  if (nodeProps.type === "page") icon = <TbNote />;

  let addIcon = <TbPlus />;

  if (nodeProps.type === "imageContainer" && !nodeProps.background?.image) {
    const ico = <ImageDefault tab="Container" props={nodeProps} />;
    icon = ico;
    addIcon = ico;
  }

  // Check if element is being dragged over
  const isDragOver = nodeProps?.["data-dragged-over"] || false;

  return (
    <div
      className={`mx-auto flex w-fit gap-3 opacity-30 transition-opacity duration-300 hover:opacity-100 ${isDragOver ? "pointer-events-none" : ""}`}
    >
      {showAddButton ? (
        <motion.div id={`empty${id}`} whileTap={{ scale: 0.95 }}>
          <React.Suspense fallback={null}>
            <AddElementButton className="btn-primary btn-sm" />
          </React.Suspense>
        </motion.div>
      ) : null}

      {text && !showAddButton && <span className="text-neutral-content text-xs">{text}</span>}
      {icon && !showAddButton && (
        <div data-empty-state={true} className="text-3xl">
          {icon}
        </div>
      )}
    </div>
  );
};
