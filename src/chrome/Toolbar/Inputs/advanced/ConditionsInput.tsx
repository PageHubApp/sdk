/**
 * Conditional visibility — show/hide elements based on URL params or form field values.
 * Conditions are evaluated at runtime on mount and on change.
 */
import { useNode } from "@craftjs/core";
import { TbEyeSearch, TbPlus, TbTrash } from "react-icons/tb";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import { ToolbarSection } from "../../ToolbarSection";
import { useElementPicker } from "../action/useElementPicker";

type ConditionType = "url-param" | "form-field";
type Operator = "equals" | "not-equals" | "contains" | "exists" | "not-exists";

interface Condition {
  type: ConditionType;
  key: string;
  operator: Operator;
  value: string;
  /** For form-field: the element ID / anchor of the input to watch */
  target?: string;
}

const OPERATOR_OPTIONS: { value: Operator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not-equals", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "exists", label: "Exists" },
  { value: "not-exists", label: "Doesn't exist" },
];

const NO_VALUE_OPERATORS: Operator[] = ["exists", "not-exists"];

export const ConditionsInput = () => {
  const {
    conditions,
    conditionLogic,
    actions: { setProp },
  } = useNode((node) => ({
    conditions: (node.data.props.conditions || []) as Condition[],
    conditionLogic: (node.data.props.conditionLogic || "all") as "all" | "any",
  }));

  const formElements = useElementPicker("all");

  const addCondition = () => {
    setProp((props: any) => {
      if (!props.conditions) props.conditions = [];
      props.conditions.push({ type: "url-param", key: "", operator: "equals", value: "" });
    });
  };

  const removeCondition = (index: number) => {
    setProp((props: any) => {
      props.conditions = (props.conditions || []).filter((_: any, i: number) => i !== index);
    });
  };

  const updateCondition = (index: number, patch: Partial<Condition>) => {
    setProp((props: any) => {
      if (props.conditions?.[index]) {
        props.conditions[index] = { ...props.conditions[index], ...patch };
      }
    });
  };

  const setLogic = (logic: "all" | "any") => {
    setProp((props: any) => {
      props.conditionLogic = logic;
    });
  };

  return (
    <ToolbarSection
      title="Conditions"
      icon={<TbEyeSearch />}
      help="Show or hide this element based on URL parameters or form field values. Conditions are checked when the page loads."
    >
      {conditions.length > 1 && (
        <div className="mb-2 flex gap-1 rounded-md bg-neutral p-0.5">
          <button
            type="button"
            onClick={() => setLogic("all")}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              conditionLogic === "all"
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-neutral-content hover:text-base-content"
            }`}
          >
            All match
          </button>
          <button
            type="button"
            onClick={() => setLogic("any")}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              conditionLogic === "any"
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-neutral-content hover:text-base-content"
            }`}
          >
            Any match
          </button>
        </div>
      )}

      {conditions.map((cond, i) => (
        <div key={i} className="mb-2 rounded-md border border-base-300 p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium text-neutral-content">
              Condition {i + 1}
            </span>
            <button
              type="button"
              onClick={() => removeCondition(i)}
              className="rounded p-0.5 text-neutral-content hover:bg-error hover:text-error-content"
            >
              <TbTrash size={12} />
            </button>
          </div>

          {/* Condition type */}
          <ToolbarDropdown
            value={cond.type}
            onChange={(val: string) => updateCondition(i, { type: val as ConditionType })}
            propKey={`condType-${i}`}
          >
            <option value="url-param">URL Parameter</option>
            <option value="form-field">Form Field Value</option>
          </ToolbarDropdown>

          {/* Target — form field picker */}
          {cond.type === "form-field" && (
            <ToolbarDropdown
              value={cond.target || ""}
              onChange={(val: string) => updateCondition(i, { target: val })}
              propKey={`condTarget-${i}`}
              placeholder="Select field..."
            >
              <option value="">Select field...</option>
              {formElements.map((opt) => (
                <option key={opt.nodeId} value={opt.anchor}>
                  {opt.label}
                </option>
              ))}
            </ToolbarDropdown>
          )}

          {/* Key — param name for URL params, field name for form fields */}
          <div className="input-wrapper mt-1">
            <input
              type="text"
              value={cond.key}
              onChange={(e) => updateCondition(i, { key: e.target.value })}
              placeholder={cond.type === "url-param" ? "param name (e.g. ref)" : "field name"}
              className="input-plain w-full font-mono text-xs"
            />
          </div>

          {/* Operator */}
          <ToolbarDropdown
            value={cond.operator}
            onChange={(val: string) => updateCondition(i, { operator: val as Operator })}
            propKey={`condOp-${i}`}
          >
            {OPERATOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </ToolbarDropdown>

          {/* Value — hidden for exists/not-exists */}
          {!NO_VALUE_OPERATORS.includes(cond.operator) && (
            <div className="input-wrapper mt-1">
              <input
                type="text"
                value={cond.value}
                onChange={(e) => updateCondition(i, { value: e.target.value })}
                placeholder="expected value"
                className="input-plain w-full font-mono text-xs"
              />
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={addCondition}
        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-base-300 px-2 py-1.5 text-[11px] text-neutral-content transition-colors hover:border-primary hover:text-base-content"
      >
        <TbPlus size={12} />
        Add Condition
      </button>
    </ToolbarSection>
  );
};
