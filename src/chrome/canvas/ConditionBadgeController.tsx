import { useEditor, useNode } from "@craftjs/core";
import { TbChevronLeft, TbChevronRight, TbEyeOff, TbEyeSearch, TbGitBranch } from "react-icons/tb";
import RenderNodeControlInline from "../rendering/RenderNodeControlInline";

export const ConditionBadgeController = () => {
  const { id, hasConditions, isHidden, parentId } = useNode(node => ({
    hasConditions:
      ((node.data.props.conditionGroups as any[]) || []).length > 0 ||
      ((node.data.props.conditions as any[]) || []).length > 0,
    isHidden: !!node.data.hidden,
    parentId: node.data.parent,
  }));

  const { isActive, actions, parentIsConditional, branches, siblingIds, myIndex } = useEditor(
    (state, query) => {
      const active = query.getEvent("selected").contains(id);

      // Check if parent is a ConditionalContainer
      let parentIsCond = false;
      let branchList: any[] = [];
      let siblings: string[] = [];
      let idx = -1;

      if (parentId) {
        try {
          const parentNode = query.node(parentId).get();
          const parentType =
            parentNode?.data?.type?.resolvedName || parentNode?.data?.type;
          if (parentType === "ConditionalContainer") {
            parentIsCond = true;
            branchList = parentNode?.data?.props?.branches || [];
            siblings = parentNode?.data?.nodes || [];
            idx = siblings.indexOf(id);
          }
        } catch {}
      }

      return {
        isActive: active,
        parentIsConditional: parentIsCond,
        branches: branchList,
        siblingIds: siblings,
        myIndex: idx,
      };
    }
  );

  if (!isActive) return null;
  if (!hasConditions && !parentIsConditional) return null;

  // --- Branch mode: inside a ConditionalContainer ---
  if (parentIsConditional && siblingIds.length > 0) {
    const branch = branches[myIndex];
    const label = branch?.label || `Branch ${myIndex + 1}`;
    const total = siblingIds.length;

    const showBranch = (index: number) => {
      siblingIds.forEach((sibId, i) => {
        actions.setHidden(sibId, i !== index);
      });
      actions.selectNode(siblingIds[index]);
    };

    const prev = () => {
      const next = (myIndex - 1 + total) % total;
      showBranch(next);
    };

    const fwd = () => {
      const next = (myIndex + 1) % total;
      showBranch(next);
    };

    return (
      <RenderNodeControlInline
        position="top"
        align="start"
        placement="start"
        alt={{ position: "bottom", placement: "start", align: "start" }}
      >
        <div className="pointer-events-auto flex items-center gap-0.5 rounded-sm bg-violet-600 px-1 py-0.5 text-[10px] font-semibold text-white shadow-sm">
          <TbGitBranch size={11} />
          <button type="button" onClick={prev} className="hover:bg-white/20 rounded px-0.5">
            <TbChevronLeft size={10} />
          </button>
          <span className="px-1">{label} ({myIndex + 1}/{total})</span>
          <button type="button" onClick={fwd} className="hover:bg-white/20 rounded px-0.5">
            <TbChevronRight size={10} />
          </button>
        </div>
      </RenderNodeControlInline>
    );
  }

  // --- Per-node mode: regular conditional ---
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
