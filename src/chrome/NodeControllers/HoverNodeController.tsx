import { useEditor, useNode } from "@craftjs/core";
import RenderNodeControlInline from "../RenderNodeControlInline";

export const HoverNodeController = (props: { position; align; placement; alt?: any }) => {
  const { position, align, placement, alt } = props as any;

  const { name, id } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
  }));

  const { isHover } = useNode(node => ({
    isHover: node.events.hovered,
  }));

  const { isActive } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  if (!isHover || isActive) return null;

  return (
    <RenderNodeControlInline
      key={`${id}-hover`}
      position={position}
      align={align}
      alt={alt}
      placement={placement || "start"}
      className={`${position === "top" && align === "start" && placement === "end" ? "m-0.5" : ""} select-none items-center whitespace-nowrap`}
    >
      <div
        className={
          "fontfamily-base flex flex-row gap-3 rounded-lg border border-base-300 bg-neutral px-2 text-base! font-normal! text-base-content shadow-sm"
        }
      >
        {name}
      </div>
    </RenderNodeControlInline>
  );
};
