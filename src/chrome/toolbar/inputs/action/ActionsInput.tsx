/**
 * Actions — chip-list builder for a node's `actions[]` chain.
 *
 * Renders one `ActionChipRow` per action in the node's chain. The chain is
 * built up from the section header `+` picker (`ActionsAddPicker`) — there
 * is no in-body "Chain Another Action" button anymore; chaining = adding
 * another chip.
 *
 * Mirrors `ConditionsInput.tsx`. Auto-open hand-off (closed-section case)
 * rides the canonical `PopoverOpenRequestAtom` keyed by this body's def id
 * — see docs/sdk/editor-popover-pattern.md §4 + §8.
 *
 * `HandlersInput` lives at the bottom of this body so per-node DOM event
 * handlers stay grouped under the same Action section.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useEffect, useRef, useState } from "react";
import { ActionChipRow } from "./ActionChipRow";
import HandlersInput from "./HandlersInput";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
import { migrateAction, type NodeAction } from "../../../../utils/action";

// Matches the def id registered in `registry/properties/interactions.ts`.
// The header `+` picker dispatches an open-request keyed by (nodeId, this id)
// when it appends an action — see ConditionsInput.tsx for the same pattern.
const ACTIONS_BODY_DEF_ID = "action";

export const ACTIONS_BODY_DEF_ID_EXPORT = ACTIONS_BODY_DEF_ID;

export function ActionsInput() {
  const {
    id,
    actions: { setProp },
    actionList,
  } = useNode(node => {
    const props = node.data.props;
    const list: NodeAction[] = props.actions?.length
      ? (props.actions as NodeAction[])
      : (() => {
          const single = (props.action as NodeAction | undefined) ?? migrateAction(props);
          return single ? [single] : [];
        })();
    return { id: node.id, actionList: list };
  });
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);
  const requestVersion =
    popoverRequests.get(popoverRequestKey(id, ACTIONS_BODY_DEF_ID)) || 0;

  const writeList = (next: NodeAction[]) => {
    setProp((p: any) => {
      p.actions = next;
      // Keep legacy single-action prop in sync for the old runtime path.
      p.action = next[0] || null;
      // Drop pre-migration scratch props.
      delete p.click;
      delete p.url;
      delete p.urlTarget;
      delete p.clickMode;
    });
  };

  const updateAt = (idx: number, next: NodeAction) => {
    writeList(actionList.map((a, i) => (i === idx ? next : a)));
  };

  const removeAt = (idx: number) => {
    writeList(actionList.filter((_, i) => i !== idx));
  };

  // Auto-open the new tail chip. Two trigger paths (mirrors ConditionsInput):
  //   1. Length grew while this body was mounted — the length-growth
  //      detector fires.
  //   2. The header "+" picker added a chip while the section was closed
  //      (this body unmounted). The picker also bumps `PopoverOpenRequestAtom`
  //      via `requestOpenPopover(..., ACTIONS_BODY_DEF_ID)`, and we open
  //      the tail when `requestVersion` advances. The length detector can't
  //      cover that case because `prevLengthRef` initializes post-add on
  //      remount.
  const prevLengthRef = useRef(actionList.length);
  const [pendingOpenIdx, setPendingOpenIdx] = useState<number | null>(null);
  useEffect(() => {
    if (actionList.length > prevLengthRef.current) {
      setPendingOpenIdx(actionList.length - 1);
    }
    prevLengthRef.current = actionList.length;
  }, [actionList.length]);
  // Init to 0 (NOT current `requestVersion`) — see editor-popover-pattern.md §4.
  const lastRequestVersionRef = useRef(0);
  useEffect(() => {
    if (requestVersion === 0 || requestVersion === lastRequestVersionRef.current) return;
    lastRequestVersionRef.current = requestVersion;
    if (actionList.length > 0) setPendingOpenIdx(actionList.length - 1);
  }, [requestVersion, actionList.length]);
  const consumeAutoOpen = () => setPendingOpenIdx(null);

  return (
    <div className="flex flex-col gap-1">
      {actionList.map((action, i) => (
        <ActionChipRow
          key={i}
          action={action}
          autoOpen={i === pendingOpenIdx}
          onAutoOpenConsumed={consumeAutoOpen}
          onChange={next => updateAt(i, next)}
          onRemove={() => removeAt(i)}
        />
      ))}
      <HandlersInput />
    </div>
  );
}
