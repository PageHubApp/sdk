/**
 * Craft `conditionGroups` → a Liquid boolean expression for a single `{% if %}`.
 *
 * The twin of the condition evaluator (`utils/conditions/evaluate.ts`). Every node condition type
 * the format supports is handled here; the ones that read runtime-only state (device viewport,
 * localStorage, live form fields, the client state registry) or that can't be written as one flat
 * Liquid expression (a negated `contains`, a mixed `and`/`or` tree) can't become a render-time
 * `{% if %}` — those return `null` and emit a `/* report: <type> */` marker through `onReport`, so a
 * per-site usage count surfaces them before a site flips (see html-first-converter.md §State-system).
 *
 * Replaces the inline stub in `toSource.ts`: `renderNodeToSource` calls `conditionExpr(groups)` and,
 * when it returns a string, wraps the node in `{% if <expr> %}…{% endif %}`.
 */
import type { Condition, ConditionGroup, Operator } from "../../utils/conditions/types";

/** Sink for unmappable-condition markers. Default is a no-op; a caller passes one to count per site. */
export type ConditionReporter = (marker: string) => void;

/** A Liquid comparison literal: booleans and numbers bare, everything else a quoted string. */
function liquidLiteral(raw: string): string {
  if (raw === "true" || raw === "false") return raw;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return raw;
  // Liquid has no string-escape syntax: switch quote style when the value carries one.
  return raw.includes("'") ? `"${raw.replace(/"/g, "")}"` : `'${raw}'`;
}

/** A numeric comparison operand — bare when numeric, else fall back to a quoted literal. */
function liquidNumber(raw: string): string {
  return /^-?\d+(\.\d+)?$/.test(raw) ? raw : liquidLiteral(raw);
}

/**
 * Build a Liquid member accessor from a base object and dot-path segments. Simple identifier
 * segments use dot access (`request.query.category`); anything else falls back to bracket access
 * (`request.query['my-param']`) so hyphens/odd keys stay valid Liquid.
 */
function accessor(base: string, segments: string[]): string {
  let out = base;
  for (const seg of segments) {
    if (!seg) continue;
    out += /^[A-Za-z_]\w*$/.test(seg) ? `.${seg}` : `['${seg.replace(/'/g, "")}']`;
  }
  return out;
}

/** An operator + LHS accessor → one Liquid comparison. `null` for operators that can't flatten. */
function applyOp(lhs: string, op: Operator, value: string): string | null {
  switch (op) {
    case "equals":
      return `${lhs} == ${liquidLiteral(value)}`;
    case "not-equals":
      return `${lhs} != ${liquidLiteral(value)}`;
    case "contains":
      return `${lhs} contains ${liquidLiteral(value)}`;
    // Liquid has no negated `contains`; expressing it needs a nested `{% unless %}`, not a flat term.
    case "not-contains":
      return null;
    // `!= blank` / `== blank` match the evaluator's "non-empty" exists semantics (not bare truthiness,
    // which treats "" as true in Liquid).
    case "exists":
      return `${lhs} != blank`;
    case "not-exists":
      return `${lhs} == blank`;
    case "greater-than":
      return `${lhs} > ${liquidNumber(value)}`;
    case "less-than":
      return `${lhs} < ${liquidNumber(value)}`;
    default:
      return null;
  }
}

/**
 * Auth conditions map onto the format's `customer` global. `status` collapses to presence
 * (`customer` / `customer == blank`); every `customer.*` key (membership, plans, orders, spend)
 * is a dot-path accessor with the generic operator mapping.
 */
function authTerm(key: string, op: Operator, value: string): string | null {
  if (key === "status") {
    const wantLoggedIn = value === "logged-in";
    switch (op) {
      case "equals":
        return wantLoggedIn ? "customer" : "customer == blank";
      case "not-equals":
        return wantLoggedIn ? "customer == blank" : "customer";
      case "exists":
        return "customer";
      case "not-exists":
        return "customer == blank";
      default:
        return null;
    }
  }
  const rest = key.startsWith("customer.") ? key.slice("customer.".length) : key;
  return applyOp(accessor("customer", rest.split(".")), op, value);
}

/** A single condition → its Liquid term, or `null` when it can't become a render-time `{% if %}`. */
function conditionTerm(c: Condition): string | null {
  if (!c || typeof c.type !== "string") return null;
  const key = typeof c.key === "string" ? c.key : "";
  const value = c.value == null ? "" : String(c.value);
  switch (c.type) {
    case "url-param":
      return applyOp(accessor("request.query", [key]), c.operator, value);
    case "item":
      return applyOp(accessor("item", key.split(".")), c.operator, value);
    case "company":
      return applyOp(accessor("company", key.split(".")), c.operator, value);
    case "auth":
      return authTerm(key, c.operator, value);
    case "state":
      // Only the URL-bridged slice of the registry is render-time readable (`url:category` ↔
      // `request.query.category`). Every other state key is written by runtime clicks / computed
      // bindings — pinning it in a render-time `{% if %}` would be wrong, so report it instead.
      return key.startsWith("url:")
        ? applyOp(accessor("request.query", [key.slice(4)]), c.operator, value)
        : null;
    // Runtime-only sources — the server can't read them, so no static `{% if %}` is faithful.
    case "device":
    case "localStorage":
    case "form-field":
    case "connector":
      return null;
    default:
      return null;
  }
}

/**
 * `conditionGroups` → a Liquid boolean expression for a single `{% if %}`, or `null` when no faithful
 * flat expression exists.
 *
 * Within a group, conditions join with `and` (`logic: "all"`) or `or` (`logic: "any"`); groups OR
 * together. Liquid evaluates bare `and`/`or` right-to-left with no grouping, so an expression that
 * would mix both connectives can't be flattened safely — that, an unmappable condition type, or a
 * non-flattenable operator (`not-contains`) returns `null` and reports via `onReport`.
 */
export function conditionExpr(
  groups: ConditionGroup[] | any[] | null | undefined,
  onReport: ConditionReporter = () => {}
): string | null {
  if (!Array.isArray(groups) || groups.length === 0) return null;

  const groupExprs: { expr: string; connective: "and" | "or" | null }[] = [];
  const reports: string[] = [];

  for (const g of groups) {
    const conds: Condition[] = Array.isArray(g?.conditions) ? g.conditions : [];
    if (conds.length === 0) continue;
    const terms: string[] = [];
    let unmappable = false;
    for (const c of conds) {
      const term = conditionTerm(c);
      if (term == null) {
        unmappable = true;
        reports.push(`/* report: ${(c && c.type) || "unknown"} */`);
      } else {
        terms.push(term);
      }
    }
    if (unmappable || terms.length === 0) continue;
    const connective: "and" | "or" | null = terms.length > 1 ? (g.logic === "any" ? "or" : "and") : null;
    groupExprs.push({ expr: terms.length > 1 ? terms.join(` ${connective} `) : terms[0], connective });
  }

  // Any condition that couldn't map means dropping it would change the gate's meaning — bail whole.
  if (reports.length) {
    for (const r of reports) onReport(r);
    return null;
  }
  if (groupExprs.length === 0) return null;

  const used = new Set<"and" | "or">();
  for (const ge of groupExprs) if (ge.connective) used.add(ge.connective);
  if (groupExprs.length > 1) used.add("or");

  if (used.has("and") && used.has("or")) {
    onReport("/* report: mixed-and-or */");
    return null;
  }

  return groupExprs.length === 1 ? groupExprs[0].expr : groupExprs.map(ge => ge.expr).join(" or ");
}
