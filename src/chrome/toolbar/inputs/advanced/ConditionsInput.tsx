/**
 * Conditional visibility — visual condition builder with dropdown pickers.
 * Supports: URL params, form fields, connectors, company variables, device/viewport.
 * AND within groups, OR between groups (Elementor-style condition groups).
 */
import { ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { TbEyeSearch, TbPlus, TbTrash } from "react-icons/tb";
import { ToolbarDashedButton } from "../../helpers/ToolbarDashedButton";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import { ToolbarSection } from "../../ToolbarSection";
import { useElementPicker } from "../action/useElementPicker";
import { getConnectorData } from "../../../../utils/design/variables";
import type {
  Condition,
  ConditionGroup,
  ConditionLogic,
  ConditionType,
  Operator,
} from "../../../../utils/conditions/types";
import {
  NO_VALUE_OPERATORS,
  OPERATOR_LABELS,
  OPERATORS_BY_TYPE,
} from "../../../../utils/conditions/types";

// ── Category labels ──────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: ConditionType; label: string }[] = [
  { value: "url-param", label: "URL Parameter" },
  { value: "form-field", label: "Form Field" },
  { value: "connector", label: "Connector" },
  { value: "company", label: "Company Variable" },
  { value: "device", label: "Device / Viewport" },
  { value: "auth", label: "Auth Status" },
];

const AUTH_FIELDS = [
  { value: "status", label: "Login status" },
  { value: "customer.hasSubscription", label: "Has subscription" },
  { value: "customer.orderCount", label: "Order count" },
  { value: "customer.totalSpent", label: "Total spent" },
];

const AUTH_STATUS_VALUES = [
  { value: "logged-in", label: "Logged in" },
  { value: "logged-out", label: "Logged out" },
];

const AUTH_BOOL_VALUES = [
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const DEVICE_OPTIONS = [
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
];

const COMPANY_FIELDS = [
  { value: "name", label: "Company name" },
  { value: "email", label: "Company email" },
  { value: "phone", label: "Company phone" },
  { value: "tagline", label: "Tagline" },
  { value: "location", label: "Location" },
  { value: "address", label: "Address" },
  { value: "website", label: "Website" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Get available connector providers + collections from live data */
function useConnectorOptions(): { provider: string; collections: string[] }[] {
  const data = getConnectorData();
  if (!data) return [];
  return Object.entries(data).map(([provider, collections]) => ({
    provider,
    collections: Object.keys(collections),
  }));
}

/** Parse a flat conditions array + conditionLogic into condition groups.
 *  Legacy format (flat array) becomes a single group. */
export function parseGroups(
  conditions: Condition[],
  conditionGroups: ConditionGroup[] | undefined
): ConditionGroup[] {
  // New format: conditionGroups array
  if (conditionGroups && conditionGroups.length > 0) return conditionGroups;
  // Legacy: flat conditions array = single group
  if (conditions.length > 0) return [{ conditions, logic: "all" }];
  return [];
}

/** Create a default condition for a given type */
export function defaultCondition(type: ConditionType): Condition {
  switch (type) {
    case "device":
      return { type: "device", key: "viewport", operator: "equals", value: "mobile" };
    case "auth":
      return { type: "auth", key: "status", operator: "equals", value: "logged-in" };
    case "connector":
      return { type: "connector", key: "", operator: "exists", value: "" };
    case "company":
      return { type: "company", key: "name", operator: "exists", value: "" };
    default:
      return { type, key: "", operator: "equals", value: "" };
  }
}

// ── Single Condition Row ─────────────────────────────────────────────────────

function ConditionRow({
  cond,
  onChange,
  onRemove,
  formElements,
  connectorOptions,
}: {
  cond: Condition;
  onChange: (patch: Partial<Condition>) => void;
  onRemove: () => void;
  formElements: ReturnType<typeof useElementPicker>;
  connectorOptions: ReturnType<typeof useConnectorOptions>;
}) {
  const operators = OPERATORS_BY_TYPE[cond.type] || OPERATORS_BY_TYPE["url-param"];

  return (
    <div className="border-base-300 mb-2 flex flex-col gap-1.5 rounded-md border p-2">
      <div className="flex items-center justify-between">
        <span className="text-neutral-content text-[10px] font-medium">
          {CATEGORY_OPTIONS.find(c => c.value === cond.type)?.label || cond.type}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-neutral-content hover:bg-error hover:text-error-content rounded p-0.5"
        >
          <TbTrash size={12} />
        </button>
      </div>

      {/* Category picker */}
      <ToolbarDropdown
        value={cond.type}
        onChange={(val: string) => {
          const newType = val as ConditionType;
          onChange({ ...defaultCondition(newType), type: newType });
        }}
        propKey="condType"
      >
        {CATEGORY_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </ToolbarDropdown>

      {/* Type-specific fields */}
      {cond.type === "device" && (
        <ToolbarDropdown
          value={cond.value || "mobile"}
          onChange={(val: string) => onChange({ value: val })}
          propKey="condDevice"
        >
          {DEVICE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </ToolbarDropdown>
      )}

      {cond.type === "auth" && (
        <ToolbarDropdown
          value={cond.key || "status"}
          onChange={(val: string) => {
            const defaults: Record<string, Partial<Condition>> = {
              status: { operator: "equals", value: "logged-in" },
              "customer.hasSubscription": { operator: "equals", value: "true" },
              "customer.orderCount": { operator: "greater-than", value: "0" },
              "customer.totalSpent": { operator: "greater-than", value: "0" },
            };
            onChange({ key: val, ...(defaults[val] || { operator: "equals", value: "" }) });
          }}
          propKey="condAuthField"
        >
          {AUTH_FIELDS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </ToolbarDropdown>
      )}

      {cond.type === "company" && (
        <ToolbarDropdown
          value={cond.key}
          onChange={(val: string) => onChange({ key: val })}
          propKey="condCompanyField"
        >
          {COMPANY_FIELDS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </ToolbarDropdown>
      )}

      {cond.type === "connector" && (
        <>
          <ToolbarDropdown
            value={cond.key.split(".")[0] || ""}
            onChange={(val: string) => onChange({ key: val })}
            propKey="condConnProvider"
          >
            <option value="">Select provider...</option>
            {connectorOptions.map(opt => (
              <option key={opt.provider} value={opt.provider}>
                {opt.provider.charAt(0).toUpperCase() + opt.provider.slice(1)}
              </option>
            ))}
          </ToolbarDropdown>
          {cond.key && (
            <ToolbarDropdown
              value={cond.key}
              onChange={(val: string) => onChange({ key: val })}
              propKey="condConnCollection"
            >
              <option value={cond.key.split(".")[0]}>Any data</option>
              {connectorOptions
                .find(o => o.provider === cond.key.split(".")[0])
                ?.collections.map(col => (
                  <option key={col} value={`${cond.key.split(".")[0]}.${col}`}>
                    {col.charAt(0).toUpperCase() + col.slice(1)}
                  </option>
                ))}
            </ToolbarDropdown>
          )}
        </>
      )}

      {cond.type === "form-field" && (
        <>
          <ToolbarDropdown
            value={cond.target || ""}
            onChange={(val: string) => onChange({ target: val })}
            propKey="condFormTarget"
          >
            <option value="">Select field...</option>
            {formElements.map(opt => (
              <option key={opt.nodeId} value={opt.anchor}>
                {opt.label}
              </option>
            ))}
          </ToolbarDropdown>
          <div className="input-wrapper">
            <input
              type="text"
              value={cond.key}
              onChange={e => onChange({ key: e.target.value })}
              placeholder="field name"
              className="input-plain w-full font-mono text-xs"
            />
          </div>
        </>
      )}

      {cond.type === "url-param" && (
        <div className="input-wrapper">
          <input
            type="text"
            value={cond.key}
            onChange={e => onChange({ key: e.target.value })}
            placeholder="param name (e.g. ref)"
            className="input-plain w-full font-mono text-xs"
          />
        </div>
      )}

      {/* Operator — skip for device (implicit equals) */}
      {cond.type !== "device" && (
        <ToolbarDropdown
          value={cond.operator}
          onChange={(val: string) => onChange({ operator: val as Operator })}
          propKey="condOp"
        >
          {operators.map(op => (
            <option key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </option>
          ))}
        </ToolbarDropdown>
      )}

      {/* Value — hidden for exists/not-exists and device */}
      {cond.type !== "device" &&
        !NO_VALUE_OPERATORS.includes(cond.operator) &&
        (cond.type === "auth" && cond.key === "status" ? (
          <ToolbarDropdown
            value={cond.value || "logged-in"}
            onChange={(val: string) => onChange({ value: val })}
            propKey="condAuthValue"
          >
            {AUTH_STATUS_VALUES.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </ToolbarDropdown>
        ) : cond.type === "auth" && cond.key === "customer.hasSubscription" ? (
          <ToolbarDropdown
            value={cond.value || "true"}
            onChange={(val: string) => onChange({ value: val })}
            propKey="condAuthBoolValue"
          >
            {AUTH_BOOL_VALUES.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </ToolbarDropdown>
        ) : (
          <div className="input-wrapper">
            <input
              type="text"
              value={cond.value}
              onChange={e => onChange({ value: e.target.value })}
              placeholder="expected value"
              className="input-plain w-full font-mono text-xs"
            />
          </div>
        ))}
    </div>
  );
}

// ── Condition Group ──────────────────────────────────────────────────────────

export function ConditionGroupUI({
  group,
  groupIndex,
  onChange,
  onRemove,
  formElements,
  connectorOptions,
}: {
  group: ConditionGroup;
  groupIndex: number;
  onChange: (updated: ConditionGroup) => void;
  onRemove: () => void;
  formElements: ReturnType<typeof useElementPicker>;
  connectorOptions: ReturnType<typeof useConnectorOptions>;
}) {
  const updateCondition = (condIndex: number, patch: Partial<Condition>) => {
    const updated = [...group.conditions];
    updated[condIndex] = { ...updated[condIndex], ...patch };
    onChange({ ...group, conditions: updated });
  };

  const removeCondition = (condIndex: number) => {
    const updated = group.conditions.filter((_, i) => i !== condIndex);
    if (updated.length === 0) {
      onRemove();
    } else {
      onChange({ ...group, conditions: updated });
    }
  };

  const addCondition = () => {
    onChange({
      ...group,
      conditions: [...group.conditions, defaultCondition("url-param")],
    });
  };

  return (
    <div className="border-base-300 rounded-lg border p-2">
      {/* AND/OR toggle within group */}
      {group.conditions.length > 1 && (
        <div className="bg-neutral mb-2 flex gap-1 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => onChange({ ...group, logic: "all" })}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              group.logic === "all"
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-neutral-content hover:text-base-content"
            }`}
          >
            All match (AND)
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...group, logic: "any" })}
            className={`flex-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
              group.logic === "any"
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-neutral-content hover:text-base-content"
            }`}
          >
            Any match (OR)
          </button>
        </div>
      )}

      {group.conditions.map((cond, i) => (
        <ConditionRow
          key={i}
          cond={cond}
          onChange={patch => updateCondition(i, patch)}
          onRemove={() => removeCondition(i)}
          formElements={formElements}
          connectorOptions={connectorOptions}
        />
      ))}

      <ToolbarDashedButton onClick={addCondition}>Add condition</ToolbarDashedButton>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export const ConditionsInput = () => {
  const {
    conditions,
    conditionLogic,
    conditionGroups,
    actions: { setProp },
  } = useNode(node => ({
    conditions: (node.data?.props.conditions || []) as Condition[],
    conditionLogic: (node.data?.props.conditionLogic || "all") as ConditionLogic,
    conditionGroups: node.data?.props.conditionGroups as ConditionGroup[] | undefined,
  }));

  const rawFormElements = useElementPicker("all");
  const formElements = Array.isArray(rawFormElements) ? rawFormElements : [];
  const connectorOptions = useConnectorOptions();

  const groups = parseGroups(conditions, conditionGroups);

  const saveGroups = (updated: ConditionGroup[]) => {
    setProp((props: any) => {
      props.conditionGroups = updated;
      // Keep flat conditions in sync for backward compat with existing evaluator
      // (flat = first group's conditions when there's only one group)
      if (updated.length === 1) {
        props.conditions = updated[0].conditions;
        props.conditionLogic = updated[0].logic;
      } else if (updated.length === 0) {
        props.conditions = [];
        props.conditionLogic = "all";
      } else {
        // Multiple groups: store all conditions flat for legacy readers,
        // but conditionGroups is the source of truth
        props.conditions = updated.flatMap(g => g.conditions);
        props.conditionLogic = "all";
      }
    });
  };

  const updateGroup = (groupIndex: number, updated: ConditionGroup) => {
    const newGroups = [...groups];
    newGroups[groupIndex] = updated;
    saveGroups(newGroups);
  };

  const removeGroup = (groupIndex: number) => {
    saveGroups(groups.filter((_, i) => i !== groupIndex));
  };

  const addGroup = () => {
    saveGroups([...groups, { conditions: [defaultCondition("url-param")], logic: "all" }]);
  };

  return (
    <>
      {groups.length === 0 && (
        <p className="text-neutral-content mb-2 text-[11px]">
          No conditions set. This element is always visible.
        </p>
      )}

      {groups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && (
            <div className="my-2 flex items-center gap-2">
              <div className="bg-base-300 h-px flex-1" />
              <span className="text-neutral-content text-[10px] font-bold tracking-wider uppercase">
                OR
              </span>
              <div className="bg-base-300 h-px flex-1" />
            </div>
          )}
          <ConditionGroupUI
            group={group}
            groupIndex={gi}
            onChange={updated => updateGroup(gi, updated)}
            onRemove={() => removeGroup(gi)}
            formElements={formElements}
            connectorOptions={connectorOptions}
          />
        </div>
      ))}

      <div className="mt-2 flex gap-2">
        {groups.length === 0 ? (
          <ToolbarDashedButton onClick={addGroup}>Add condition</ToolbarDashedButton>
        ) : (
          <ToolbarDashedButton onClick={addGroup} icon={<TbPlus size={12} />}>
            Add condition group (OR)
          </ToolbarDashedButton>
        )}
      </div>
    </>
  );
};
