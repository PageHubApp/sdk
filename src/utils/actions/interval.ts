/**
 * Set up `trigger: "interval"` actions on mount. Returns a cleanup function
 * that clears all started intervals — caller (Container's mount effect) MUST
 * call it on unmount.
 *
 * Honors `action.conditions` per-tick (re-evaluates every fire so gating can
 * pause an autoscroll without tearing down the interval).
 *
 * Currently dispatches `increment-state` / `decrement-state` / `set-state` /
 * `toggle-state` / `clear-state` / `show-hide`. Anything else is ignored.
 */
import type {
  ClearStateAction,
  DecrementStateAction,
  IncrementStateAction,
  NodeAction,
  SetStateAction,
  ShowHideAction,
  ToggleStateAction,
} from "../action";
import { deleteState, getState, getStateValue, setState } from "../state/stateRegistry";
import { actionGatePasses, applyStateStep } from "./gates";
import { applyShowHide } from "./internal";

export function fireIntervalActions(actions: NodeAction[]): () => void {
  const ids: number[] = [];
  for (const action of actions) {
    if ((action as any).trigger !== "interval") continue;
    const ms = (action as any).intervalMs;
    if (typeof ms !== "number" || ms < 50) continue;
    const id = window.setInterval(() => {
      if (!actionGatePasses(action)) return;
      if (action.type === "increment-state" || action.type === "decrement-state") {
        applyStateStep(action as IncrementStateAction | DecrementStateAction);
        return;
      }
      if (action.type === "set-state") {
        const ss = action as SetStateAction;
        if (!ss.key) return;
        setState(
          ss.key,
          { kind: ss.kind ?? "value", value: ss.value, source: "runtime" },
          "set-state"
        );
        return;
      }
      if (action.type === "toggle-state") {
        const ts = action as ToggleStateAction;
        if (!ts.key) return;
        const current = getStateValue(ts.key);
        const kind = ts.kind ?? getState(ts.key)?.kind ?? "flag";
        let pair: [string, string] | null = ts.values ?? null;
        if (!pair) {
          if (kind === "visibility") pair = ["shown", "hidden"];
          else if (kind === "flag") pair = ["on", "off"];
          else return;
        }
        const next = current === pair[0] ? pair[1] : pair[0];
        setState(ts.key, { kind, value: next, source: "runtime" }, "toggle-state");
        return;
      }
      if (action.type === "clear-state") {
        const cs = action as ClearStateAction;
        if (cs.key) deleteState(cs.key);
        return;
      }
      if (action.type === "show-hide") {
        applyShowHide(action as ShowHideAction);
        return;
      }
    }, ms);
    ids.push(id);
  }
  return () => {
    for (const id of ids) window.clearInterval(id);
  };
}
