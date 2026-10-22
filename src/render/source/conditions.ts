/**
 * Node visibility conditions → a Liquid `{% if %}` expression for the source converter.
 *
 * A condition group is `{ logic: "all" | "any", conditions: Condition[] }`; a node carries
 * `conditionGroups: Group[]`. Only conditions the SERVER can evaluate map to `{% if %}`:
 * `url-param`, `auth`, `company`, `item`, `connector`, and URL-bridged `state` (`url:*` keys read
 * from the query string). Anything that can't be decided at render time (`device`, `localStorage`,
 * runtime `state`, `form-field`, or a mix of `and`/`or` Liquid can't express without parentheses)
 * yields `null` and a "report: <reason>" note (wrapped as a block comment) through the optional
 * callback, so the migration surfaces those per site rather than dropping or faking them.
 *
 *   conditionExpr(groups)                       // "request.query.ref == 'templates'"  | null
 *   conditionExpr(groups, m => reports.push(m)) // null, and m = the report note for "device"
 */

import { BUILTIN_STATE_MODIFIERS } from "../../utils/conditions/stateBuiltinModifiers";

type Cond = { type?: string; key?: string; operator?: string; value?: string };
type Group = { logic?: "all" | "any"; conditions?: Cond[] };

const NUMERIC_OP = new Set(["greater-than", "less-than"]);
const SERVER_TYPES = new Set(["url-param", "auth", "company", "item", "connector", "state"]);

/** A comparison value: bare for booleans/numbers, single-quoted otherwise. */
function lit(value: string, op: string): string {
  const v = String(value ?? "");
  if (NUMERIC_OP.has(op)) return v;
  if (v === "true" || v === "false" || /^-?\d+(\.\d+)?$/.test(v)) return v;
  const escaped = v.split("'").join("\\'");
  return "'" + escaped + "'";
}

/** The server-readable path for a condition, or null when it isn't one. `state` maps only `url:*`. */
function pathOf(c: Cond): string | null {
  switch (c.type) {
    case "url-param": return `request.query.${c.key}`;
    case "company": return `company.${c.key}`;
    case "item": return `item.${c.key}`;
    case "connector": return c.key || null;
    case "state": {
      const key = String(c.key ?? "");
      return key.startsWith("url:") ? `request.query.${key.slice(4)}` : null; // url-bridged state is a query param
    }
    default: return null;
  }
}

/** One condition → a Liquid boolean, or null if it can't be evaluated server-side. */
function termOf(c: Cond): string | null {
  let path: string | null;
  if (c.type === "auth") {
    // `status` (logged-in / logged-out) is the visitor's session; any other key reads the signed-in customer
    // (`customer.isMember`, `customer.plans.pro`). A logged-out visitor has no `customer`, so those reads are
    // blank: `exists` / `equals` fail and `not-exists` / `not-equals` pass — the same outcome the walker gets.
    const key = String(c.key ?? "");
    if (!key || key === "status") {
      const s = key ? String(c.value ?? "") : String(c.value ?? c.operator ?? "");
      const out = s === "logged-out";
      return (c.operator === "not-equals" ? !out : out) ? "customer == blank" : "customer";
    }
    path = `customer.${key.replace(/^customer\./, "")}`;
  } else {
    path = pathOf(c);
  }
  if (!path) return null;
  const op = c.operator ?? "exists";
  switch (op) {
    case "exists": return `${path} != blank`;
    case "not-exists": return `${path} == blank`;
    case "equals": return `${path} == ${lit(c.value ?? "", op)}`;
    case "not-equals": return `${path} != ${lit(c.value ?? "", op)}`;
    case "greater-than": return `${path} > ${lit(c.value ?? "", op)}`;
    case "less-than": return `${path} < ${lit(c.value ?? "", op)}`;
    case "contains": return `${path} contains ${lit(c.value ?? "", op)}`;
    case "not-contains": return `${path} contains ${lit(c.value ?? "", op)} == false`;
    default: return path;
  }
}

/** The first non-mappable reason in a group (an unsupported type, or a non-url `state`). */
function unmappable(c: Cond): string | null {
  if (c.type === "auth") return null;
  if (!c.type || !SERVER_TYPES.has(c.type)) return c.type || "unknown";
  if (pathOf(c) == null) return c.type; // e.g. runtime state (not url:*)
  return null;
}

/**
 * `conditionGroups` → the Liquid boolean for `{% if %}`, or `null` when nothing maps (the node is
 * then emitted ungated). `report`, when given, receives one "report: reason" block-comment note
 * per reason so the caller can annotate the source and the migration can count what didn't convert.
 */
export function conditionExpr(groups: Group[] | undefined, report?: (note: string) => void): string | null {
  const note = (reason: string) => report?.(`/* report: ${reason} */`);
  if (!Array.isArray(groups) || groups.length === 0) return null;

  // Any non-mappable condition voids the gate (the node shows; the reason is reported).
  for (const g of groups) {
    for (const c of g?.conditions ?? []) {
      const reason = unmappable(c);
      if (reason) {
        note(reason);
        return null;
      }
    }
  }

  const perGroup = groups.map((g) => {
    const terms = (g.conditions ?? []).map(termOf).filter((t): t is string => t != null);
    return { terms, logic: g.logic === "any" ? "or" : "and" };
  });

  // One group: join its terms by its logic.
  if (perGroup.length === 1) {
    const { terms, logic } = perGroup[0]!;
    return terms.length ? terms.join(` ${logic} `) : null;
  }
  // Multiple groups OR together — but Liquid has no parentheses, so a multi-term group inside the OR
  // can't be expressed safely. Flatten only when every group is a single term.
  if (perGroup.some((g) => g.terms.length !== 1)) {
    note("mixed-and-or");
    return null;
  }
  return perGroup.map((g) => g.terms[0]!).join(" or ");
}

// ─── state-driven class modifiers → `data-state-class` ───────────────────────
//
// `props.stateModifiers` → the runtime `state` chunk's `data-state-class`
// attribute (read by `state-view`/`state` in `@pagehub-editor/site-runtime`,
// `chunks/state.ts#paint`). Grammar: `<test-expr>:<classes>` entries joined by
// `;`, where `<test-expr>` is what `state-store.ts#test` parses and `<classes>`
// is a space-separated class string toggled while the expression passes.
//
// The old static walker emits a richer `data-state-modifiers` JSON (with a
// `remove` field); the new runtime has NO class-removal, so modifiers that rely
// on overriding a base utility (e.g. `shown-flex` clobbering `hidden`) only work
// when the base classes are authored to lose by CSS source order. Bindings the
// runtime can't evaluate are dropped, never faked.

type Modifier = { name: string; classes?: string };

/** True when the runtime's `test()` can parse this key: one segment, or a
 *  `url:` / `local:` prefix. Colon-namespaced keys (`cart:open`,
 *  `form:x:fields`, `deck:step`) cannot be parsed and are reported. */
export function isRuntimeStateKey(key: string): boolean {
  return /^(?:local:|url:)?[\w.-]+$/.test(key);
}

const STATE_OP: Record<string, string> = {
  equals: "=",
  "not-equals": "!=",
  "greater-than": ">",
  "less-than": "<",
};

// ─── node visibility runtime `state` gate → `data-state-show` ────────────────
//
// A node whose `conditionGroups` are ENTIRELY runtime `state` conditions can't
// be decided server-side, but the runtime's `state` chunk CAN: it sets
// `el.hidden = !test(data-state-show)` and re-tests on every store change. So
// instead of emitting the node ungated (the old "report: state" path), the
// converter stamps the equivalent `test()` expression as `data-state-show` and
// the chips' `data-state-set` drive it live. Colon-namespaced keys
// (`store:filter`) are first-class here — `state-store.ts#test` now parses them.

/** A runtime state key `test()` / `data-state-show` can parse: single segment, a
 *  `local:` / `url:` prefix, or colon-namespaced (`store:filter`, `form:x:fields`). */
const SHOW_KEY = /^(?:local:|url:)?[\w.-]+(?::[\w.-]+)*$/;

/** One `state` condition → a `test()` atom for `data-state-show`, or null when the
 *  runtime can't evaluate it (non-state type, unparseable key, `contains`, or a
 *  value carrying a grammar delimiter `|` / `&` / `:` / `;`). */
function showTerm(c: Cond): string | null {
  if (c.type !== "state") return null;
  const key = String(c.key ?? "");
  if (!key || !SHOW_KEY.test(key)) return null;
  // `cart:*` and `form:*` are owned by the cart / form chunks (a `#cart` dialog, `[data-form-state]`
  // swaps), NOT the state store — nothing ever writes them there, so a `data-state-show` on one would
  // hide the node forever. Leave those to the report path, as `visibilityShowAttr` already does.
  // `store:*`, `deck:*` (state-view writes it), `url:` / `local:` and generic keys ARE store-backed.
  if (/^(?:cart|form):/.test(key)) return null;
  const op = c.operator ?? "exists";
  if (op === "exists") return key;
  if (op === "not-exists") return "!" + key;
  const sym = STATE_OP[op];
  if (!sym) return null; // contains / not-contains: `test()` has no such operator
  const v = String(c.value ?? "");
  if (v === "" || /[|&:;]/.test(v)) return null;
  return key + sym + v;
}

/**
 * Condition groups → one DNF `test()` expression, or `null` when any condition has no `term` (not a pure
 * runtime gate). Groups OR together (`||`), an `all` group's terms AND (`&&`), an `any` group's terms each
 * become their own disjunct — which `state-store.ts#test` evaluates with AND binding tighter.
 */
function dnf(groups: Group[] | undefined, term: (c: Cond) => string | null): string | null {
  if (!Array.isArray(groups) || groups.length === 0) return null;
  const disjuncts: string[] = [];
  for (const g of groups) {
    const conds = g?.conditions ?? [];
    if (conds.length === 0) return null;
    const terms: string[] = [];
    for (const c of conds) {
      const t = term(c);
      if (t == null) return null; // an unparseable condition: not a pure runtime gate
      terms.push(t);
    }
    if ((g?.logic ?? "all") === "all") disjuncts.push(terms.join("&&"));
    else disjuncts.push(...terms);
  }
  return disjuncts.length ? disjuncts.join("||") : null;
}

/** `conditionGroups` → a `data-state-show` expression when EVERY condition is a runtime `state` condition the runtime can evaluate, else `null`. */
export function stateShowExpr(groups: Group[] | undefined): string | null {
  return dnf(groups, showTerm);
}

/** `localStorage` / `url-param` / runtime `state` → a `test()` atom (`ls:key`, `url:key`, `key`); anything else (device, auth…) is null. */
function gateTerm(c: Cond): string | null {
  const op = c.operator ?? "exists";
  const key = String(c.key ?? "");
  if (c.type === "state") return showTerm(c);
  if (c.type !== "localStorage" && c.type !== "url-param") return null;
  if (!/^[\w.-]+$/.test(key)) return null;
  const k = (c.type === "localStorage" ? "ls:" : "url:") + key;
  if (op === "exists") return k;
  if (op === "not-exists") return "!" + k;
  const sym = STATE_OP[op];
  const v = String(c.value ?? "");
  if (!sym || v === "" || /[|&:;]/.test(v)) return null;
  return k + sym + v;
}

/**
 * An ACTION's `conditions` → the `data-show-if` expression the `show` chunk evaluates in the browser, or
 * `null` when any condition can't be expressed (the action then fires ungated, like the SDK's indeterminate pass).
 */
export function actionGateExpr(groups: Group[] | undefined): string | null {
  return dnf(groups, gateTerm);
}

/** One `state` condition → a runtime `test()` expression, or null when the
 *  runtime can't evaluate it (non-state type, colon key, `contains`, or a value
 *  carrying `:` / `;` that would break the `data-state-class` grammar). */
function stateTerm(c: Cond): string | null {
  if (c.type !== "state") return null;
  const key = String(c.key ?? "");
  if (!key || !isRuntimeStateKey(key)) return null;
  const op = c.operator ?? "exists";
  if (op === "exists") return key;
  if (op === "not-exists") return "!" + key;
  const sym = STATE_OP[op];
  if (!sym) return null; // contains / not-contains: `test()` has no such operator
  const v = String(c.value ?? "");
  if (v === "" || /[:;]/.test(v)) return null;
  return key + sym + v;
}

/** A binding's condition groups → the OR list of test-expr terms, or null when
 *  it can't be expressed. One `data-state-class` entry is a single `test()`
 *  call, so an `all` group with more than one condition (a logical AND) has no
 *  equivalent and voids the binding. */
function bindingTerms(groups: Group[] | undefined): string[] | null {
  if (!Array.isArray(groups) || groups.length === 0) return null;
  const terms: string[] = [];
  for (const g of groups) {
    const conds = g?.conditions ?? [];
    if (conds.length === 0) return null;
    if ((g?.logic ?? "all") === "all" && conds.length > 1) return null; // AND
    for (const c of conds) {
      const t = stateTerm(c);
      if (t == null) return null;
      terms.push(t);
    }
  }
  return terms.length ? terms : null;
}

/** Resolve a modifier NAME to its class string against the viewer-safe builtin
 *  registry plus `ROOT.props.modifiers[<componentName>]` overrides (the same
 *  resolution the React path uses). */
function resolveModifierClasses(componentName: string, name: string, rootProps: any): string {
  const builtin = (BUILTIN_STATE_MODIFIERS as Record<string, Modifier[]>)[componentName] ?? [];
  const saved = (rootProps?.modifiers?.[componentName] as Modifier[] | undefined) ?? [];
  const mod = builtin.concat(saved).find((m) => m.name === name);
  if (!mod) return "";
  return mod.classes || mod.name;
}

/**
 * `props.stateModifiers` → the runtime's `data-state-class` attribute. Modifier
 * names are resolved to class strings here (the runtime is table-free). The
 * component name comes from the node under `ctx.renderingNodeId` (defaulting to
 * `Container`), matching the old `stateModifiersAttrs`. Returns `{}` when
 * nothing maps.
 */
export function stateClassAttr(
  props: Record<string, any>,
  ctx?: { nodes?: Record<string, any>; renderingNodeId?: string }
): Record<string, string> {
  const m = props.stateModifiers;
  if (!Array.isArray(m) || m.length === 0) return {};
  const node = ctx?.renderingNodeId ? ctx.nodes?.[ctx.renderingNodeId] : null;
  const componentName =
    (node && (typeof node.type === "string" ? node.type : node.type?.resolvedName)) || "Container";
  const rootProps = ctx?.nodes?.["ROOT"]?.props || {};

  const entries: string[] = [];
  for (const binding of m) {
    const classes = Array.isArray(binding?.modifiers)
      ? binding.modifiers
          .map((n: string) => resolveModifierClasses(componentName, n, rootProps))
          .filter(Boolean)
          .join(" ")
      : "";
    if (!classes) continue;
    const terms = bindingTerms(binding?.conditions);
    if (!terms) continue;
    for (const t of terms) entries.push(`${t}:${classes}`);
  }
  return entries.length ? { "data-state-class": entries.join(";") } : {};
}
