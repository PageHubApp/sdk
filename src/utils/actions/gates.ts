/**
 * Condition gating + state-step arithmetic — shared by handlers, load,
 * and interval modules.
 */
import type {
  DecrementStateAction,
  IncrementStateAction,
  NodeAction,
} from "../action";
import { evaluateConditionGroups } from "../conditions/evaluate";
import type { ConditionContext } from "../conditions/types";
import { getAuthState } from "../design/variables";
import { getStateValue, setState } from "../state/stateRegistry";

/**
 * Build a viewer-side `ConditionContext` for action gating. Mirrors the
 * shape `withConditionalVisibility` constructs for node visibility but is
 * scoped to "right now, on this page" — no item context (load actions
 * don't fire inside repeaters), no connector data (load actions can't
 * wait on async fetches), no form fields. Auth + URL params + viewport
 * width cover the realistic gates: "logged-out only", "?ref=email",
 * "mobile only".
 */
export function buildLoadActionContext(): ConditionContext {
  if (typeof window === "undefined") {
    return {
      urlParams: null,
      formFields: null,
      connectorData: null,
      company: null,
      viewportWidth: null,
      auth: null,
      item: null,
    };
  }
  return {
    urlParams: new URLSearchParams(window.location.search),
    formFields: null,
    connectorData: null,
    company: null,
    viewportWidth: window.innerWidth,
    auth: getAuthState(),
    item: null,
  };
}

/**
 * Evaluate `action.conditions` (if any) and return whether the action is
 * allowed to fire right now. Generalizes the gate that `fireLoadAction` has
 * always had — every action branch in `attachOne` calls this so click /
 * hover / load actions all honor the same condition shape.
 *
 * `null` (indeterminate) is treated as a pass — graceful degrade to "fire"
 * matches how load-trigger banners already work.
 */
export function actionGatePasses(action: NodeAction): boolean {
  const groups = action.conditions;
  if (!groups || groups.length === 0) return true;
  const ctx = buildLoadActionContext();
  return evaluateConditionGroups(groups, ctx) !== false;
}

/**
 * Resolve a `max` field that can be a literal number or a `state:<key>` pointer
 * to another state entry (for dynamic upper bounds — slide count, item count).
 */
function resolveBound(value: number | string | undefined): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  if (value.startsWith("state:")) {
    const refKey = value.slice(6);
    const refVal = parseInt(getStateValue(refKey) ?? "", 10);
    return Number.isFinite(refVal) ? refVal : undefined;
  }
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Apply increment-state / decrement-state arithmetic with min/max/wrap.
 * `keyOverride` lets callers with item context pass a pre-interpolated key
 * (e.g. click-trigger handlers inside a repeater). Interval/load callers
 * have no item context, so they pass undefined and the literal action.key
 * is used.
 */
export function applyStateStep(
  action: IncrementStateAction | DecrementStateAction,
  keyOverride?: string
): void {
  const key = keyOverride || action.key;
  if (!key) return;
  const sign = action.type === "increment-state" ? 1 : -1;
  const step = (action.step ?? 1) * sign;
  const cur = parseInt(getStateValue(key) ?? "0", 10) || 0;
  let next = cur + step;
  const min = action.min;
  const max = resolveBound(action.max);
  if (action.wrap) {
    if (max !== undefined && next > max) next = min ?? 0;
    else if (min !== undefined && next < min) next = max ?? min;
  } else {
    if (max !== undefined) next = Math.min(max, next);
    if (min !== undefined) next = Math.max(min, next);
  }
  setState(key, { kind: "value", value: String(next), source: "runtime" }, action.type);
}
