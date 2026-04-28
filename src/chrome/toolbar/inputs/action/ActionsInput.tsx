/**
 * Actions — chip-list builder for a node's action chain AND its `handlers`
 * map (custom JS event strings).
 *
 * Body renders two chip-lists stacked:
 *   1. Action chips, top — one per `props.action[]` entry (or one chip when
 *      `props.action` is a single object, kept as a length-1 array shape on
 *      next save). Added via the section-header `+` (`ActionsAddPicker`).
 *   2. Handler chips, below — one per `props.handlers` key. Added via the
 *      in-body `+ Add Handler` picker (`HandlersAddPicker`).
 *
 * Mirrors `ConditionsInput.tsx` but with a mixed-source body (array + map).
 * Auto-open hand-off rides the canonical `PopoverOpenRequestAtom` with TWO
 * def ids — `"action"` for the action tail and `"action.handler"` for the
 * handler tail. Two keys, one bus; see docs/sdk/editor-popover-pattern.md
 * §4 + §8.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActionChipRow } from "./ActionChipRow";
import { HandlerChipRow } from "./HandlerChipRow";
import { HandlersAddPicker, HANDLERS_BODY_DEF_ID } from "./HandlersAddPicker";
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
    handlers,
    selfId,
  } = useNode(node => {
    const props = node.data.props;
    const handlersMap: Record<string, string> =
      props.handlers && typeof props.handlers === "object" ? props.handlers : {};
    return {
      id: node.id,
      actionList: migrateActions(props),
      handlers: handlersMap,
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
  const handlerRequestVersion =
    popoverRequests.get(popoverRequestKey(id, HANDLERS_BODY_DEF_ID)) || 0;

  // Stable derived list of [event, code] pairs from the handler map.
  const handlerEntries = useMemo(
    () =>
      Object.entries(handlers).filter(
        ([, v]) => typeof v === "string"
      ) as [string, string][],
    [handlers]
  );
  const handlerKeys = useMemo(() => handlerEntries.map(([e]) => e), [handlerEntries]);
  const handlerKeysSig = handlerKeys.join("|");

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

  const updateHandler = (
    prevEvent: string,
    next: { event: string; code: string }
  ) => {
    setProp((p: any) => {
      const map: Record<string, string> = { ...(p.handlers || {}) };
      // Preserve insertion order if the event didn't change. If it did, drop
      // the old key and add the new one at the tail.
      if (prevEvent === next.event) {
        map[prevEvent] = next.code;
      } else {
        delete map[prevEvent];
        map[next.event] = next.code;
      }
      p.handlers = map;
    });
  };
  const removeHandler = (event: string) => {
    setProp((p: any) => {
      if (!p.handlers) return;
      const map: Record<string, string> = { ...p.handlers };
      delete map[event];
      if (Object.keys(map).length === 0) {
        delete p.handlers;
      } else {
        p.handlers = map;
      }
    });
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

  // ── Auto-open: handler tail ───────────────────────────────────────────
  // Map keys are insertion-ordered in JS, so the last key in `handlerKeys`
  // is the most recently added — open it.
  const prevHandlerKeysRef = useRef<string[]>(handlerKeys);
  const [pendingHandlerEvent, setPendingHandlerEvent] = useState<string | null>(null);
  useEffect(() => {
    const prev = new Set(prevHandlerKeysRef.current);
    const added = handlerKeys.find(k => !prev.has(k));
    if (added) setPendingHandlerEvent(added);
    prevHandlerKeysRef.current = handlerKeys;
  }, [handlerKeysSig, handlerKeys]);
  const lastHandlerVersionRef = useRef(0);
  useEffect(() => {
    if (
      handlerRequestVersion === 0 ||
      handlerRequestVersion === lastHandlerVersionRef.current
    )
      return;
    lastHandlerVersionRef.current = handlerRequestVersion;
    if (handlerKeys.length > 0) {
      setPendingHandlerEvent(handlerKeys[handlerKeys.length - 1]);
    }
  }, [handlerRequestVersion, handlerKeys]);
  const consumeHandlerAutoOpen = () => setPendingHandlerEvent(null);

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

      {handlerEntries.map(([event, code]) => (
        <HandlerChipRow
          key={`handler-${event}`}
          event={event}
          code={code}
          takenEvents={handlerKeys}
          autoOpen={event === pendingHandlerEvent}
          onAutoOpenConsumed={consumeHandlerAutoOpen}
          onChange={next => updateHandler(event, next)}
          onRemove={() => removeHandler(event)}
        />
      ))}

      <div className="mt-1">
        <HandlersAddPicker takenEvents={handlerKeys} />
      </div>
    </div>
  );
}
