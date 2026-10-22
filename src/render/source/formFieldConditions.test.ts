/**
 * `form-field` visibility conditions → the runtime's live `field:<name>` gate (`data-state-show`), the same form the
 * HTML editor's condition builder writes. The site runtime reads the control's current value and re-tests on input.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { actionGateExpr, stateShowExpr } from "./conditions";
import { gateNode } from "./nodeGate";

const ff = (operator: string, value = "", extra: Record<string, string> = {}) => ({ type: "form-field", key: "topic", operator, value, ...extra });
const one = (c: any) => stateShowExpr([{ logic: "all", conditions: [c] }] as any);

test("every operator maps to a field: atom", () => {
  assert.equal(one(ff("exists")), "field:topic");
  assert.equal(one(ff("not-exists")), "!field:topic");
  assert.equal(one(ff("equals", "sales")), "field:topic=sales");
  assert.equal(one(ff("not-equals", "sales")), "field:topic!=sales");
  assert.equal(one(ff("contains", "quote")), "field:topic*=quote");
  assert.equal(one(ff("not-contains", "quote")), "!field:topic*=quote");
});

test("the watched field is `target` when set, else `key`", () => {
  assert.equal(one(ff("exists", "", { target: "company" })), "field:company");
});

test("a field name or value the grammar can't carry is not mapped (reported instead)", () => {
  assert.equal(one({ type: "form-field", key: "items[]", operator: "exists", value: "" }), null);
  assert.equal(one(ff("equals", "a||b")), null);
});

test("mixed with state in one group, and as an action gate", () => {
  assert.equal(stateShowExpr([{ logic: "all", conditions: [ff("equals", "sales"), { type: "state", key: "open", operator: "exists", value: "" }] }] as any), "field:topic=sales&&open");
  assert.equal(actionGateExpr([{ logic: "any", conditions: [ff("exists"), { type: "localStorage", key: "seen", operator: "not-exists", value: "" }] }] as any), "field:topic||!ls:seen");
});

test("a node gated on a field gets data-state-show, not a report", () => {
  const out = gateNode({ conditionGroups: [{ logic: "all", conditions: [ff("equals", "sales")] }] }, `<div class="x">Sales team</div>`);
  assert.equal(out, `<div data-state-show="field:topic=sales" class="x">Sales team</div>`);
});
