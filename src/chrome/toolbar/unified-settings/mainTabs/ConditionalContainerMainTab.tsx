/**
 * Settings tab for ConditionalContainer — manages branches (if/else-if/else).
 * Each branch is a child Container with its own conditions.
 */
import React from "react";
import { Element, useEditor, useNode } from "@craftjs/core";
import { TbGitBranch, TbPlus, TbTrash } from "react-icons/tb";
import { SettingsAiSlot } from "../../../ai/SettingsAiSlot";
import { ToolbarSection } from "../../ToolbarSection";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import { ToolbarDashedButton } from "../../helpers/ToolbarDashedButton";
import { renderComponentSlots, SECTION_ICONS } from "../helpers";
import type {
  Condition,
  ConditionBranch,
  ConditionLogic,
  ConditionType,
  Operator,
} from "../../../../utils/conditions/types";
import {
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
  NO_VALUE_OPERATORS,
} from "../../../../utils/conditions/types";

const CATEGORY_OPTIONS: { value: ConditionType; label: string }[] = [
  { value: "url-param", label: "URL" },
  { value: "form-field", label: "Form" },
  { value: "connector", label: "Connector" },
  { value: "company", label: "Company" },
  { value: "device", label: "Device" },
];

export const ConditionalContainerMainTab = () => {
  const {
    id,
    props,
    actions: { setProp },
  } = useNode(node => ({ props: node.data?.props }));
  const { actions, query } = useEditor();

  let childIds: string[] = [];
  try {
    childIds = query.node(id).get()?.data?.nodes || [];
  } catch {
    /* node not ready */
  }
  const branches: ConditionBranch[] = props.branches || [];

  const updateBranch = (index: number, patch: Partial<ConditionBranch>) => {
    setProp((p: any) => {
      if (!p.branches) p.branches = [];
      p.branches[index] = { ...p.branches[index], ...patch };
    });
  };

  const addBranch = async () => {
    const idx = childIds.length;
    const isFirst = idx === 0;
    const label = isFirst ? "Default" : `Branch ${idx + 1}`;

    const { Container } = await import("../../../../components/Container");
    const { Text } = await import("../../../../components/Text");

    const branchElement = (
      <Element
        canvas
        is={Container}
        custom={{ displayName: label }}
        className="gap-space-sm p-space-md flex flex-col"
      >
        <Element
          is={Text}
          custom={{ displayName: "Content" }}
          text={`<p>Content for ${label}. Replace with your own.</p>`}
        />
      </Element>
    );

    try {
      const tree = query.parseReactElement(branchElement).toNodeTree();
      actions.addNodeTree(tree, id);

      // Add branch definition
      const newBranch: ConditionBranch = {
        label,
        conditions: isFirst ? [] : [], // first branch = else/fallback by default
        conditionLogic: "all",
      };
      setProp((p: any) => {
        if (!p.branches) p.branches = [];
        p.branches.push(newBranch);
      });
    } catch (e) {
      console.error("Failed to add branch:", e);
    }
  };

  const removeBranch = (index: number) => {
    if (childIds.length <= 1) return;
    const childId = childIds[index];
    if (childId) actions.delete(childId);
    setProp((p: any) => {
      if (p.branches) p.branches.splice(index, 1);
    });
  };

  return renderComponentSlots({
    Content: (
      <ToolbarSection
        title="Branches"
        icon={<TbGitBranch />}
        help="Each branch has conditions. The first branch whose conditions pass will render. A branch with no conditions acts as the fallback (else)."
      >
        {branches.map((branch, i) => {
          const isFallback = !branch.conditions || branch.conditions.length === 0;
          return (
            <div key={i} className="border-base-300 mb-2 rounded-lg border">
              {/* Branch header */}
              <div className="bg-neutral/30 flex items-center justify-between rounded-t-lg px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold tracking-wider uppercase">
                    {i === 0 && !isFallback ? "IF" : isFallback ? "ELSE" : "ELSE IF"}
                  </span>
                  <input
                    type="text"
                    value={branch.label}
                    onChange={e => updateBranch(i, { label: e.target.value })}
                    className="input-plain bg-transparent text-xs font-medium"
                    placeholder="Branch name"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeBranch(i)}
                  disabled={childIds.length <= 1}
                  className="text-neutral-content hover:bg-error hover:text-error-content rounded p-0.5 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <TbTrash size={12} />
                </button>
              </div>

              {/* Branch conditions */}
              <div className="p-2">
                {isFallback ? (
                  <p className="text-neutral-content text-[11px]">
                    Fallback — always renders if no other branch matches.
                  </p>
                ) : (
                  <BranchConditions
                    conditions={branch.conditions}
                    logic={branch.conditionLogic}
                    onChange={(conditions, logic) =>
                      updateBranch(i, { conditions, conditionLogic: logic })
                    }
                  />
                )}

                {/* Toggle fallback */}
                <button
                  type="button"
                  onClick={() =>
                    updateBranch(i, {
                      conditions: isFallback
                        ? [{ type: "url-param", key: "", operator: "equals", value: "" }]
                        : [],
                    })
                  }
                  className="text-neutral-content mt-1 text-[10px] underline"
                >
                  {isFallback ? "Add conditions" : "Make fallback (else)"}
                </button>
              </div>
            </div>
          );
        })}

        <div className="flex gap-2">
          <ToolbarDashedButton onClick={addBranch} icon={<TbPlus size={12} />}>
            Add branch
          </ToolbarDashedButton>
        </div>

        {/* Fallback behavior */}
        <ToolbarSection title="Fallback" nested>
          <ToolbarDropdown
            value={props.fallback || "last"}
            onChange={(val: string) => setProp((p: any) => (p.fallback = val))}
            propKey="fallback"
          >
            <option value="last">Use last branch as fallback</option>
            <option value="hide">Hide if no branch matches</option>
          </ToolbarDropdown>
        </ToolbarSection>

        <SettingsAiSlot />
      </ToolbarSection>
    ),
  });
};

// ── Inline branch condition editor ───────────────────────────────────────────

function BranchConditions({
  conditions,
  logic,
  onChange,
}: {
  conditions: Condition[];
  logic: ConditionLogic;
  onChange: (conditions: Condition[], logic: ConditionLogic) => void;
}) {
  const updateCondition = (index: number, patch: Partial<Condition>) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...patch };
    onChange(updated, logic);
  };

  const removeCondition = (index: number) => {
    onChange(
      conditions.filter((_, i) => i !== index),
      logic
    );
  };

  const addCondition = () => {
    onChange(
      [
        ...conditions,
        { type: "url-param" as ConditionType, key: "", operator: "equals" as Operator, value: "" },
      ],
      logic
    );
  };

  return (
    <div>
      {conditions.length > 1 && (
        <div className="bg-neutral mb-1 flex gap-1 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => onChange(conditions, "all")}
            className={`flex-1 rounded px-2 py-0.5 text-[10px] font-medium ${
              logic === "all" ? "bg-base-100 text-base-content shadow-sm" : "text-neutral-content"
            }`}
          >
            AND
          </button>
          <button
            type="button"
            onClick={() => onChange(conditions, "any")}
            className={`flex-1 rounded px-2 py-0.5 text-[10px] font-medium ${
              logic === "any" ? "bg-base-100 text-base-content shadow-sm" : "text-neutral-content"
            }`}
          >
            OR
          </button>
        </div>
      )}

      {conditions.map((cond, i) => (
        <MiniConditionRow
          key={i}
          cond={cond}
          onChange={patch => updateCondition(i, patch)}
          onRemove={() => removeCondition(i)}
        />
      ))}

      <ToolbarDashedButton onClick={addCondition}>Add condition</ToolbarDashedButton>
    </div>
  );
}

/** Compact condition row for branch editor */
function MiniConditionRow({
  cond,
  onChange,
  onRemove,
}: {
  cond: Condition;
  onChange: (patch: Partial<Condition>) => void;
  onRemove: () => void;
}) {
  const operators = OPERATORS_BY_TYPE[cond.type] || OPERATORS_BY_TYPE["url-param"];

  return (
    <div className="border-base-300 mb-1 flex flex-wrap items-center gap-1 rounded border p-1">
      <select
        value={cond.type}
        onChange={e => onChange({ type: e.target.value as ConditionType, key: "", value: "" })}
        className="input-plain flex-shrink-0 text-[10px]"
      >
        {CATEGORY_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {cond.type === "device" ? (
        <select
          value={cond.value || "mobile"}
          onChange={e => onChange({ value: e.target.value })}
          className="input-plain text-[10px]"
        >
          <option value="mobile">Mobile</option>
          <option value="desktop">Desktop</option>
        </select>
      ) : (
        <>
          {cond.type !== "company" && (
            <input
              type="text"
              value={cond.key}
              onChange={e => onChange({ key: e.target.value })}
              placeholder="key"
              className="input-plain w-16 flex-1 font-mono text-[10px]"
            />
          )}
          {cond.type === "company" && (
            <select
              value={cond.key}
              onChange={e => onChange({ key: e.target.value })}
              className="input-plain text-[10px]"
            >
              <option value="name">name</option>
              <option value="email">email</option>
              <option value="phone">phone</option>
              <option value="tagline">tagline</option>
              <option value="location">location</option>
            </select>
          )}
          <select
            value={cond.operator}
            onChange={e => onChange({ operator: e.target.value as Operator })}
            className="input-plain text-[10px]"
          >
            {operators.map(op => (
              <option key={op} value={op}>
                {OPERATOR_LABELS[op]}
              </option>
            ))}
          </select>
          {!NO_VALUE_OPERATORS.includes(cond.operator) && (
            <input
              type="text"
              value={cond.value}
              onChange={e => onChange({ value: e.target.value })}
              placeholder="value"
              className="input-plain w-16 flex-1 font-mono text-[10px]"
            />
          )}
        </>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="text-neutral-content hover:text-error p-0.5"
      >
        <TbTrash size={10} />
      </button>
    </div>
  );
}
