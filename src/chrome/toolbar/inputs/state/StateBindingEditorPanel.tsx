/**
 * StateBindingEditorPanel — FloatingPanel form for one state binding.
 *
 * Lazy-loaded by StateBindingsInput's chip on click. The form has two parts:
 *   1. Conditions sub-form — reuses `ConditionGroupUI` from ConditionsInput
 *      so authors get the same UX they already know (URL param, state, auth,
 *      device, etc.).
 *   2. Modifier multi-select — toggles modifier names from the node's
 *      registered modifier list. Picking modifiers is the curated path
 *      (forces design-system reuse). Power users can still add raw classes
 *      via the className field outside this panel.
 */
import { useNode, useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useMemo } from "react";
import { TbCheck } from "react-icons/tb";
import { FloatingPanel } from "../../../floating/FloatingPanel";
import { useElementPicker } from "../action/useElementPicker";
import { getConnectorData } from "../../../../utils/design/variables";
import { ConditionGroupUI, defaultCondition } from "../advanced/ConditionsInput";
import type { Condition, ConditionGroup } from "../../../../utils/conditions/types";
import type { ComponentModifier } from "../../../../define/types";
import type { StateBinding } from "./StateBindingsInput";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../popovers/overlayZIndex";

interface PanelProps {
  binding: StateBinding;
  onChange: (next: StateBinding) => void;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
}

function useConnectorOptions() {
  const data = getConnectorData();
  if (!data) return [];
  return Object.entries(data).map(([provider, pdata]) => ({
    provider,
    collections: Object.keys(pdata?.bindings || {}),
  }));
}

export default function StateBindingEditorPanel({
  binding,
  onChange,
  initialPosition,
  onClose,
}: PanelProps) {
  const rawFormElements = useElementPicker("all");
  const formElements = Array.isArray(rawFormElements) ? rawFormElements : [];
  const connectorOptions = useConnectorOptions();

  const { query } = useEditor();
  const { availableModifiers, siteModifiers, nodeName } = useNode(node => ({
    nodeName: node.data?.name as string,
    availableModifiers: ((node.data.type as any)?.craft?.toolbar?.modifiers ||
      []) as ComponentModifier[],
    siteModifiers: [] as ComponentModifier[],
  }));

  // Site-level modifiers stamped onto ROOT.props.modifiers[componentName].
  const rootSiteModifiers = useMemo<ComponentModifier[]>(() => {
    try {
      const root = query.node(ROOT_NODE).get();
      const all = root?.data?.props?.modifiers;
      if (!all || typeof all !== "object") return [];
      return (all[nodeName] || []) as ComponentModifier[];
    } catch {
      return [];
    }
  }, [query, nodeName, siteModifiers]);

  const allModifiers = useMemo(
    () => [...availableModifiers, ...rootSiteModifiers],
    [availableModifiers, rootSiteModifiers]
  );

  // Author single-group AND for v1 — same shape ConditionsInput uses.
  const group: ConditionGroup = binding.conditions?.[0] ?? {
    conditions: [defaultCondition("state")],
    logic: "all",
  };

  const updateGroup = (next: ConditionGroup) => {
    onChange({ ...binding, conditions: next.conditions.length > 0 ? [next] : [] });
  };

  // The remove handler from ConditionGroupUI fires when the last condition
  // is removed; we swap the group out instead of clearing the binding.
  const onGroupRemove = () => {
    onChange({ ...binding, conditions: [] });
  };

  const toggleModifier = (name: string) => {
    const set = new Set(binding.modifiers || []);
    if (set.has(name)) set.delete(name);
    else set.add(name);
    onChange({ ...binding, modifiers: Array.from(set) });
  };

  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="State binding"
      storageKey="state-binding-editor"
      minWidth={320}
      maxWidth={480}
      minHeight={300}
      initialPosition={initialPosition}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable
    >
      <div className="flex flex-col gap-3">
        <div>
          <div className="text-base-content mb-1 text-[11px] font-medium">When</div>
          <ConditionGroupUI
            group={group}
            groupIndex={0}
            onChange={updateGroup}
            onRemove={onGroupRemove}
            formElements={formElements}
            connectorOptions={connectorOptions}
          />
        </div>

        <div>
          <div className="text-base-content mb-1 text-[11px] font-medium">Apply modifiers</div>
          {allModifiers.length === 0 ? (
            <div className="text-neutral-content text-[10px]">
              No modifiers registered for this component. Save a modifier from the Modifiers section
              first.
            </div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {allModifiers.map(mod => {
                const active = (binding.modifiers || []).includes(mod.name);
                return (
                  <button
                    key={mod.name}
                    type="button"
                    onClick={() => toggleModifier(mod.name)}
                    className={`flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] transition-colors ${
                      active
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-base-100 border-base-300 text-neutral-content hover:border-base-content"
                    }`}
                  >
                    {active && <TbCheck className="size-3" aria-hidden />}
                    {mod.label || mod.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </FloatingPanel>
  );
}
