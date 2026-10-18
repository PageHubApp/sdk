/**
 * The static walker resolves `auth` conditions against the full member auth
 * (`requestContext.auth`): plan keys, drip days, and the not-equals upsell.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { renderToHTML } from "./renderToHTML";
import type { AuthState } from "../../utils/design/variableStores";

const box = (id: string, key: string, operator: string, value = "") => ({
  type: { resolvedName: "Container" },
  isCanvas: true,
  props: {
    attrs: { id },
    conditionGroups: [{ logic: "all", conditions: [{ type: "auth", key, operator, value }] }],
  },
  parent: "ROOT",
  nodes: [],
});

const fixture = JSON.stringify({
  ROOT: {
    type: { resolvedName: "Container" },
    isCanvas: true,
    props: { type: "page" },
    parent: null,
    nodes: ["plan", "drip", "upsell"],
  },
  plan: box("gate-plan", "customer.plans.pro", "exists"),
  drip: box("gate-drip", "customer.planDays.pro", "greater-than", "6"),
  upsell: box("gate-upsell", "customer.isMember", "not-equals", "true"),
});

function render(auth: AuthState) {
  return renderToHTML(fixture, { compressed: false, requestContext: { auth } }).html;
}
const member = (days: number): AuthState => ({
  status: "logged-in",
  customer: { isMember: true, plans: { pro: true }, planDays: { pro: days } },
});

test("logged out: plan and drip skipped, upsell rendered", () => {
  const html = render({ status: "logged-out", customer: null });
  assert.doesNotMatch(html, /gate-plan/);
  assert.doesNotMatch(html, /gate-drip/);
  assert.match(html, /gate-upsell/);
});

test("pro member on day 3: plan shown, drip and upsell skipped", () => {
  const html = render(member(3));
  assert.match(html, /gate-plan/);
  assert.doesNotMatch(html, /gate-drip/);
  assert.doesNotMatch(html, /gate-upsell/);
});

test("pro member on day 10: drip unlocks", () => {
  assert.match(render(member(10)), /gate-drip/);
});

test("the client seed carries plans but never identity", () => {
  const html = render({
    status: "logged-in",
    customer: { id: "c1", email: "secret@x.test", isMember: true, plans: { pro: true }, planDays: { pro: 3 } },
  });
  assert.doesNotMatch(html, /secret@x\.test/);
});
