/**
 * State-mutating action handlers — set / toggle / clear / increment / decrement.
 *
 * State actions fire in BOTH editor and viewer modes — active styling on tab
 * buttons, selection chips, drawer triggers etc. is presentation-only (no
 * destructive state, no nav, no submit). Treating editor mode as "no state
 * writes" leaves authors with stale active indicators after every preview
 * click. Skip only the visitor condition gate in editor mode, mirroring the
 * show-hide tab-direction policy.
 */
import type {
  ClearStateAction,
  DecrementStateAction,
  IncrementStateAction,
  NodeAction,
  SetStateAction,
  ToggleStateAction,
} from "../../action";
import {
  deleteState,
  getState,
  getStateValue,
  setState,
} from "../../state/stateRegistry";
import { actionGatePasses, applyStateStep } from "../gates";
import {
  ActionContext,
  chain,
  hoverState,
  interpolateItem,
  resolveActionKey,
} from "../internal";
import { sdkLog } from "../../logger";

export function attachSetState(
  prop: any,
  action: NodeAction,
  enabled: boolean,
  context?: ActionContext
) {
  if (action.type !== "set-state") return;
  const ss = action as SetStateAction;
  const isHover = (ss.trigger || "click") === "hover";
  const enter = (e: any, run: any) => {
    run(e);
    if (!enabled && !actionGatePasses(action)) return;
    if (!ss.key) return;
    const k = resolveActionKey(ss.key, context?.itemContext);
    const v = interpolateItem(ss.value, context?.itemContext);
    setState(
      k,
      { kind: ss.kind ?? "value", value: v, source: enabled ? "editor-preview" : "runtime" },
      "set-state"
    );
  };
  if (isHover) {
    // Hover-restore captures prior value via WeakMap keyed on the action
    // identity — survives mid-hover re-renders that would blow away a
    // closure-local flag. Click triggers don't restore (intentionally sticky).
    const hoverEnter = (e: any, run: any) => {
      run(e);
      if (!enabled && !actionGatePasses(action)) return;
      if (!ss.key) return;
      const s = hoverState(action);
      s.resolvedKey = resolveActionKey(ss.key, context?.itemContext);
      s.prevValue = getStateValue(s.resolvedKey);
      const v = interpolateItem(ss.value, context?.itemContext);
      setState(
        s.resolvedKey,
        { kind: ss.kind ?? "value", value: v, source: enabled ? "editor-preview" : "runtime" },
        "set-state"
      );
      s.didSet = true;
    };
    const hoverLeave = (e: any, run: any) => {
      run(e);
      const s = hoverState(action);
      if (!s.didSet || !s.resolvedKey) return;
      s.didSet = false;
      if (s.prevValue === undefined) {
        deleteState(s.resolvedKey);
      } else {
        setState(
          s.resolvedKey,
          {
            kind: ss.kind ?? "value",
            value: s.prevValue,
            source: enabled ? "editor-preview" : "runtime",
          },
          "set-state"
        );
      }
    };
    chain(prop, "onMouseEnter", hoverEnter);
    chain(prop, "onMouseLeave", hoverLeave);
  } else {
    chain(prop, "onClick", enter);
  }
}

export function attachToggleState(
  prop: any,
  action: NodeAction,
  enabled: boolean,
  context?: ActionContext
) {
  if (action.type !== "toggle-state") return;
  const ts = action as ToggleStateAction;
  const isHover = (ts.trigger || "click") === "hover";
  const resolveKey = (): string => resolveActionKey(ts.key, context?.itemContext);
  const resolvePair = (kind: string, k: string): [string, string] | null => {
    if (ts.values) return ts.values;
    if (kind === "visibility") return ["shown", "hidden"];
    if (kind === "flag") return ["on", "off"];
    sdkLog.warn(
      `[PageHub] toggle-state on key "${k}" (kind: ${kind}) needs explicit values. Skipping.`
    );
    return null;
  };
  const writeFlip = (k: string): void => {
    if (!k) return;
    const current = getStateValue(k);
    const kind = ts.kind ?? getState(k)?.kind ?? "flag";
    const pair = resolvePair(kind, k);
    if (!pair) return;
    const next = current === pair[0] ? pair[1] : pair[0];
    setState(
      k,
      { kind, value: next, source: enabled ? "editor-preview" : "runtime" },
      "toggle-state"
    );
  };
  if (isHover) {
    const hoverEnter = (e: any, run: any) => {
      run(e);
      if (!enabled && !actionGatePasses(action)) return;
      if (!ts.key) return;
      const s = hoverState(action);
      s.resolvedKey = resolveKey();
      s.prevValue = getStateValue(s.resolvedKey);
      writeFlip(s.resolvedKey);
      s.didSet = true;
    };
    const hoverLeave = (e: any, run: any) => {
      run(e);
      const s = hoverState(action);
      if (!s.didSet || !s.resolvedKey) return;
      s.didSet = false;
      const kind = ts.kind ?? getState(s.resolvedKey)?.kind ?? "flag";
      if (s.prevValue === undefined) {
        deleteState(s.resolvedKey);
      } else {
        setState(
          s.resolvedKey,
          { kind, value: s.prevValue, source: enabled ? "editor-preview" : "runtime" },
          "toggle-state"
        );
      }
    };
    chain(prop, "onMouseEnter", hoverEnter);
    chain(prop, "onMouseLeave", hoverLeave);
  } else {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (!enabled && !actionGatePasses(action)) return;
      if (!ts.key) return;
      writeFlip(resolveKey());
    });
  }
}

export function attachStateStep(
  prop: any,
  action: NodeAction,
  enabled: boolean,
  context?: ActionContext
) {
  if (action.type !== "increment-state" && action.type !== "decrement-state") return;
  const sa = action as IncrementStateAction | DecrementStateAction;
  const trig = sa.trigger || "click";
  // Interval / load triggers are wired by Container's mount effect.
  if (trig === "interval" || trig === "load") return;
  const fire = (e: any, run: any) => {
    run(e);
    if (!enabled && !actionGatePasses(action)) return;
    const k = resolveActionKey(sa.key, context?.itemContext);
    if (!k) return;
    applyStateStep(sa, k);
  };
  if (trig === "hover") {
    chain(prop, "onMouseEnter", fire);
  } else {
    chain(prop, "onClick", fire);
  }
}

export function attachClearState(
  prop: any,
  action: NodeAction,
  enabled: boolean,
  context?: ActionContext
) {
  if (action.type !== "clear-state") return;
  const cs = action as ClearStateAction;
  const isHover = (cs.trigger || "click") === "hover";
  if (isHover) {
    const hoverEnter = (e: any, run: any) => {
      run(e);
      if (!enabled && !actionGatePasses(action)) return;
      if (!cs.key) return;
      const s = hoverState(action);
      s.resolvedKey = resolveActionKey(cs.key, context?.itemContext);
      s.prevEntry = getState(s.resolvedKey);
      deleteState(s.resolvedKey);
      s.didSet = true;
    };
    const hoverLeave = (e: any, run: any) => {
      run(e);
      const s = hoverState(action);
      if (!s.didSet || !s.resolvedKey) return;
      s.didSet = false;
      if (!s.prevEntry) return;
      setState(
        s.resolvedKey,
        { kind: s.prevEntry.kind, value: s.prevEntry.value, source: s.prevEntry.source },
        "clear-state"
      );
    };
    chain(prop, "onMouseEnter", hoverEnter);
    chain(prop, "onMouseLeave", hoverLeave);
  } else {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (!enabled && !actionGatePasses(action)) return;
      if (!cs.key) return;
      const k = resolveActionKey(cs.key, context?.itemContext);
      deleteState(k);
    });
  }
}
