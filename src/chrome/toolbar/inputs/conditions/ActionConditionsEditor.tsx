/**
 * ActionConditionsEditor — controlled chip-list builder for an action's
 * `conditions` array.
 *
 * Same building blocks as the toolbar `ConditionsInput` (used for node
 * visibility) and the page-settings `AccessTab` (used for page access),
 * just packaged with a `value`/`onChange` interface so it can be embedded
 * inside any action sub-form. Single-group AND list — multi-group OR is
 * deferred (matches what the toolbar surface authors today).
 *
 * Reuses:
 *   - `ConditionChipRow` for each row's chip + lazy-mounted editor panel.
 *   - `defaultCondition()` to seed each newly-added condition.
 *   - `CONDITION_TYPE_OPTIONS` as the canonical type list (so node-level
 *     and action-level pickers stay in sync).
 *
 * Usage:
 *   <ActionConditionsEditor
 *     value={action.conditions ?? []}
 *     onChange={groups => patch({ conditions: groups })}
 *   />
 *
 * Exposes the action's conditions as `ConditionGroup[]` to match the type
 * on `ActionBase` and the existing evaluator. Internally collapses to a
 * single AND group — the chip-list shape — and writes a single-group
 * array back. Multi-group OR data passes through untouched if some other
 * surface authors it.
 */
import { useEffect, useRef, useState } from "react";
import { TbPlus } from "react-icons/tb";
import {
  SearchableMenuPopover,
  type SearchableMenuItem,
} from "../../../primitives/SearchableMenuPopover";
import { CONDITION_TYPE_OPTIONS, defaultCondition } from "../advanced/ConditionsInput";
import { ConditionChipRow } from "../advanced/ConditionChipRow";
import type { Condition, ConditionGroup, ConditionType } from "../../../../utils/conditions/types";

interface Props {
  value: ConditionGroup[] | undefined;
  onChange: (next: ConditionGroup[]) => void;
}

const TYPE_ITEMS: SearchableMenuItem<ConditionType>[] = CONDITION_TYPE_OPTIONS.map(o => ({
  id: o.value,
  label: o.label,
  data: o.value,
}));

export function ActionConditionsEditor({ value, onChange }: Props) {
  // Collapse multi-group data to a single AND list (parity with the toolbar
  // ConditionsInput). If existing data carries multiple groups, keep all of
  // them on write but only edit the first — matches AccessTab's loop-of-
  // groups model would be over-kill for an action's gate.
  const groups: ConditionGroup[] = Array.isArray(value) ? value : [];
  const list: Condition[] = groups[0]?.conditions ?? [];
  const trailing = groups.slice(1);

  const writeList = (next: Condition[]) => {
    if (next.length === 0 && trailing.length === 0) {
      onChange([]);
      return;
    }
    const head: ConditionGroup = { conditions: next, logic: "all" };
    onChange([head, ...trailing]);
  };

  const updateAt = (idx: number, patch: Partial<Condition>) => {
    writeList(list.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  };

  const removeAt = (idx: number) => {
    writeList(list.filter((_, i) => i !== idx));
  };

  // Auto-open the just-added chip's editor (mirrors ConditionsInput's
  // length-growth detector — UX consistency between node and action
  // condition flows).
  const prevLengthRef = useRef(list.length);
  const [pendingOpenIdx, setPendingOpenIdx] = useState<number | null>(null);
  useEffect(() => {
    if (list.length > prevLengthRef.current) setPendingOpenIdx(list.length - 1);
    prevLengthRef.current = list.length;
  }, [list.length]);
  const consumeAutoOpen = () => setPendingOpenIdx(null);

  const onPick = (item: SearchableMenuItem<ConditionType>) => {
    if (!item.data) return;
    writeList([...list, defaultCondition(item.data)]);
  };

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
      <SearchableMenuPopover
        items={TYPE_ITEMS}
        onSelect={onPick}
        triggerClassName="text-neutral-content hover:bg-base-200 hover:text-base-content border-base-300 flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-dashed px-2 py-1.5 text-[11px] transition-colors"
        trigger={
          <>
            <TbPlus className="size-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {list.length === 0 ? "Only fire if…" : "Add condition"}
            </span>
          </>
        }
        triggerAriaLabel="Add condition"
        searchPlaceholder="Search conditions…"
        anchor="bottom start"
        panelWidthClass="w-56"
      />
    </div>
  );
}
