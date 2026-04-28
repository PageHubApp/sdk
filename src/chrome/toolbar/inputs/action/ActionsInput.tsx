/**
 * Actions — chip-list builder for a node's `props.action[]` chain.
 *
 * Body renders one `ActionChipRow` per action entry. New chips are added via
 * the section-header `+` (`ActionsAddPicker`). Custom JS event handlers
 * (`props.handlers` map) live in their OWN sibling section now — see
 * `HandlersInput.tsx`.
 *
 * Auto-open hand-off rides the canonical `PopoverOpenRequestAtom` keyed by
 * `ACTIONS_BODY_DEF_ID = "action"`. See docs/sdk/editor-popover-pattern.md §4 + §8.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useEffect, useRef, useState } from "react";
import { ActionChipRow } from "./ActionChipRow";
import { getNodeAnchor } from "./useElementPicker";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../unified-settings/popoverOpenRequestAtom";
import { migrateActions, type NodeAction } from "../../../../utils/action";

// Matches the def id registered in `registry/properties/interactions.ts`.
// `ActionsAddPicker` dispatches an open-request keyed by (nodeId, this id)
// when it appends an action.
const ACTIONS_BODY_DEF_ID = "action";

export const ACTIONS_BODY_DEF_ID_EXPORT = ACTIONS_BODY_DEF_ID;

export function ActionsInput() {
  const {
    id,
    actions: { setProp },
    actionList,
    selfId,
  } = useNode(node => {
    const props = node.data.props;
    return {
      id: node.id,
      actionList: migrateActions(props),
      selfId: getNodeAnchor(node),
    };
  });
  // Resolves a stable id for "self" picks — returns the existing anchor when
  // present, otherwise stamps the CraftJS node id into `attrs.id` so the
  // runtime / state-registry / show-hide pickers can find it.
  const ensureSelfId = (): string => {
    if (selfId) return selfId;
    setProp((p: any) => {
      const attrs = (p.attrs && typeof p.attrs === "object") ? { ...p.attrs } : {};
      if (typeof attrs.id !== "string" || !attrs.id) attrs.id = id;
      p.attrs = attrs;
    });
    return id;
  };

  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);
  const actionRequestVersion =
    popoverRequests.get(popoverRequestKey(id, ACTIONS_BODY_DEF_ID)) || 0;

  const writeActions = (next: NodeAction[]) => {
    setProp((p: any) => {
      // Single field, always the array shape — runtime + editor agree on one
      // schema. Empty list → null so isActive gating sees an unset action.
      p.action = next.length > 0 ? next : null;
      // Drop legacy / dual-write props on every save so old data converges.
      delete p.actions;
      delete p.click;
      delete p.url;
      delete p.urlTarget;
      delete p.clickMode;
    });
  };

  const updateActionAt = (idx: number, next: NodeAction) => {
    writeActions(actionList.map((a, i) => (i === idx ? next : a)));
  };
  const removeActionAt = (idx: number) => {
    writeActions(actionList.filter((_, i) => i !== idx));
  };

  // ── Auto-open: action tail ────────────────────────────────────────────
  const prevActionLenRef = useRef(actionList.length);
  const [pendingActionIdx, setPendingActionIdx] = useState<number | null>(null);
  useEffect(() => {
    if (actionList.length > prevActionLenRef.current) {
      setPendingActionIdx(actionList.length - 1);
    }
    prevActionLenRef.current = actionList.length;
  }, [actionList.length]);
  // Init to 0 (NOT current version) — see editor-popover-pattern.md §4.
  const lastActionVersionRef = useRef(0);
  useEffect(() => {
    if (actionRequestVersion === 0 || actionRequestVersion === lastActionVersionRef.current)
      return;
    lastActionVersionRef.current = actionRequestVersion;
    if (actionList.length > 0) setPendingActionIdx(actionList.length - 1);
  }, [actionRequestVersion, actionList.length]);
  const consumeActionAutoOpen = () => setPendingActionIdx(null);

  return (
    <div className="flex flex-col gap-1">
      {actionList.map((action, i) => (
        <ActionChipRow
          key={`action-${i}`}
          action={action}
          autoOpen={i === pendingActionIdx}
          onAutoOpenConsumed={consumeActionAutoOpen}
          onChange={next => updateActionAt(i, next)}
          onRemove={() => removeActionAt(i)}
          selfId={selfId}
          ensureSelfId={ensureSelfId}
        />
      ))}
    </div>
  );
}
