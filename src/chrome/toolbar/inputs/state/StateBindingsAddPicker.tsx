/**
 * StateBindingsAddPicker — section-header `+` for the State section.
 *
 * Single-action: appends an empty binding (one default `state` condition,
 * no modifiers) and signals the body to auto-open it. Mirrors
 * `ConditionsAddPicker` but skips the type-picker menu since every binding
 * has the same shape.
 */
import { useNode } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import { TbPlus } from "react-icons/tb";
import { useAccordionContext } from "../../AccordionContext";
import { getSectionDef } from "../../unified-settings/registry/propertyRegistry";
import {
  PopoverOpenRequestAtom,
  requestOpenPopover,
} from "../../unified-settings/popoverOpenRequestAtom";
import { defaultCondition } from "../advanced/ConditionsInput";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";
import type { StateBinding } from "./StateBindingsInput";

const STATE_BINDINGS_BODY_DEF_ID = "stateBindings";

export default function StateBindingsAddPicker({ def }: PropertyInputProps) {
  const {
    id,
    actions: { setProp },
  } = useNode(node => ({ id: node.id }));
  const accordionCtx = useAccordionContext();
  const sectionTitle = getSectionDef(def.section)?.title;
  const [popoverRequests, setPopoverRequests] = useAtomState(PopoverOpenRequestAtom);

  const onClick = () => {
    setProp((p: any) => {
      const list: StateBinding[] = Array.isArray(p.stateModifiers)
        ? [...p.stateModifiers]
        : [];
      list.push({
        conditions: [{ conditions: [defaultCondition("state")], logic: "all" }],
        modifiers: [],
      });
      p.stateModifiers = list;
    });
    if (sectionTitle && accordionCtx?.setOpen) accordionCtx.setOpen(sectionTitle, true);
    requestOpenPopover(popoverRequests, setPopoverRequests, id, STATE_BINDINGS_BODY_DEF_ID);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add state binding"
      className="text-neutral-content hover:text-base-content flex items-center justify-center rounded p-0.5"
    >
      <TbPlus className="size-3.5" aria-hidden />
    </button>
  );
}
