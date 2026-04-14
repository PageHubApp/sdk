import { Element, useEditor, useNode } from "@craftjs/core";
import { Container } from "../../components/Container";
import { TbPlus } from "react-icons/tb";
import { useNodeTypeHelpers } from "../canvas/hooks/useNodeType";
import { AddElement } from "../viewport/toolbox/toolboxUtils";

interface AddElementButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export const AddElementButton = ({ className = "", children }: AddElementButtonProps) => {
  const { actions, query } = useEditor();
  const { id } = useNode();
  const { isPage, isSection } = useNodeTypeHelpers();

  // Empty inner containers: hide "Add Component" (keep handler + copy below for when we turn this back on).
  if (!isPage && !isSection) {
    return null;
  }

  // Section empty-state "Add Content" CTA disabled — add via toolbox (drag / double-click).
  if (isSection) {
    return null;
  }

  const handleClick = async () => {
    AddElement({
      element: (
        <Element
          canvas
          is={Container}
          canDelete={true}
          className="gap-section flex w-full flex-col"
          custom={{ displayName: "Section" }}
        />
      ),
      actions,
      query,
      addTo: id,
    });
  };

  return (
    <button className={`w-fit ${className}`} onClick={handleClick}>
      <span className="text-xs">
        <TbPlus />
      </span>

      {children || "Add Section"}
    </button>
  );
};
