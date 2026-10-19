/**
 * The React evaluator (evaluate.ts) and the static runtime's evaluator
 * (clientScript.ts, shipped as a string) can't share code, so this runs one
 * case table through both and requires the same answer.
 *
 * Run: pnpm exec tsx --test packages/sdk/src/utils/conditions/conditionParity.test.ts
 */
import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { CONDITION_EVAL_CHUNK } from "./clientScript";
import { evaluateSingleCondition } from "./evaluate";
import { buildStaticContext } from "./context";
import { __resetForTests, setState } from "../state/stateRegistry";
import type { Condition, Operator } from "./types";

/** Evaluate with the static runtime's chunk, against a `__PH_STATE__` seed. */
function staticEval(cond: Condition, state: Record<string, string | null>): boolean {
  const phState: Record<string, { value: string | null }> = {};
  for (const [k, v] of Object.entries(state)) phState[k] = { value: v };
  const sandbox: Record<string, unknown> = {
    __phRT: {},
    MOBILE: 768,
    URLSearchParams,
    window: { location: { search: "" }, innerWidth: 1280, __PH_STATE__: phState },
    document: {},
    // tsx (esbuild) wraps function declarations in `__name(...)`; the chunk's
    // source carries those calls, so the sandbox supplies the helper.
    __name: <T>(fn: T) => fn,
  };
  vm.runInNewContext(CONDITION_EVAL_CHUNK, sandbox);
  return (sandbox.__phRT as { evalCond: (c: Condition) => boolean }).evalCond(cond);
}

function reactEval(cond: Condition, state: Record<string, string | null>): boolean | null {
  __resetForTests();
  for (const [k, v] of Object.entries(state)) setState(k, { value: v });
  return evaluateSingleCondition(cond, buildStaticContext(null));
}

const state = (operator: Operator, value = "yearly"): Condition => ({
  type: "state",
  key: "billing",
  operator,
  value,
});

// [condition, state, expected]
const CASES: Array<[Condition, Record<string, string | null>, boolean]> = [
  // Unset key reads as "".
  [state("equals"), {}, false],
  [state("not-equals"), {}, true],
  [state("equals", ""), {}, true],
  [state("exists"), {}, false],
  [state("not-exists"), {}, true],
  [state("contains"), {}, false],
  [state("not-contains"), {}, true],
  [state("greater-than", "-1"), {}, false],
  [state("less-than", "5"), {}, false],
  // Cleared (null value) is unset too.
  [state("equals"), { billing: null }, false],
  [state("not-equals"), { billing: null }, true],
  // Set key.
  [state("equals"), { billing: "yearly" }, true],
  [state("not-equals"), { billing: "yearly" }, false],
  [state("not-equals"), { billing: "monthly" }, true],
  [state("exists"), { billing: "monthly" }, true],
  [state("greater-than", "2"), { billing: "3" }, true],
  [state("less-than", "2"), { billing: "3" }, false],
];

test("state conditions: React and static evaluators agree on every case", () => {
  for (const [cond, st, expected] of CASES) {
    const label = `${cond.operator} ${JSON.stringify(cond.value)} with ${JSON.stringify(st)}`;
    assert.equal(reactEval(cond, st), expected, `React: ${label}`);
    assert.equal(staticEval(cond, st), expected, `static: ${label}`);
  }
});

test("url-param stays indeterminate in React when the URL is unknown (SSR)", () => {
  const cond: Condition = { type: "url-param", key: "plan", operator: "equals", value: "x" };
  assert.equal(evaluateSingleCondition(cond, buildStaticContext(null)), null);
});
