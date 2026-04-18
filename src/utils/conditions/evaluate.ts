import type {
  Condition,
  ConditionBranch,
  ConditionContext,
  ConditionGroup,
  ConditionLogic,
  Operator,
} from "./types";

/** Mobile breakpoint in px — matches Tailwind's `md` (768px) */
const MOBILE_BREAKPOINT = 768;

/** Walk a dot-separated path into a nested object, supporting array indices. */
function walkPath(obj: any, parts: string[]): any {
  let value = obj;
  for (const part of parts) {
    if (value && typeof value === "object") {
      if (Array.isArray(value) && /^\d+$/.test(part)) {
        value = value[parseInt(part, 10)];
      } else if (part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }
  return value;
}

/** Compare an actual value against an expected value with the given operator. */
function applyOperator(actual: string | null, op: Operator, expected: string): boolean {
  if (op === "exists") return actual != null && actual !== "";
  if (op === "not-exists") return actual == null || actual === "";
  if (actual == null) return false;
  switch (op) {
    case "equals":
      return actual === expected;
    case "not-equals":
      return actual !== expected;
    case "contains":
      return actual.includes(expected);
    case "not-contains":
      return !actual.includes(expected);
    case "greater-than":
      return Number(actual) > Number(expected);
    case "less-than":
      return Number(actual) < Number(expected);
    default:
      return false;
  }
}

/**
 * Evaluate a single condition against a context.
 * Returns `true` (met), `false` (not met), or `null` (can't evaluate — e.g. URL params in static).
 */
export function evaluateSingleCondition(cond: Condition, ctx: ConditionContext): boolean | null {
  switch (cond.type) {
    case "url-param": {
      if (!ctx.urlParams) return null;
      const val = ctx.urlParams.get(cond.key);
      return applyOperator(val, cond.operator, cond.value);
    }

    case "form-field": {
      if (!ctx.formFields) return null;
      const val = ctx.formFields[cond.target || cond.key] ?? null;
      return applyOperator(val, cond.operator, cond.value);
    }

    case "connector": {
      if (!ctx.connectorData) return null;
      const parts = cond.key.split(".");
      let val: any = walkPath(ctx.connectorData, parts);

      // Arrays with exists/not-exists: check length
      if (Array.isArray(val) && (cond.operator === "exists" || cond.operator === "not-exists")) {
        return applyOperator(val.length > 0 ? "true" : null, cond.operator, cond.value);
      }
      // Arrays with numeric operators: compare length
      if (
        Array.isArray(val) &&
        (cond.operator === "greater-than" ||
          cond.operator === "less-than" ||
          cond.operator === "equals")
      ) {
        return applyOperator(String(val.length), cond.operator, cond.value);
      }

      return applyOperator(val == null ? null : String(val), cond.operator, cond.value);
    }

    case "company": {
      if (!ctx.company) return null;
      const val = walkPath(ctx.company, cond.key.split("."));
      return applyOperator(val == null ? null : String(val), cond.operator, cond.value);
    }

    case "device": {
      if (ctx.viewportWidth == null) return null;
      const isMobile = ctx.viewportWidth < MOBILE_BREAKPOINT;
      const expected = cond.value === "mobile";
      return cond.operator === "equals" ? isMobile === expected : isMobile !== expected;
    }

    case "auth": {
      if (!ctx.auth) return null;
      const val = walkPath(ctx.auth, cond.key.split("."));
      return applyOperator(val == null ? null : String(val), cond.operator, cond.value);
    }
  }

  return null;
}

/**
 * Evaluate a flat array of conditions with AND/OR logic.
 * Returns `true` (show), `false` (hide), or `null` (indeterminate — has unevaluable conditions).
 */
export function evaluateConditions(
  conditions: Condition[],
  logic: ConditionLogic,
  ctx: ConditionContext
): boolean | null {
  if (!conditions || conditions.length === 0) return true;

  const results = conditions.map(c => evaluateSingleCondition(c, ctx));

  if (logic === "all") {
    // AND: any false → false, any null with no false → null, all true → true
    if (results.some(r => r === false)) return false;
    if (results.some(r => r === null)) return null;
    return true;
  } else {
    // OR: any true → true, any null with no true → null, all false → false
    if (results.some(r => r === true)) return true;
    if (results.some(r => r === null)) return null;
    return false;
  }
}

/**
 * Evaluate condition groups (OR between groups, AND/OR within each group).
 * Groups are the Elementor-style "condition group" model.
 */
export function evaluateConditionGroups(
  groups: ConditionGroup[],
  ctx: ConditionContext
): boolean | null {
  if (!groups || groups.length === 0) return true;

  // OR between groups: any group true → true
  let hasNull = false;
  for (const group of groups) {
    const result = evaluateConditions(group.conditions, group.logic, ctx);
    if (result === true) return true;
    if (result === null) hasNull = true;
  }
  return hasNull ? null : false;
}

/**
 * Find the first matching branch index for ConditionalContainer.
 * Returns the index of the first branch whose conditions pass, or -1 if none match.
 * A branch with empty conditions always matches (it's the else/fallback).
 */
export function evaluateBranches(
  branches: ConditionBranch[],
  ctx: ConditionContext
): { index: number; indeterminate: boolean } {
  for (let i = 0; i < branches.length; i++) {
    const b = branches[i];
    if (!b.conditions || b.conditions.length === 0) {
      return { index: i, indeterminate: false };
    }
    const result = evaluateConditions(b.conditions, b.conditionLogic, ctx);
    if (result === true) return { index: i, indeterminate: false };
    if (result === null) return { index: i, indeterminate: true };
  }
  return { index: -1, indeterminate: false };
}
