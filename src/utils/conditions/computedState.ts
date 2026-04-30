/**
 * Computed state bindings — derived registry entries declared on a Container.
 *
 * A node lists `computedStateBindings: ComputedStateBinding[]` and on every
 * relevant input-state change, the SDK runs the named compute function and
 * writes the result to the output state key. Replaces ad-hoc imperative JS
 * handlers (e.g. the PDP variant chip's 1800-char inline state machine) with
 * declarative, author-visible primitives.
 *
 * Built-in compute types (added per use-case; new types live behind a
 * discriminated union so the editor can offer a typed picker):
 *
 *   - `variant-match`           — matches the current axis selections
 *                                 against a JSON variant map; emits the
 *                                 matched variant as JSON, or "" when
 *                                 incomplete / no match.
 *   - `variant-axis-availability` — for one axis, emits a comma-separated
 *                                 list of values whose corresponding
 *                                 variant would be unavailable given the
 *                                 currently-selected OTHER axes.
 *   - `all-truthy`              — emits "on" iff every input key is truthy
 *                                 (non-null, non-empty); else "".
 *   - `first-truthy`            — emits the value of the first truthy input
 *                                 key; "" when all are empty.
 *   - `join`                    — concatenates input values with a separator.
 *
 * Reactivity: Container subscribes to all `from` keys via `useStateValue` and
 * runs the computer on every change. Results are written with
 * `lastWriter: "computed"` so the ESC stack skips them and inspector tooling
 * can distinguish derived from author-written entries.
 */

import { getStateValue, setState } from "../stateRegistry";

export type ComputedStateCompute =
  /**
   * variant-match: read each axis selection from state and emit the matched
   * variant as JSON. `axes` may be a string array OR a CSV string
   * (`"Size,Color"`) — the runtime splits CSV. `axisKeyTemplate` builds the
   * input state key for each axis (e.g. `"pdp:{{item.id}}:axis:%axis%"`,
   * where `%axis%` is replaced with each axis name). When `axes` /
   * `axisKeyTemplate` resolve from item context, the binding evaluates per
   * iteration of the parent repeater.
   */
  | {
      type: "variant-match";
      variantMap: string;
      axes: string[] | string;
      axisKeyTemplate: string;
    }
  /**
   * variant-axis-availability: for ONE axis, emit a comma-separated list of
   * candidate values that have NO in-stock variant given the currently-
   * selected OTHER axes. Pair with `state contains` operator on each chip's
   * stateModifiers to gate "unavailable" styling.
   */
  | {
      type: "variant-axis-availability";
      variantMap: string;
      axis: string;
      otherAxes: string[] | string;
      axisKeyTemplate: string;
    }
  | { type: "all-truthy" }
  | { type: "first-truthy" }
  | { type: "join"; separator?: string };

export interface ComputedStateBinding {
  /** Output state key. Anchor tokens supported. Also supports `{{item.X}}`
   *  for per-iteration outputs. */
  key: string;
  /** Input state keys to subscribe to. Anchor + item tokens supported.
   *  Optional for `variant-match` / `variant-axis-availability` where the
   *  runtime derives inputs from `axisKeyTemplate` × axes. */
  from?: string[];
  /** Computation. Discriminated union — editor picker offers each type. */
  compute: ComputedStateCompute;
}

function parseVariantMap(raw: string | null | undefined): any[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function axisToSlot(axes: string[]): Record<string, "option1" | "option2" | "option3"> {
  const out: Record<string, "option1" | "option2" | "option3"> = {};
  axes.forEach((name, i) => {
    if (i < 3) out[name] = `option${i + 1}` as "option1" | "option2" | "option3";
  });
  return out;
}

/**
 * Detects un-interpolated `{{item.X}}` tokens — when the binding's interp
 * couldn't resolve them (no item context, missing repeater parent) we'd
 * otherwise feed literal `{{item.id}}` into a state key and silently miss.
 * Returns the same "incomplete" sentinel `""` to keep variant-match output stable.
 */
function hasUnresolvedItemToken(s: string): boolean {
  return /\{\{\s*item\./i.test(s);
}

function toAxisArray(value: string[] | string | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

interface ComputeRunCtx {
  /** Resolve `{{item.X}}` (and any other) tokens against the current item context. */
  interp: (raw: string) => string;
}

export function runComputedState(
  binding: ComputedStateBinding,
  ctx: ComputeRunCtx
): string {
  const c = binding.compute;
  switch (c.type) {
    case "all-truthy": {
      const values = (binding.from || []).map(k => getStateValue(ctx.interp(k)));
      return values.every(v => v != null && v !== "") ? "on" : "";
    }
    case "first-truthy": {
      const values = (binding.from || []).map(k => getStateValue(ctx.interp(k)));
      for (const v of values) if (v != null && v !== "") return v;
      return "";
    }
    case "join": {
      const sep = c.separator ?? ",";
      const values = (binding.from || []).map(k => getStateValue(ctx.interp(k)));
      return values.filter(v => v != null && v !== "").join(sep);
    }
    case "variant-match": {
      const rawMap = ctx.interp(c.variantMap);
      const rawAxes = typeof c.axes === "string" ? ctx.interp(c.axes) : c.axes.join(",");
      // Bail when item context didn't resolve — without a repeater parent,
      // `{{item.X}}` survives interpolation and reading state under that
      // literal key returns nothing forever.
      if (hasUnresolvedItemToken(rawMap) || hasUnresolvedItemToken(rawAxes)) return "";
      const variants = parseVariantMap(rawMap);
      const axes = toAxisArray(rawAxes);
      const tmpl = c.axisKeyTemplate;
      const slots = axisToSlot(axes);
      const sel: Record<string, string> = {};
      for (const axisName of axes) {
        const stateKey = ctx.interp(tmpl.replace(/%axis%/g, axisName));
        if (hasUnresolvedItemToken(stateKey)) return "";
        const v = getStateValue(stateKey);
        if (v != null && v !== "") sel[axisName] = v;
      }
      const complete = axes.length > 0 && axes.every(n => !!sel[n]);
      if (!complete) return "";
      const match = variants.find(v =>
        axes.every(n => v[slots[n]!] === sel[n]) && v.inventory !== 0
      );
      return match ? JSON.stringify(match) : "";
    }
    case "variant-axis-availability": {
      const rawMap = ctx.interp(c.variantMap);
      const rawOther =
        typeof c.otherAxes === "string" ? ctx.interp(c.otherAxes) : c.otherAxes.join(",");
      if (hasUnresolvedItemToken(rawMap) || hasUnresolvedItemToken(rawOther)) return "";
      const variants = parseVariantMap(rawMap);
      const otherAxes = toAxisArray(rawOther);
      const allAxes = [c.axis, ...otherAxes];
      const tmpl = c.axisKeyTemplate;
      const slots = axisToSlot(allAxes);
      const sel: Record<string, string> = {};
      for (const axisName of otherAxes) {
        const stateKey = ctx.interp(tmpl.replace(/%axis%/g, axisName));
        if (hasUnresolvedItemToken(stateKey)) return "";
        const v = getStateValue(stateKey);
        if (v != null && v !== "") sel[axisName] = v;
      }
      const candidates = new Set<string>();
      for (const v of variants) {
        const cand = v[slots[c.axis]!];
        if (typeof cand === "string") candidates.add(cand);
      }
      const unavailable: string[] = [];
      for (const cand of candidates) {
        const live = variants.some(v => {
          if (v[slots[c.axis]!] !== cand) return false;
          if (v.inventory === 0) return false;
          return otherAxes.every(n => !sel[n] || v[slots[n]!] === sel[n]);
        });
        if (!live) unavailable.push(cand);
      }
      return unavailable.join(",");
    }
    default:
      return "";
  }
}

/**
 * Build a stable snapshot string of every input that affects a binding's
 * output. Container's effect uses this as its dep so we re-run on real input
 * change instead of every render. Inputs covered:
 *   - declared `from` keys (after interp)
 *   - axis state keys for `variant-match` / `variant-axis-availability`
 *     (derived from `axisKeyTemplate × axes`)
 *   - the interpolated `variantMap` literal (so swapping products refires)
 * Cheap: just key=value joins, no JSON.stringify of the binding shape.
 */
export function computeBindingInputSnapshot(
  binding: ComputedStateBinding,
  interp: (raw: string) => string
): string {
  const parts: string[] = [];
  // Output key is part of the identity — same compute writing to a different
  // key (e.g. per-iteration output) should re-run.
  parts.push(`out=${interp(binding.key)}`);

  for (const k of binding.from || []) {
    const resolved = interp(k);
    parts.push(`${resolved}=${getStateValue(resolved) ?? ""}`);
  }

  const c = binding.compute;
  if (c.type === "variant-match") {
    const map = interp(c.variantMap);
    parts.push(`vm=${map}`);
    const axes = toAxisArray(typeof c.axes === "string" ? interp(c.axes) : c.axes);
    for (const axisName of axes) {
      const sk = interp(c.axisKeyTemplate.replace(/%axis%/g, axisName));
      parts.push(`${sk}=${getStateValue(sk) ?? ""}`);
    }
  } else if (c.type === "variant-axis-availability") {
    const map = interp(c.variantMap);
    parts.push(`vm=${map}`);
    const otherAxes = toAxisArray(
      typeof c.otherAxes === "string" ? interp(c.otherAxes) : c.otherAxes
    );
    for (const axisName of otherAxes) {
      const sk = interp(c.axisKeyTemplate.replace(/%axis%/g, axisName));
      parts.push(`${sk}=${getStateValue(sk) ?? ""}`);
    }
  }
  return parts.join("|");
}

export function computeBindingsSnapshot(
  bindings: ComputedStateBinding[] | undefined,
  interp: (raw: string) => string
): string {
  if (!bindings || bindings.length === 0) return "";
  return bindings.map(b => computeBindingInputSnapshot(b, interp)).join("||");
}

/**
 * Apply all bindings on a node — read inputs from registry, run computers,
 * write outputs. Caller is responsible for invoking on every relevant tick.
 *
 * `interp` is the SDK's variable-interpolation function (typically the
 * caller's bound `replaceVariables(_, query, item, anchors)` or a thin
 * `{{item.X}}` walker). It runs against `binding.key`, every `binding.from`,
 * and every interpolatable field inside `binding.compute`.
 */
export function applyComputedStateBindings(
  bindings: ComputedStateBinding[] | undefined,
  interp: (raw: string) => string
): void {
  if (!bindings || bindings.length === 0) return;
  for (const binding of bindings) {
    const outKey = interp(binding.key);
    if (!outKey) continue;
    const next = runComputedState(binding, { interp });
    if (getStateValue(outKey) === next) continue;
    setState(outKey, { kind: "value", value: next, source: "computed" }, "computed");
  }
}
