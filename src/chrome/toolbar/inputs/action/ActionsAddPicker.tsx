/**
 * ActionsAddPicker — section-header `+` for the Action section.
 *
 * Registered as a popover-mode property on the `action` section so
 * AccordionAddMenu mounts it INSIDE the section title row (single-popover
 * `sectionPopoverProp` path). Renders a `SearchableMenuPopover` whose items
 * are the action types (Link, Open Modal, Show / Hide, …). Picking one
 * appends a fresh action to `props.actions` and dispatches a popover-open
 * request keyed by the body's def id so `ActionsInput` auto-opens the new
 * chip's editor — even when the body was unmounted (closed accordion
 * section). See docs/sdk/editor-popover-pattern.md §4 + §8.
 */
import { useNode } from "@craftjs/core";
import { useAtomState } from "@zedux/react";
import { TbPlus } from "react-icons/tb";
import {
  SearchableMenuPopover,
  type SearchableMenuItem,
} from "../../../primitives/SearchableMenuPopover";
import { useAccordionContext } from "../../AccordionContext";
import { getSectionDef } from "../../unified-settings/registry/propertyRegistry";
import {
  PopoverOpenRequestAtom,
  requestOpenPopover,
} from "../../unified-settings/popoverOpenRequestAtom";
import {
  ACTION_TYPE_OPTIONS,
  type ActionType,
  type NodeAction,
  migrateAction,
} from "../../../../utils/action";
import { ACTION_DEFAULTS } from "./ActionInput";
import type { PropertyInputProps } from "../../unified-settings/registry/propertyDefs";

// Body's def id — matches the registry entry the picker pairs with.
const ACTIONS_BODY_DEF_ID = "action";

const ITEMS: SearchableMenuItem<ActionType>[] = ACTION_TYPE_OPTIONS.map(opt => ({
  id: opt.value,
  label: opt.label,
  hint: opt.group,
  data: opt.value,
}));

export default function ActionsAddPicker({ def }: PropertyInputProps) {
  const {
    id,
    actions: { setProp },
  } = useNode(node => ({ id: node.id }));
  const accordionCtx = useAccordionContext();
  const sectionTitle = getSectionDef(def.section)?.title;
  const [popoverRequests, setPopoverRequests] = useAtomState(PopoverOpenRequestAtom);

  const onPick = (item: SearchableMenuItem<ActionType>) => {
    if (!item.data) return;
    const next = ACTION_DEFAULTS[item.data];
    setProp((p: any) => {
      // Migrate any legacy single-action / scratch props onto the canonical
      // `actions[]` shape on first add so the chip-list reads cleanly.
      const existing: NodeAction[] = Array.isArray(p.actions) && p.actions.length > 0
        ? [...p.actions]
        : (() => {
            const single = (p.action as NodeAction | undefined) ?? migrateAction(p);
            return single ? [single] : [];
          })();
      existing.push(next);
      p.actions = existing;
      p.action = existing[0] || null;
      delete p.click;
      delete p.url;
      delete p.urlTarget;
      delete p.clickMode;
    });
    if (sectionTitle && accordionCtx?.setOpen) accordionCtx.setOpen(sectionTitle, true);
    requestOpenPopover(popoverRequests, setPopoverRequests, id, ACTIONS_BODY_DEF_ID);
  };

  return (
    <SearchableMenuPopover
      items={ITEMS}
      onSelect={onPick}
      trigger={<TbPlus className="size-3.5" aria-hidden />}
      triggerAriaLabel="Add action"
      searchPlaceholder="Search actions…"
      anchor="bottom end"
      panelWidthClass="w-56"
    />
  );
}
