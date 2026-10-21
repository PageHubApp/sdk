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
  if (c.type === "auth") {
    const s = c.value ?? c.operator ?? "";
    return s === "logged-out" ? "customer == blank" : "customer";
  }
  const path = pathOf(c);
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
