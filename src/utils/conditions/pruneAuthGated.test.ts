import test from "node:test";
import assert from "node:assert/strict";
import type { SerializedNodes } from "../../render/static/types";
import type { AuthState } from "../design/variables";
import type { Condition, ConditionGroup } from "./types";
import { hasUnprovableAuthGate, pruneAuthGatedNodes } from "./pruneAuthGated";

const auth = (key: string, operator: Condition["operator"], value = ""): Condition => ({
  type: "auth",
  key,
  operator,
  value,
});
const all = (...conditions: Condition[]): ConditionGroup[] => [{ logic: "all", conditions }];

const IS_MEMBER = all(auth("customer.isMember", "equals", "true"));
const HAS_A = all(auth("customer.plans.a", "exists"));
const LACKS_A = all(auth("customer.plans.a", "not-exists"));
const A_DAY_7 = all(auth("customer.planDays.a", "greater-than", "6"));

function node(
  parent: string | null,
  children: string[] = [],
  props: Record<string, any> = {},
  linkedNodes?: Record<string, string>
): SerializedNodes[string] {
  return {
    type: { resolvedName: "Container" },
    props,
    parent,
    nodes: children,
    ...(linkedNodes ? { linkedNodes } : {}),
  };
}

const LOGGED_OUT: AuthState = { status: "logged-out", customer: null };
function member(planDays: Record<string, number>): AuthState {
  const plans = Object.fromEntries(Object.keys(planDays).map(k => [k, true as const]));
  return {
    status: "logged-in",
    customer: { id: "c1", email: "m@x.com", isMember: Object.keys(plans).length > 0, plans, planDays },
  };
}

/** ROOT → page(home) → [public, members(→ lesson → video), upsell, planA, drip] */
function site(): SerializedNodes {
  return {
    ROOT: node(null, ["home"]),
    home: node("ROOT", ["public", "members", "upsell", "planA", "drip"], { type: "page" }),
    public: node("home"),
    members: node("home", ["lesson"], { conditionGroups: IS_MEMBER }),
    lesson: node("members", ["video"]),
    video: node("lesson"),
    upsell: node("home", [], { conditionGroups: LACKS_A }),
    planA: node("home", [], { conditionGroups: HAS_A }),
    drip: node("home", [], { conditionGroups: A_DAY_7 }),
  };
}

test("logged out: members, plan and drip subtrees are removed, upsell stays", () => {
  const { nodes, removed, pageDenied } = pruneAuthGatedNodes(site(), LOGGED_OUT);
  assert.deepEqual(Object.keys(nodes).sort(), ["ROOT", "home", "public", "upsell"]);
  assert.deepEqual(nodes.home.nodes, ["public", "upsell"]);
  assert.equal(removed, 5);
  assert.deepEqual(pageDenied, []);
});

test("null auth fails closed like logged out", () => {
  const { nodes } = pruneAuthGatedNodes(site(), null);
  assert.equal(nodes.members, undefined);
  assert.equal(nodes.video, undefined);
});

test("plan A member on day 3: content + plan A kept, upsell and drip removed", () => {
  const { nodes } = pruneAuthGatedNodes(site(), member({ a: 3 }));
  assert.deepEqual(nodes.home.nodes, ["public", "members", "planA"]);
  assert.ok(nodes.video);
});

test("plan A member on day 10: the drip lesson unlocks", () => {
  const { nodes } = pruneAuthGatedNodes(site(), member({ a: 10 }));
  assert.deepEqual(nodes.home.nodes, ["public", "members", "planA", "drip"]);
});

test("plan B member: any-membership content stays, plan A content goes, upsell shows", () => {
  const { nodes } = pruneAuthGatedNodes(site(), member({ b: 40 }));
  assert.deepEqual(nodes.home.nodes, ["public", "members", "upsell"]);
});

test("nested gated subtrees: an inner gate inside an allowed outer gate is pruned", () => {
  const tree: SerializedNodes = {
    ROOT: node(null, ["outer"]),
    outer: node("ROOT", ["inner", "free"], { conditionGroups: IS_MEMBER }),
    inner: node("outer", ["deep"], { conditionGroups: HAS_A }),
    deep: node("inner"),
    free: node("outer"),
  };
  const { nodes, removed } = pruneAuthGatedNodes(tree, member({ b: 1 }));
  assert.deepEqual(Object.keys(nodes).sort(), ["ROOT", "free", "outer"]);
  assert.deepEqual(nodes.outer.nodes, ["free"]);
  assert.equal(removed, 2);
});

test("a denied page keeps its node, loses its children and is reported", () => {
  const tree: SerializedNodes = {
    ROOT: node(null, ["home", "course"]),
    home: node("ROOT", ["hero"], { type: "page", isHomePage: true }),
    hero: node("home"),
    course: node("ROOT", ["c1"], { type: "page", conditionGroups: IS_MEMBER }),
    c1: node("course", ["c2"]),
    c2: node("c1"),
  };
  const { nodes, pageDenied, removed } = pruneAuthGatedNodes(tree, LOGGED_OUT);
  assert.deepEqual(pageDenied, ["course"]);
  assert.ok(nodes.course);
  assert.deepEqual(nodes.course.nodes, []);
  assert.equal(nodes.c1, undefined);
  assert.equal(nodes.c2, undefined);
  assert.deepEqual(nodes.ROOT.nodes, ["home", "course"]);
  assert.equal(removed, 2);
});

test("linkedNodes are removed with their owner and cleaned from a kept parent", () => {
  const tree: SerializedNodes = {
    ROOT: node(null, ["card"]),
    card: node("ROOT", [], {}, { header: "hdr", body: "body" }),
    hdr: node("card"),
    body: node("card", ["secret"], { conditionGroups: IS_MEMBER }),
    secret: node("body"),
    gated: node("ROOT", [], { conditionGroups: IS_MEMBER }, { slot: "slotted" }),
    slotted: node("gated"),
  };
  tree.ROOT.nodes.push("gated");
  const { nodes } = pruneAuthGatedNodes(tree, LOGGED_OUT);
  assert.deepEqual(nodes.card.linkedNodes, { header: "hdr" });
  assert.equal(nodes.body, undefined);
  assert.equal(nodes.secret, undefined);
  assert.equal(nodes.gated, undefined);
  assert.equal(nodes.slotted, undefined);
  assert.deepEqual(nodes.ROOT.nodes, ["card"]);
});

test("a mixed any group (auth OR url-param) is kept: it can't be proven false", () => {
  const groups: ConditionGroup[] = [
    {
      logic: "any",
      conditions: [auth("customer.plans.a", "exists"), { type: "url-param", key: "preview", operator: "exists", value: "" }],
    },
  ];
  const tree: SerializedNodes = { ROOT: node(null, ["x"]), x: node("ROOT", [], { conditionGroups: groups }) };
  const { nodes } = pruneAuthGatedNodes(tree, LOGGED_OUT);
  assert.ok(nodes.x);
  assert.equal(hasUnprovableAuthGate(groups), true);
});

test("auth AND a client-only condition is still pruned when auth fails", () => {
  const groups = all(auth("customer.isMember", "equals", "true"), {
    type: "item",
    key: "slug",
    operator: "exists",
    value: "",
  });
  const tree: SerializedNodes = { ROOT: node(null, ["x"]), x: node("ROOT", [], { conditionGroups: groups }) };
  assert.equal(pruneAuthGatedNodes(tree, LOGGED_OUT).nodes.x, undefined);
  assert.ok(pruneAuthGatedNodes(tree, member({ a: 1 })).nodes.x, "kept when auth passes");
  assert.equal(hasUnprovableAuthGate(groups), false);
});

test("an OR'd second group with no auth condition is flagged as unprovable", () => {
  const groups: ConditionGroup[] = [
    ...HAS_A,
    { logic: "all", conditions: [{ type: "device", key: "viewport", operator: "equals", value: "mobile" }] },
  ];
  assert.equal(hasUnprovableAuthGate(groups), true);
  assert.equal(hasUnprovableAuthGate(IS_MEMBER), false);
  assert.equal(hasUnprovableAuthGate(null), false);
});

test("never mutates its input and is idempotent", () => {
  const input = site();
  const snapshot = JSON.stringify(input);
  const first = pruneAuthGatedNodes(input, LOGGED_OUT);
  assert.equal(JSON.stringify(input), snapshot);
  assert.notEqual(first.nodes, input);
  const second = pruneAuthGatedNodes(first.nodes, LOGGED_OUT);
  assert.deepEqual(second.nodes, first.nodes);
  assert.equal(second.removed, 0);
});

test("a tree with no auth conditions comes back unchanged", () => {
  const tree: SerializedNodes = { ROOT: node(null, ["a"]), a: node("ROOT") };
  const { nodes, removed } = pruneAuthGatedNodes(tree, LOGGED_OUT);
  assert.deepEqual(nodes, tree);
  assert.notEqual(nodes, tree);
  assert.equal(removed, 0);
});

test("a `not-equals true` upsell reaches logged-out visitors and hides for members", () => {
  const NOT_MEMBER = all(auth("customer.isMember", "not-equals", "true"));
  const tree: SerializedNodes = {
    ROOT: node(null, ["paywall"]),
    paywall: node("ROOT", [], { conditionGroups: NOT_MEMBER }),
  };
  assert.ok(pruneAuthGatedNodes(tree, LOGGED_OUT).nodes.paywall, "logged out sees the upsell");
  assert.ok(pruneAuthGatedNodes(tree, member({})).nodes.paywall, "signed in, no plan sees it");
  assert.equal(pruneAuthGatedNodes(tree, member({ a: 1 })).nodes.paywall, undefined);
});

test("a gated page nested in a gated subtree is not reported twice", () => {
  const tree: SerializedNodes = {
    ROOT: node(null, ["wrap"]),
    wrap: node("ROOT", ["pg"], { conditionGroups: IS_MEMBER }),
    pg: node("wrap", ["x"], { type: "page", conditionGroups: IS_MEMBER }),
    x: node("pg"),
  };
  const { nodes, pageDenied } = pruneAuthGatedNodes(tree, LOGGED_OUT);
  assert.deepEqual(Object.keys(nodes), ["ROOT"]);
  assert.deepEqual(pageDenied, []);
});

test("a boolean `true` condition value matches like the string \"true\"", () => {
  const BOOL_MEMBER: ConditionGroup[] = [
    { logic: "all", conditions: [{ ...auth("customer.isMember", "equals"), value: true as any }] },
  ];
  const BOOL_NOT_MEMBER: ConditionGroup[] = [
    { logic: "all", conditions: [{ ...auth("customer.isMember", "not-equals"), value: true as any }] },
  ];
  const tree: SerializedNodes = {
    ROOT: node(null, ["content", "upsell"]),
    content: node("ROOT", [], { conditionGroups: BOOL_MEMBER }),
    upsell: node("ROOT", [], { conditionGroups: BOOL_NOT_MEMBER }),
  };
  assert.deepEqual(pruneAuthGatedNodes(tree, member({ a: 1 })).nodes.ROOT.nodes, ["content"]);
  assert.deepEqual(pruneAuthGatedNodes(tree, LOGGED_OUT).nodes.ROOT.nodes, ["upsell"]);
});

test("the static runtime's evaluator also coerces a boolean condition value", async () => {
  const { CONDITION_EVAL_CHUNK } = await import("./clientScript");
  const rt: Record<string, any> = {};
  const win = {
    location: { search: "" },
    innerWidth: 1280,
    __PH_AUTH__: { status: "logged-in", customer: { isMember: true, plans: { a: true } } },
  };
  // `__name` is the helper tsx/esbuild injects into function bodies.
  new Function("window", "__phRT", "MOBILE", "__name", CONDITION_EVAL_CHUNK)(win, rt, 768, (f: unknown) => f);
  const cond = { type: "auth", key: "customer.isMember", operator: "equals", value: true };
  assert.equal(rt.evalCond(cond), true);
  assert.equal(rt.evalCond({ ...cond, value: "true" }), true);
  win.__PH_AUTH__ = { status: "logged-out", customer: null } as any;
  assert.equal(rt.evalCond(cond), false);
  assert.equal(rt.evalCond({ ...cond, operator: "not-equals" }), true);
});
