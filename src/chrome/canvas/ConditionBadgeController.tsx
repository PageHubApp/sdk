import { useEditor, useNode } from "@craftjs/core";
import { TbEyeOff, TbEyeSearch } from "react-icons/tb";
import RenderNodeControlInline from "../rendering/RenderNodeControlInline";

export const ConditionBadgeController = () => {
  const { id, hasConditions, isHidden } = useNode(node => ({
    hasConditions:
      ((node.data.props.conditionGroups as any[]) || []).length > 0 ||
      ((node.data.props.conditions as any[]) || []).length > 0,
    isHidden: !!node.data.hidden,
  }));

  const { isActive, actions } = useEditor((_state, query) => ({
    isActive: query.getEvent("selected").contains(id),
  }));

  if (!isActive) return null;
  if (!hasConditions) return null;

  const toggle = () => {
    actions.setHidden(id, !isHidden);
  };

  const Icon = isHidden ? TbEyeOff : TbEyeSearch;
  const label = isHidden ? "Hidden" : "Conditional";
  const bg = isHidden ? "bg-red-500" : "bg-amber-500";

  return (
    <RenderNodeControlInline
      position="top"
      align="start"
      placement="start"
      alt={{ position: "bottom", placement: "start", align: "start" }}
    >
      <button
        type="button"
        onClick={toggle}
        className={`pointer-events-auto flex items-center gap-1 rounded-sm ${bg} px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm transition-colors hover:brightness-110`}
      >
        <Icon size={11} />
        {label}
      </button>
    </RenderNodeControlInline>
  );
};
