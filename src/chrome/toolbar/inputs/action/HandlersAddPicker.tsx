/**
 * HandlersAddPicker — section-header `+` for the Handlers section.
 *
 * Registered as a popover-mode property on the handlers section so
 * AccordionAddMenu mounts it INSIDE the section title row (single-popover
 * `sectionPopoverProp` path). Renders a `SearchableMenuPopover` of available
 * event names; events already in use on this node are filtered out.
 *
 * Picking one writes `props.handlers[event] = ""` and dispatches a
 * `PopoverOpenRequestAtom` bump keyed to `HANDLERS_BODY_DEF_ID` so
 * `HandlersInput` auto-opens the new chip's editor — even when the section
 * was previously closed. See docs/sdk/editor-popover-pattern.md §4 + §8.
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
import { HANDLER_EVENT_OPTIONS } from "./handlerEvents";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

// Body's def id — matches the registry entry the picker pairs with.
export const HANDLERS_BODY_DEF_ID = "handlers";

export default function HandlersAddPicker({ def }: PropertyInputProps) {
  const {
    id,
    actions: { setProp },
    handlers,
  } = useNode(node => ({
    id: node.id,
    handlers:
      node.data.props.handlers && typeof node.data.props.handlers === "object"
        ? (node.data.props.handlers as Record<string, string>)
        : {},
  }));
  const accordionCtx = useAccordionContext();
  const sectionTitle = getSectionDef(def.section)?.title;
  const [popoverRequests, setPopoverRequests] = useAtomState(PopoverOpenRequestAtom);
  const popoverRef = useRef<SearchableMenuPopoverHandle>(null);
  useSectionPopoverOpenRequest(id, def.id, () =>
    requestAnimationFrame(() => popoverRef.current?.open())
  );

  const taken = new Set(Object.keys(handlers));
  const items: SearchableMenuItem<string>[] = HANDLER_EVENT_OPTIONS.filter(
    opt => !taken.has(opt.value)
  ).map(opt => ({
    id: opt.value,
    label: opt.label,
    data: opt.value,
  }));

  const onPick = (item: SearchableMenuItem<string>) => {
    if (!item.data) return;
    const event = item.data;
    setProp((p: any) => {
      const next: Record<string, string> = { ...(p.handlers || {}) };
      next[event] = "";
      p.handlers = next;
    });
    if (sectionTitle && accordionCtx?.setOpen) accordionCtx.setOpen(sectionTitle, true);
    requestOpenPopover(popoverRequests, setPopoverRequests, id, HANDLERS_BODY_DEF_ID);
  };

  return (
    <SearchableMenuPopover
      ref={popoverRef}
      items={items}
      onSelect={onPick}
      trigger={<TbPlus className="size-3.5" aria-hidden />}
      triggerAriaLabel="Add handler"
      searchPlaceholder="Search events…"
      emptyMessage="All events in use"
      anchor="bottom end"
      panelWidthClass="w-56"
    />
  );
}
