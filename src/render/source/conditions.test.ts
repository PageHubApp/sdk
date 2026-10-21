import { test } from "node:test";
import assert from "node:assert/strict";
import { conditionExpr, stateClassAttr, isRuntimeStateKey } from "./conditions";

test("single `all` group → conditions joined with `and`", () => {
  const groups = [
    {
      logic: "all",
      conditions: [
        { type: "url-param", key: "ref", operator: "equals", value: "templates" },
        { type: "company", key: "name", operator: "exists", value: "" },
      ],
    },
  ] as any;
  assert.equal(conditionExpr(groups), "request.query.ref == 'templates' and company.name != blank");
});

test("single `any` group → conditions joined with `or`", () => {
  const groups = [
    {
      logic: "any",
      conditions: [
        { type: "item", key: "featured", operator: "equals", value: "true" },
        { type: "item", key: "stock", operator: "greater-than", value: "0" },
      ],
    },
  ] as any;
  assert.equal(conditionExpr(groups), "item.featured == true or item.stock > 0");
});

test("url-param equals → request.query comparison", () => {
  const groups = [
    { logic: "all", conditions: [{ type: "url-param", key: "category", operator: "equals", value: "tees" }] },
  ] as any;
  assert.equal(conditionExpr(groups), "request.query.category == 'tees'");
});

test("auth status → customer presence", () => {
  const loggedIn = [
    { logic: "all", conditions: [{ type: "auth", key: "status", operator: "equals", value: "logged-in" }] },
  ] as any;
  const loggedOut = [
    { logic: "all", conditions: [{ type: "auth", key: "status", operator: "equals", value: "logged-out" }] },
  ] as any;
  assert.equal(conditionExpr(loggedIn), "customer");
  assert.equal(conditionExpr(loggedOut), "customer == blank");
});

test("multiple single-condition groups OR together", () => {
  const groups = [
    { logic: "all", conditions: [{ type: "url-param", key: "ref", operator: "equals", value: "a" }] },
    { logic: "all", conditions: [{ type: "url-param", key: "ref", operator: "equals", value: "b" }] },
  ] as any;
  assert.equal(conditionExpr(groups), "request.query.ref == 'a' or request.query.ref == 'b'");
});

test("unmappable type → null + `/* report: device */` marker", () => {
  const groups = [
    { logic: "all", conditions: [{ type: "device", key: "viewport", operator: "equals", value: "mobile" }] },
  ] as any;
  const reports: string[] = [];
  assert.equal(conditionExpr(groups, m => reports.push(m)), null);
  assert.deepEqual(reports, ["/* report: device */"]);
});

test("runtime state key → null + report; url-bridged state maps", () => {
  const runtime = [
    { logic: "all", conditions: [{ type: "state", key: "cart:open", operator: "equals", value: "shown" }] },
  ] as any;
  const reports: string[] = [];
  assert.equal(conditionExpr(runtime, m => reports.push(m)), null);
  assert.deepEqual(reports, ["/* report: state */"]);

  const urlState = [
    { logic: "all", conditions: [{ type: "state", key: "url:page", operator: "equals", value: "2" }] },
  ] as any;
  assert.equal(conditionExpr(urlState), "request.query.page == 2");
});

test("mixed and/or (can't flatten) → null + mixed-and-or report", () => {
  const groups = [
    {
      logic: "all",
      conditions: [
        { type: "url-param", key: "a", operator: "equals", value: "1" },
        { type: "url-param", key: "b", operator: "equals", value: "2" },
      ],
    },
    { logic: "all", conditions: [{ type: "url-param", key: "c", operator: "equals", value: "3" }] },
  ] as any;
  const reports: string[] = [];
  assert.equal(conditionExpr(groups, m => reports.push(m)), null);
  assert.deepEqual(reports, ["/* report: mixed-and-or */"]);
});

test("no groups → null", () => {
  assert.equal(conditionExpr([]), null);
  assert.equal(conditionExpr(undefined), null);
});

// ─── stateClassAttr (stateModifiers → data-state-class) ──────────────────────

test("isRuntimeStateKey: single-segment + url:/local: ok, colon-namespaced not", () => {
  assert.ok(isRuntimeStateKey("tabs-group"));
  assert.ok(isRuntimeStateKey("url:page"));
  assert.ok(isRuntimeStateKey("local:x"));
  assert.ok(!isRuntimeStateKey("cart:open"));
  assert.ok(!isRuntimeStateKey("form:customer-account:fields"));
});

test("stateModifiers: builtin tab-active resolved to classes, single state equals", () => {
  const ctx = { renderingNodeId: "b1", nodes: { b1: { type: "Button" }, ROOT: { props: {} } } } as any;
  const props = {
    stateModifiers: [
      {
        conditions: [{ logic: "all", conditions: [{ type: "state", key: "tabs-group", operator: "equals", value: "tab-panel-0" }] }],
        modifiers: ["tab-active"],
      },
    ],
  };
  assert.deepEqual(stateClassAttr(props, ctx), {
    "data-state-class": "tabs-group=tab-panel-0:border-primary text-primary",
  });
});

test("stateModifiers: `any` group of state terms → OR entries (same classes)", () => {
  const ctx = { renderingNodeId: "c1", nodes: { c1: { type: "Container" }, ROOT: { props: {} } } } as any;
  const props = {
    stateModifiers: [
      {
        conditions: [
          {
            logic: "any",
            conditions: [
              { type: "state", key: "mode", operator: "equals", value: "a" },
              { type: "state", key: "mode", operator: "equals", value: "b" },
            ],
          },
        ],
        modifiers: ["shown-flex"],
      },
    ],
  };
  assert.deepEqual(stateClassAttr(props, ctx), { "data-state-class": "mode=a:flex;mode=b:flex" });
});

test("stateModifiers: colon key / AND group / contains → dropped (no data-state-class)", () => {
  const ctx = { renderingNodeId: "c1", nodes: { c1: { type: "Container" }, ROOT: { props: {} } } } as any;
  // colon-namespaced key (cart:*) — not test()-parseable
  assert.deepEqual(
    stateClassAttr(
      { stateModifiers: [{ conditions: [{ logic: "all", conditions: [{ type: "state", key: "cart:count", operator: "greater-than", value: "0" }] }], modifiers: ["shown-block"] }] },
      ctx,
    ),
    {},
  );
  // AND group (2 conditions in one `all` group) — can't be one entry
  assert.deepEqual(
    stateClassAttr(
      { stateModifiers: [{ conditions: [{ logic: "all", conditions: [{ type: "state", key: "x", operator: "exists", value: "" }, { type: "state", key: "y", operator: "not-exists", value: "" }] }], modifiers: ["shown-flex"] }] },
      ctx,
    ),
    {},
  );
  // contains has no test() operator
  assert.deepEqual(
    stateClassAttr(
      { stateModifiers: [{ conditions: [{ logic: "all", conditions: [{ type: "state", key: "x", operator: "contains", value: "a" }] }], modifiers: ["shown-flex"] }] },
      ctx,
    ),
    {},
  );
});

test("stateModifiers: ROOT override modifier class resolves", () => {
  const ctx = {
    renderingNodeId: "c1",
    nodes: { c1: { type: "Container" }, ROOT: { props: { modifiers: { Container: [{ name: "my-mod", classes: "ring-2 ring-primary" }] } } } },
  } as any;
  assert.deepEqual(
    stateClassAttr(
      { stateModifiers: [{ conditions: [{ logic: "all", conditions: [{ type: "state", key: "sel", operator: "exists", value: "" }] }], modifiers: ["my-mod"] }] },
      ctx,
    ),
    { "data-state-class": "sel:ring-2 ring-primary" },
  );
});
