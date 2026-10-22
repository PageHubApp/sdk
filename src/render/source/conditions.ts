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

// ─── device conditions → responsive hide classes ─────────────────────────────
//
// A `device` condition is the viewport against the site's `md` breakpoint: "mobile" is narrower than it
// (`evaluate.ts`: `viewportWidth < breakpoints.md`, default 768). That is exactly what the site's Tailwind `md:`
// variant tests (the release compile uses the site's breakpoints), so a node shown only on phones carries
// `md:hidden` and one shown only on wider screens `max-md:hidden`: decided by CSS, rendered once, the same forms the
// HTML editor's condition builder writes (`conditionModel.ts` `DEVICE_CLASS`).

export const DEVICE_HIDE_CLASS = { mobile: "md:hidden", desktop: "max-md:hidden" } as const;

/** A device condition's answer on a phone (`mobile = true`) or a wider screen. */
function deviceHolds(c: Cond, mobile: boolean): boolean {
  const wantMobile = c.value === "mobile";
  return c.operator === "not-equals" ? mobile !== wantMobile : mobile === wantMobile;
}

/** Groups with every device condition replaced by its answer: `true` / `false` when that decides the whole gate. */
function withDevice(groups: Group[], mobile: boolean): boolean | Group[] {
  const kept: Group[] = [];
  for (const g of groups) {
    const conds = g?.conditions ?? [];
    const any = g?.logic === "any";
    const rest = conds.filter((c) => c.type !== "device");
    const answers = conds.filter((c) => c.type === "device").map((c) => deviceHolds(c, mobile));
    if (any) {
      if (answers.includes(true)) return true; // this group passes, so the OR of groups does
      if (rest.length) kept.push({ ...g, conditions: rest });
    } else {
      if (answers.includes(false)) continue; // this group fails
      if (!rest.length) return true;
      kept.push({ ...g, conditions: rest });
    }
  }
  return kept.length ? kept : false;
}

/**
 * Split the device part out of a node's `conditionGroups`: the hide class it needs and the gate that is left for the
 * other conditions (`true` = none). `"never"` when the node shows on no device. `null` when the groups hold no device
 * condition, or when phone and wider screens would need different OTHER conditions (one element can't carry both).
 */
export function deviceGate(groups: Group[] | undefined): { hide: string | null; rest: true | Group[] } | "never" | null {
  if (!Array.isArray(groups) || !groups.some((g) => (g?.conditions ?? []).some((c) => c.type === "device"))) return null;
  const onPhone = withDevice(groups, true);
  const onWide = withDevice(groups, false);
  if (onPhone === false && onWide === false) return "never";
  if (onPhone === false) return { hide: DEVICE_HIDE_CLASS.desktop, rest: onWide as true | Group[] };
  if (onWide === false) return { hide: DEVICE_HIDE_CLASS.mobile, rest: onPhone as true | Group[] };
  if (JSON.stringify(onPhone) === JSON.stringify(onWide)) return { hide: null, rest: onPhone as true | Group[] };
  return null;
}

// ─── state-driven class modifiers → `data-state-class` ───────────────────────
//
// `props.stateModifiers` → the runtime `state` chunk's `data-state-class`
// attribute (read by `state-view`/`state` in `@pagehub-editor/site-runtime`,
// `chunks/state.ts#paint`). Grammar: `<test-expr>=><classes>` entries joined by
// `;`, where `<test-expr>` is what `state-store.ts#test` parses (colon-namespaced
// keys, `&&` / `||`) and `<classes>` is a space-separated class string toggled
// while the expression passes.
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

/** A repeater-row token (`{{item.label}}`, `{{ item.axisName }}`): the engine fills it per row, so a runtime key or value
 *  can be built from it (`pdp:current:axis:{{item.axisName}}`). Any other token (`{{anchor.*}}`) has no value to fill. */
const ROW_TOKEN = String.raw`\{\{\s*item\.[\w.]+\s*\}\}`;
const ROW_TOKENS = new RegExp(ROW_TOKEN, "g");
const SEG = `(?:[\\w.-]|${ROW_TOKEN})+`;

/** A runtime state key `test()` / `data-state-show` can parse: single segment, a
 *  `local:` / `url:` prefix, or colon-namespaced (`store:filter`, `form:x:fields`); segments may hold row tokens. */
const SHOW_KEY = new RegExp(`^(?:local:|url:)?${SEG}(?::${SEG})*$`);

/** The value carries no grammar delimiter `|` `&` `:` `;` `=>` once row tokens are blanked (their value is the row's). */
const plainValue = (v: string) => v !== "" && !/[|&:;]|=>/.test(v.replace(ROW_TOKENS, ""));

/** A `contains` / `not-contains` on a JSON state value for `"<field>":"` (the matched variant's `"image":"`) is the
 *  runtime's `key.field` path: set while that field is non-empty. */
const JSON_FIELD = /^"([\w-]+)":"$/;

/** One `state` condition → a `test()` atom for `data-state-show`, or null when the
 *  runtime can't evaluate it (non-state type, unparseable key, a `contains` that isn't a
 *  JSON field check, or a value carrying a grammar delimiter `|` / `&` / `:` / `;`). */
function showTerm(c: Cond): string | null {
  if (c.type !== "state") return null;
  const key = String(c.key ?? "");
  if (!key || !SHOW_KEY.test(key)) return null;
  // `form:*` is owned by the form chunk (`[data-form-state]` swaps), NOT the state store — nothing writes
  // it there, so a `data-state-show` on one would hide the node forever. Leave it to the report path, as
  // `visibilityShowAttr` already does. `cart:*` (cart chunk), `store:*`, `deck:*` (state-view writes it),
  // `url:` / `local:` and generic keys ARE store-backed.
  if (/^form:/.test(key)) return null;
  const op = c.operator ?? "exists";
  if (op === "exists") return key;
  if (op === "not-exists") return "!" + key;
  if (op === "contains" || op === "not-contains") {
    const field = JSON_FIELD.exec(String(c.value ?? ""))?.[1];
    return field ? (op === "contains" ? "" : "!") + key + "." + field : null;
  }
  const sym = STATE_OP[op];
  if (!sym) return null;
  const v = String(c.value ?? "");
  return plainValue(v) ? key + sym + v : null;
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

/** Conditions the browser decides (the state store, localStorage, the URL as state): they ride in `data-state-class`. */
const isRuntimeCond = (c: Cond) => c.type === "state" || c.type === "localStorage" || c.type === "url-param";

/**
 * A modifier binding's condition groups → the two halves of its gate. `runtime` is a `test()` expression for
 * `data-state-class`; `server` is a Liquid boolean (a repeater row's `item.*`, `company`, `auth`…) the engine
 * decides at render. A binding is wholly one kind, or one `all` group mixing both (server AND runtime). Anything
 * else (a mixed `any`, an unmappable condition) is null.
 */
function bindingGate(groups: Group[] | undefined): { server: string | null; runtime: string | null } | null {
  if (!Array.isArray(groups) || groups.length === 0) return null;
  const all = groups.flatMap((g) => g?.conditions ?? []);
  if (all.length === 0 || groups.some((g) => !(g?.conditions ?? []).length)) return null;
  if (all.every(isRuntimeCond)) {
    const runtime = dnf(groups, gateTerm);
    return runtime ? { server: null, runtime } : null;
  }
  if (!all.some(isRuntimeCond)) {
    const server = conditionExpr(groups);
    return server ? { server, runtime: null } : null;
  }
  const g = groups[0]!;
  if (groups.length !== 1 || (g.logic ?? "all") !== "all") return null;
  const server = conditionExpr([{ logic: "all", conditions: g.conditions!.filter((c) => !isRuntimeCond(c)) }]);
  const runtime = dnf([{ logic: "all", conditions: g.conditions!.filter(isRuntimeCond) }], gateTerm);
  return server && runtime ? { server, runtime } : null;
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

type ModCtx = { nodes?: Record<string, any>; renderingNodeId?: string; reports?: Set<string>; pre?: string[]; modSeq?: number };

/**
 * `props.stateModifiers` → what each binding contributes. Modifier names are resolved to class strings here (the
 * runtime is table-free); the component name comes from the node under `ctx.renderingNodeId` (defaulting to
 * `Container`), matching the old `stateModifiersAttrs`. A binding gated by the browser becomes a `data-state-class`
 * entry (`test=>classes`); one gated only by the row or site (`item.*`, `company`, `auth`) is a class the engine
 * decides at render; a mix of both gates the entry the same way. A `{% tag %}` may not sit inside an attribute value,
 * so each engine-decided piece is `{% capture %}`d into a variable BEFORE the element (pushed on `ctx.pre`, which
 * `renderNodeToSource` puts in front of the node) and the attribute holds only `{{ variable }}`. A binding with no
 * mapping is counted in `ctx.reports` as "state-modifier" instead of vanishing.
 */
function modifierParts(props: Record<string, any>, ctx?: ModCtx): { entries: string[]; classAdd: string[] } {
  const out = { entries: [] as string[], classAdd: [] as string[] };
  const m = props.stateModifiers;
  if (!Array.isArray(m) || m.length === 0) return out;
  const capture = (server: string, body: string): string => {
    const v = `ph_mod_${(ctx!.modSeq = (ctx!.modSeq ?? 0) + 1)}`;
    (ctx!.pre ??= []).push(`{% capture ${v} %}{% if ${server} %}${body}{% endif %}{% endcapture %}`);
    return `{{ ${v} }}`;
  };
  const node = ctx?.renderingNodeId ? ctx.nodes?.[ctx.renderingNodeId] : null;
  const componentName =
    (node && (typeof node.type === "string" ? node.type : node.type?.resolvedName)) || "Container";
  const rootProps = ctx?.nodes?.["ROOT"]?.props || {};

  for (const binding of m) {
    const classes = Array.isArray(binding?.modifiers)
      ? binding.modifiers
          .map((n: string) => resolveModifierClasses(componentName, n, rootProps))
          .filter(Boolean)
          .join(" ")
      : "";
    if (!classes) continue;
    const gate = bindingGate(binding?.conditions);
    if (!gate) {
      ctx?.reports?.add("state-modifier");
      continue;
    }
    if (!gate.runtime) out.classAdd.push(capture(gate.server!, ` ${classes}`));
    else {
      const entry = `${gate.runtime}=>${classes}`;
      out.entries.push(gate.server ? capture(gate.server, entry) : entry);
    }
  }
  return out;
}

/**
 * `props.stateModifiers` → `classAdd` (engine-decided classes, appended to the element's `class`) and `attrs` (the
 * runtime's `data-state-class`). Call it ONCE per node: it pushes the `{% capture %}`s the attributes refer to.
 */
export function stateModifiers(props: Record<string, any>, ctx?: ModCtx): { classAdd: string; attrs: Record<string, string> } {
  const { entries, classAdd } = modifierParts(props, ctx);
  return { classAdd: classAdd.join(""), attrs: entries.length ? { "data-state-class": entries.join(";") } : {} };
}
