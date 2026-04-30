/**
 * StateBindingsAddPicker — section-header `+` for the Interactions → State section.
 *
 * Container nodes get a 3-way picker (Visibility key / Computed binding /
 * State binding) since they wire to the state registry in three different ways.
 * Other nodes only get the State binding option (their existing single-action add).
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
import { defaultCondition } from "../advanced/ConditionsInput";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";
import type { StateBinding } from "./StateBindingsInput";
import type { ComputedStateBinding } from "../../../../utils/conditions/computedState";

const STATE_BINDINGS_BODY_DEF_ID = "stateBindings";

type StateAddType = "visibility" | "computed" | "binding";

const CONTAINER_ITEMS: SearchableMenuItem<StateAddType>[] = [
  {
    id: "visibility",
    label: "Visibility key",
    help: "Read show/hide from a state key",
    data: "visibility",
  },
  {
    id: "computed",
    label: "Computed binding",
    help: "Derive a new state value",
    data: "computed",
  },
  {
    id: "binding",
    label: "State binding",
    help: "Apply modifiers when state matches",
    data: "binding",
  },
];

export default function StateBindingsAddPicker({ def }: PropertyInputProps) {
  const {
    id,
    nodeName,
    actions: { setProp },
  } = useNode(node => ({
    id: node.id,
    nodeName: (node.data?.name || node.data?.displayName || "") as string,
  }));
  const accordionCtx = useAccordionContext();
  const sectionTitle = getSectionDef(def.section)?.title;
  const [popoverRequests, setPopoverRequests] = useAtomState(PopoverOpenRequestAtom);
  const popoverRef = useRef<SearchableMenuPopoverHandle>(null);

  const isContainer = nodeName === "Container";

  const addStateBinding = () => {
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

  const addVisibilityKey = () => {
    setProp((p: any) => {
      if (typeof p.visibilityStateKey !== "string") p.visibilityStateKey = "";
    });
    if (sectionTitle && accordionCtx?.setOpen) accordionCtx.setOpen(sectionTitle, true);
  };

  const addComputedBinding = () => {
    setProp((p: any) => {
      const list: ComputedStateBinding[] = Array.isArray(p.computedStateBindings)
        ? [...p.computedStateBindings]
        : [];
      list.push({ key: "", from: [], compute: { type: "all-truthy" } });
      p.computedStateBindings = list;
    });
    if (sectionTitle && accordionCtx?.setOpen) accordionCtx.setOpen(sectionTitle, true);
  };

  const onPick = (item: SearchableMenuItem<StateAddType>) => {
    if (item.data === "visibility") addVisibilityKey();
    else if (item.data === "computed") addComputedBinding();
    else if (item.data === "binding") addStateBinding();
  };

  // Title-row click: containers open the menu, others fast-add a state binding.
  useSectionPopoverOpenRequest(id, def.id, () => {
    if (isContainer) requestAnimationFrame(() => popoverRef.current?.open());
    else addStateBinding();
  });

  if (!isContainer) {
    return (
      <button
        type="button"
        onClick={addStateBinding}
        aria-label="Add state binding"
        className="text-neutral-content hover:text-base-content flex items-center justify-center rounded p-0.5"
      >
        <TbPlus className="size-3.5" aria-hidden />
      </button>
    );
  }

  return (
    <SearchableMenuPopover
      ref={popoverRef}
      items={CONTAINER_ITEMS}
      onSelect={onPick}
      trigger={<TbPlus className="size-3.5" aria-hidden />}
      triggerAriaLabel="Add state wiring"
      searchPlaceholder="Search…"
      anchor="bottom end"
      panelWidthClass="w-72"
    />
  );
}
