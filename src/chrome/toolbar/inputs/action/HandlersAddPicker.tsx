/**
 * HandlersAddPicker — dashed `+ Add Handler` button below the action chips.
 *
 * Lives inside the Action body (NOT in the section header — the section's
 * header `+` is for actions). Renders a `SearchableMenuPopover` of available
 * event names; events already in use on this node are filtered out.
 *
 * Picking one writes `props.handlers[event] = ""` and dispatches a
 * `PopoverOpenRequestAtom` bump keyed to the body's handler-tail def id so
 * `ActionsInput` auto-opens the new chip's editor. See
 * docs/sdk/editor-popover-pattern.md §4 + §8.
 */
import { useNode } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import { TbPlus } from "react-icons/tb";
import {
  SearchableMenuPopover,
  type SearchableMenuItem,
} from "../../../primitives/SearchableMenuPopover";
import {
  PopoverOpenRequestAtom,
  requestOpenPopover,
} from "../../unified-settings/popoverOpenRequestAtom";
import { HANDLER_EVENT_OPTIONS } from "./handlerEvents";

// Sub-key for the handler tail. Distinct from the action body's `"action"`
// key so the bus can target either tail independently.
export const HANDLERS_BODY_DEF_ID = "action.handler";

interface Props {
  takenEvents: string[];
}

export function HandlersAddPicker({ takenEvents }: Props) {
  const {
    id,
    actions: { setProp },
  } = useNode(node => ({ id: node.id }));
  const [popoverRequests, setPopoverRequests] = useAtomState(PopoverOpenRequestAtom);

  const taken = new Set(takenEvents);
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
    requestOpenPopover(popoverRequests, setPopoverRequests, id, HANDLERS_BODY_DEF_ID);
  };

  return (
    <SearchableMenuPopover
      items={items}
      onSelect={onPick}
      trigger={
        <span className="flex items-center gap-1.5">
          <TbPlus className="size-3.5" aria-hidden />
          <span>Add Handler</span>
        </span>
      }
      triggerAriaLabel="Add handler"
      triggerClassName="border-base-300 hover:border-base-content/30 hover:bg-base-200/40 text-neutral-content hover:text-base-content flex w-full items-center justify-center rounded-md border border-dashed py-1.5 text-xs transition-colors"
      searchPlaceholder="Search events…"
      emptyMessage="All events in use"
      anchor="bottom start"
      panelWidthClass="w-56"
    />
  );
}
