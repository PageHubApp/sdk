import { useEditor, useNode } from "@craftjs/core";
import RenderNodeControlInline from "../RenderNodeControlInline";
import { DeleteNodeButton } from "./Tools/DeleteNodeButton";

export const DeleteNodeController = () => {
  const { id } = useNode();

  const { isActive } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  if (!isActive) return null;

  return (
    <RenderNodeControlInline
      key={`${id}-delete`}
      position="top"
      align="left"
      className="pointer-events-auto select-none items-center whitespace-nowrap"
    >
      <div className="node-control" onMouseDown={e => e.stopPropagation()}>
        <DeleteNodeButton className="tool-button" />
      </div>
    </RenderNodeControlInline>
  );
};
