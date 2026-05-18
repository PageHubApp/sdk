/**
 * HandlersInput — chip-list builder for a node's `props.handlers` map (custom
 * JS event strings).
 *
 * Sibling of `ActionsInput` — declarative typed actions live in Action,
 * raw-JS escape hatch lives here. Each chip is a `HandlerChipRow` whose body
 * panel hosts the event dropdown + CodeMirror JS editor. Auto-open hand-off
 * rides the canonical `PopoverOpenRequestAtom` keyed by `HANDLERS_BODY_DEF_ID`.
 * See docs/sdk/editor-popover-pattern.md §4 + §8.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { HandlerChipRow } from "./HandlerChipRow";
import { HANDLERS_BODY_DEF_ID } from "./HandlersAddPicker";
import {
  PopoverOpenRequestAtom,
  popoverRequestKey,
} from "../../inspector/popoverOpenRequestAtom";

export function HandlersInput() {
  const {
    id,
    actions: { setProp },
    handlers,
    handlerOptions,
  } = useNode(node => {
    const props = node.data.props;
    const handlersMap: Record<string, string> =
      props.handlers && typeof props.handlers === "object" ? props.handlers : {};
    const optionsMap: Record<string, { preventDefault?: boolean }> =
      props.handlerOptions && typeof props.handlerOptions === "object"
        ? props.handlerOptions
        : {};
    return {
      id: node.id,
      handlers: handlersMap,
      handlerOptions: optionsMap,
    };
  });

  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);
  const handlerRequestVersion =
    popoverRequests.get(popoverRequestKey(id, HANDLERS_BODY_DEF_ID)) || 0;

  const handlerEntries = useMemo(
    () => Object.entries(handlers).filter(([, v]) => typeof v === "string") as [string, string][],
    [handlers]
  );
  const handlerKeys = useMemo(() => handlerEntries.map(([e]) => e), [handlerEntries]);
  const handlerKeysSig = handlerKeys.join("|");

  const updateHandler = (
    prevEvent: string,
    next: { event: string; code: string; preventDefault: boolean }
  ) => {
    setProp((p: any) => {
      const map: Record<string, string> = { ...(p.handlers || {}) };
      const optMap: Record<string, { preventDefault?: boolean }> = {
        ...(p.handlerOptions || {}),
      };
      if (prevEvent === next.event) {
        map[prevEvent] = next.code;
      } else {
        delete map[prevEvent];
        delete optMap[prevEvent];
        map[next.event] = next.code;
      }
      p.handlers = map;
      if (next.preventDefault) {
        optMap[next.event] = { ...(optMap[next.event] || {}), preventDefault: true };
      } else if (optMap[next.event]) {
        const { preventDefault: _, ...rest } = optMap[next.event];
        if (Object.keys(rest).length === 0) delete optMap[next.event];
        else optMap[next.event] = rest;
      }
      if (Object.keys(optMap).length === 0) delete p.handlerOptions;
      else p.handlerOptions = optMap;
    });
  };
  const removeHandler = (event: string) => {
    setProp((p: any) => {
      if (!p.handlers) return;
      const map: Record<string, string> = { ...p.handlers };
      delete map[event];
      if (Object.keys(map).length === 0) delete p.handlers;
      else p.handlers = map;
      if (p.handlerOptions) {
        const optMap = { ...p.handlerOptions };
        delete optMap[event];
        if (Object.keys(optMap).length === 0) delete p.handlerOptions;
        else p.handlerOptions = optMap;
      }
    });
  };

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
  // Init to 0 (NOT current version) — see editor-popover-pattern.md §4.
  const lastHandlerVersionRef = useRef(0);
  useEffect(() => {
    if (handlerRequestVersion === 0 || handlerRequestVersion === lastHandlerVersionRef.current)
      return;
    lastHandlerVersionRef.current = handlerRequestVersion;
    if (handlerKeys.length > 0) {
      setPendingHandlerEvent(handlerKeys[handlerKeys.length - 1]);
    }
  }, [handlerRequestVersion, handlerKeys]);
  const consumeHandlerAutoOpen = () => setPendingHandlerEvent(null);

  return (
    <div className="flex flex-col gap-1">
      {handlerEntries.map(([event, code]) => (
        <HandlerChipRow
          key={`handler-${event}`}
          event={event}
          code={code}
          preventDefault={!!handlerOptions[event]?.preventDefault}
          takenEvents={handlerKeys}
          autoOpen={event === pendingHandlerEvent}
          onAutoOpenConsumed={consumeHandlerAutoOpen}
          onChange={next => updateHandler(event, next)}
          onRemove={() => removeHandler(event)}
        />
      ))}
    </div>
  );
}
