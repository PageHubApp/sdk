/**
 * Conditional visibility — chip-list builder for a node's `conditions[]`.
 *
 * In the inspector toolbar this renders as N `ConditionChipRow`s + a
 * "+ Add condition" picker. Each chip opens a small floating editor with the
 * fields for that one condition.
 *
 * The page-settings AccessTab uses the OR-group variant exported from this
 * file (`ConditionGroupUI`, `parseGroups`, `defaultCondition`) — the toolbar
 * variant intentionally drops OR groups and stores a single AND list.
 */
import { useNode } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import { TbTrash } from "react-icons/tb";
import { Chip } from "@/chrome/primitives/Chip";
import { ToolbarDashedButton } from "../../helpers/ToolbarDashedButton";
import { ToolbarDropdown } from "../../ToolbarDropdown";
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
import { useAtomValue } from "@zedux/react";
import { ConditionChipRow } from "./ConditionChipRow";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";

// ── Category labels ──────────────────────────────────────────────────────────

/**
 * All authorable condition types + their human labels. Exported so action-side
 * gating UIs (`ActionConditionsEditor`) and the section-header `+` picker can
 * share one canonical menu list. Order intentional — most-common first.
 */
export const CONDITION_TYPE_OPTIONS: { value: ConditionType; label: string }[] = [
  { value: "url-param", label: "URL Parameter" },
  { value: "form-field", label: "Form Field" },
  { value: "connector", label: "Connector" },
  { value: "company", label: "Company Variable" },
  { value: "device", label: "Device / Viewport" },
  { value: "auth", label: "Auth Status" },
  { value: "localStorage", label: "Local Storage" },
  { value: "state", label: "State" },
];

const CATEGORY_OPTIONS = CONDITION_TYPE_OPTIONS;

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

function useConnectorOptions(): { provider: string; collections: string[] }[] {
  const data = getConnectorData();
  if (!data) return [];
  return Object.entries(data).map(([provider, pdata]) => ({
    provider,
    collections: Object.keys(pdata?.bindings || {}),
  }));
}

/** Parse a flat conditions array + conditionGroups into condition groups.
 *  Legacy format (flat array) becomes a single group. */
export function parseGroups(
  conditions: Condition[],
  conditionGroups: ConditionGroup[] | undefined
): ConditionGroup[] {
  if (conditionGroups && conditionGroups.length > 0) return conditionGroups;
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
    case "localStorage":
      return { type: "localStorage", key: "", operator: "not-exists", value: "" };
    case "state":
      return { type: "state", key: "", operator: "equals", value: "" };
    default:
      return { type, key: "", operator: "equals", value: "" };
  }
}

// ── Field block (reused by ConditionRow + ConditionEditorPanel) ──────────────

export function ConditionFields({
  cond,
  onChange,
  formElements,
  connectorOptions,
}: {
  cond: Condition;
  onChange: (patch: Partial<Condition>) => void;
  formElements: ReturnType<typeof useElementPicker>;
  connectorOptions: ReturnType<typeof useConnectorOptions>;
}) {
  const operators = OPERATORS_BY_TYPE[cond.type] || OPERATORS_BY_TYPE["url-param"];

  return (
    <>
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
          <Chip>
            <input
              type="text"
              value={cond.key}
              onChange={e => onChange({ key: e.target.value })}
              placeholder="field name"
              className="h-full w-full bg-transparent px-1 font-mono text-xs outline-none"
            />
          </Chip>
        </>
      )}

      {cond.type === "url-param" && (
        <Chip>
          <input
            type="text"
            value={cond.key}
            onChange={e => onChange({ key: e.target.value })}
            placeholder="param name (e.g. ref)"
            className="h-full w-full bg-transparent px-1 font-mono text-xs outline-none"
          />
        </Chip>
      )}

      {cond.type === "localStorage" && (
        <Chip>
          <input
            type="text"
            value={cond.key}
            onChange={e => onChange({ key: e.target.value })}
            placeholder="storage key (e.g. ph-cookie-consent)"
            className="h-full w-full bg-transparent px-1 font-mono text-xs outline-none"
          />
        </Chip>
      )}

      {cond.type === "state" && (
        <Chip>
          <input
            type="text"
            value={cond.key}
            onChange={e => onChange({ key: e.target.value })}
            placeholder="state key (element id or named state)"
            className="h-full w-full bg-transparent px-1 font-mono text-xs outline-none"
          />
        </Chip>
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
          <Chip>
            <input
              type="text"
              value={cond.value}
              onChange={e => onChange({ value: e.target.value })}
              placeholder="expected value"
              className="h-full w-full bg-transparent px-1 font-mono text-xs outline-none"
            />
          </Chip>
        ))}
    </>
  );
}

// ── Single Condition Row (AccessTab card layout) ─────────────────────────────

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
      <ConditionFields
        cond={cond}
        onChange={onChange}
        formElements={formElements}
        connectorOptions={connectorOptions}
      />
    </div>
  );
}

// ── Condition Group (AccessTab) ──────────────────────────────────────────────

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
    <div>
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

// ── Toolbar chip-list body ───────────────────────────────────────────────────

// Matches the def id registered in `registry/properties/advanced.ts`. The
// header `+` picker dispatches an open-request keyed by (nodeId, this id)
// when it adds a condition.
const CONDITIONS_BODY_DEF_ID = "conditions";

export const ConditionsInput = () => {
  const {
    id,
    actions: { setProp },
    conditions,
    conditionGroups,
  } = useNode(node => ({
    id: node.id,
    conditions: (node.data?.props?.conditions || []) as Condition[],
    conditionGroups: node.data?.props?.conditionGroups as ConditionGroup[] | undefined,
  }));
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);
  const requestVersion =
    popoverRequests.get(popoverRequestKey(id, CONDITIONS_BODY_DEF_ID)) || 0;

  // Toolbar surface only deals with a single AND list. Legacy conditionGroups
  // data is read flat (first group's conditions), and any save rewrites the
  // single canonical shape — `conditions[]` + `conditionLogic: "all"`. Multi-
  // group OR data is still authorable from page-settings AccessTab.
  const groups = parseGroups(conditions, conditionGroups);
  const list: Condition[] = groups[0]?.conditions ?? [];

  const writeList = (next: Condition[]) => {
    setProp((p: any) => {
      p.conditions = next;
      p.conditionLogic = "all";
      if (p.conditionGroups !== undefined) {
        p.conditionGroups = next.length > 0 ? [{ conditions: next, logic: "all" }] : [];
      }
    });
  };

  const updateAt = (idx: number, patch: Partial<Condition>) => {
    const next = list.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    writeList(next);
  };

  const removeAt = (idx: number) => {
    writeList(list.filter((_, i) => i !== idx));
  };

  // Auto-open the new tail chip. Two trigger paths:
  //   1. Length grew while this body was mounted — the length-growth
  //      detector fires.
  //   2. The header "+" picker added a chip while the section was closed
  //      (this body unmounted). The picker also bumps `PopoverOpenRequestAtom`
  //      via `requestOpenPopover(..., CONDITIONS_BODY_DEF_ID)`, and we open
  //      the tail when `requestVersion` advances. The length detector can't
  //      cover this case because `prevLengthRef` initializes post-add on
  //      remount.
  const prevLengthRef = useRef(list.length);
  const [pendingOpenIdx, setPendingOpenIdx] = useState<number | null>(null);
  useEffect(() => {
    if (list.length > prevLengthRef.current) {
      setPendingOpenIdx(list.length - 1);
    }
    prevLengthRef.current = list.length;
  }, [list.length]);
  // Init to 0, NOT to the current `requestVersion`. If the picker dispatched
  // while this body was unmounted, the very first version we see on mount IS
  // the bump we need to consume — initializing to it would make the equality
  // check bail. Mirrors `EffectRowInputPopover.tsx`'s `useRef(0)`.
  const lastRequestVersionRef = useRef(0);
  useEffect(() => {
    if (requestVersion === 0 || requestVersion === lastRequestVersionRef.current) return;
    lastRequestVersionRef.current = requestVersion;
    if (list.length > 0) setPendingOpenIdx(list.length - 1);
  }, [requestVersion, list.length]);
  const consumeAutoOpen = () => setPendingOpenIdx(null);

  if (list.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {list.map((cond, i) => (
        <ConditionChipRow
          key={i}
          cond={cond}
          autoOpen={i === pendingOpenIdx}
          onAutoOpenConsumed={consumeAutoOpen}
          onChange={patch => updateAt(i, patch)}
          onRemove={() => removeAt(i)}
        />
      ))}
    </div>
  );
};

