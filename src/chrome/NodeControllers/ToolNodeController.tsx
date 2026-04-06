import { useEditor, useNode } from "@craftjs/core";
import RenderNodeControlInline from "../RenderNodeControlInline";

export const ToolNodeController = (props: {
  position;
  align;
  children;
  placement?: any;
  alt?: any;
}) => {
  const { position, align, children, placement = "end", alt } = props as any;

  const { id } = useNode();

  const { isActive } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  if (!isActive) return null;

  return (
    <RenderNodeControlInline
      key={`${id}-tool`}
      position={position}
      align={align}
      placement={placement}
      alt={alt}
      className="select-none items-center whitespace-nowrap"
    >
      {children}
    </RenderNodeControlInline>
  );
};
