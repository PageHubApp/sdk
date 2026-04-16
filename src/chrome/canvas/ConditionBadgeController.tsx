import { useEditor, useNode } from "@craftjs/core";
import { TbEyeSearch } from "react-icons/tb";
import RenderNodeControlInline from "../rendering/RenderNodeControlInline";

export const ConditionBadgeController = () => {
  const { id, hasConditions } = useNode(node => ({
    hasConditions:
      ((node.data.props.conditionGroups as any[]) || []).length > 0 ||
      ((node.data.props.conditions as any[]) || []).length > 0,
  }));

  const { isActive } = useEditor((_, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  if (!hasConditions || !isActive) return null;

  return (
    <RenderNodeControlInline
      position="top"
      align="start"
      placement="start"
      alt={{ position: "bottom", placement: "start", align: "start" }}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-sm bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
        <TbEyeSearch size={11} />
        Conditional
      </div>
    </RenderNodeControlInline>
  );
};
