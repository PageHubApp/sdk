/**
 * ConditionsAddPicker — section-header `+` for the Conditions section.
 *
 * Registered as a popover-mode property on the conditions section so
 * AccordionAddMenu mounts it INSIDE the section title row (single-popover
 * `sectionPopoverProp` path). Renders a `SearchableMenuPopover` whose items
 * are the 6 condition categories. Picking one appends a fresh condition to
 * `props.conditions` — the body's chip-list (`ConditionsInput`) detects the
 * length bump and auto-opens the new chip's editor.
 */
import { useNode } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import { useRef } from "react";
import { TbPlus } from "react-icons/tb";
import {
  SearchableMenuPopover,
  type SearchableMenuItem,
  type SearchableMenuPopoverHandle,
} from "../../../primitives/SearchableMenuPopover";
import { useAccordionContext } from "../../AccordionContext";
import { getSectionDef } from "../../unified-settings/registry/propertyRegistry";
import {
  PopoverOpenRequestAtom,
  requestOpenPopover,
  useSectionPopoverOpenRequest,
} from "../../unified-settings/popoverOpenRequestAtom";
import type { Condition, ConditionType } from "../../../../utils/conditions/types";
import { defaultCondition } from "./ConditionsInput";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

const ITEMS: SearchableMenuItem<ConditionType>[] = [
  { id: "url-param", label: "URL Parameter", data: "url-param" },
  { id: "form-field", label: "Form Field", data: "form-field" },
  { id: "connector", label: "Connector", data: "connector" },
  { id: "company", label: "Company Variable", data: "company" },
  { id: "device", label: "Device / Viewport", data: "device" },
  { id: "auth", label: "Auth Status", data: "auth" },
  { id: "localStorage", label: "Local Storage", data: "localStorage" },
];

// Body's def id — picker dispatches an open-request keyed by this so the
// `ConditionsInput` body can listen on its own def id (canonical pattern,
// see `EffectRowInputPopover.tsx`).
const CONDITIONS_BODY_DEF_ID = "conditions";

export default function ConditionsAddPicker({ def }: PropertyInputProps) {
  const {
    id,
    actions: { setProp },
  } = useNode(node => ({ id: node.id }));
  const accordionCtx = useAccordionContext();
  const sectionTitle = getSectionDef(def.section)?.title;
  const [popoverRequests, setPopoverRequests] = useAtomState(PopoverOpenRequestAtom);
  const popoverRef = useRef<SearchableMenuPopoverHandle>(null);
  useSectionPopoverOpenRequest(id, def.id, () =>
    requestAnimationFrame(() => popoverRef.current?.open()),
  );

  const onPick = (item: SearchableMenuItem<ConditionType>) => {
    if (!item.data) return;
    const cond = defaultCondition(item.data);
    setProp((p: any) => {
      const list: Condition[] = Array.isArray(p.conditions) ? [...p.conditions] : [];
      list.push(cond);
      p.conditions = list;
      p.conditionLogic = "all";
      if (p.conditionGroups !== undefined) {
        p.conditionGroups = list.length > 0 ? [{ conditions: list, logic: "all" }] : [];
      }
    });
    // Tell the body to auto-open the new tail chip. Routed through the
    // canonical PopoverOpenRequestAtom so it survives the body's
    // unmount→remount when the section was previously closed (the body's
    // length-growth detector can't catch that case because `prevLengthRef`
    // initializes to the post-add length).
    if (sectionTitle && accordionCtx?.setOpen) accordionCtx.setOpen(sectionTitle, true);
    requestOpenPopover(popoverRequests, setPopoverRequests, id, CONDITIONS_BODY_DEF_ID);
  };

  return (
    <SearchableMenuPopover
      ref={popoverRef}
      items={ITEMS}
      onSelect={onPick}
      trigger={<TbPlus className="size-3.5" aria-hidden />}
      triggerAriaLabel="Add condition"
      searchPlaceholder="Search conditions…"
      anchor="bottom end"
      panelWidthClass="w-56"
    />
  );
}
