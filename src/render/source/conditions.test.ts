import { test } from "node:test";
import assert from "node:assert/strict";
import { conditionExpr, stateModifiers, isRuntimeStateKey, stateShowExpr } from "./conditions";

const stateClassAttr = (props: any, ctx: any) => stateModifiers(props, ctx).attrs;

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

test("stateShowExpr: a namespaced runtime state gate → a data-state-show test expr", () => {
  // The marcusmares "Solution Store" card: one `any` group (not-exists OR =all OR =people).
  const card = [
    {
      logic: "any",
      conditions: [
        { type: "state", key: "store:filter", operator: "not-exists", value: "" },
        { type: "state", key: "store:filter", operator: "equals", value: "all" },
        { type: "state", key: "store:filter", operator: "equals", value: "people" },
      ],
    },
  ] as any;
  assert.equal(stateShowExpr(card), "!store:filter||store:filter=all||store:filter=people");
  // An `all` group ANDs its terms (DNF, AND binds tighter).
  const both = [
    { logic: "all", conditions: [{ type: "state", key: "a", operator: "exists" }, { type: "state", key: "b", operator: "not-exists" }] },
  ] as any;
  assert.equal(stateShowExpr(both), "a&&!b");
  // Not a pure state gate (a server condition present) → null, so conditionExpr handles it.
  assert.equal(stateShowExpr([{ logic: "all", conditions: [{ type: "url-param", key: "x", operator: "exists" }] }] as any), null);
  // cart:* is written into the store by the cart chunk, so it gates like any key.
  assert.equal(stateShowExpr([{ logic: "all", conditions: [{ type: "state", key: "cart:error", operator: "exists" }] }] as any), "cart:error");
  // form:* is the form chunk's own (`[data-form-state]`), not store-backed → null (left to the report path).
  assert.equal(stateShowExpr([{ logic: "all", conditions: [{ type: "state", key: "form:x:fields", operator: "exists" }] }] as any), null);
  // A `{{ item.* }}` token builds a key or value per repeater row; an `{{ anchor.* }}` token has nothing to fill it.
  assert.equal(stateShowExpr([{ logic: "all", conditions: [{ type: "state", key: "axis:{{item.name}}", operator: "equals", value: "{{item.label}}" }] }] as any), "axis:{{item.name}}={{item.label}}");
  assert.equal(stateShowExpr([{ logic: "all", conditions: [{ type: "state", key: "{{anchor.chat}}:hasError", operator: "exists" }] }] as any), null);
  // A JSON-field `contains` is the runtime's `key.field` path (the matched variant's image).
  const has = (operator: string) => [{ logic: "all", conditions: [{ type: "state", key: "pdp:v", operator, value: '"image":"' }] }] as any;
  assert.equal(stateShowExpr(has("contains")), "pdp:v.image");
  assert.equal(stateShowExpr(has("not-contains")), "!pdp:v.image");
  assert.equal(stateShowExpr([{ logic: "all", conditions: [{ type: "state", key: "pdp:v", operator: "contains", value: "free text" }] }] as any), null);
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
    "data-state-class": "tabs-group=tab-panel-0=>border-primary text-primary",
  });
});

test("stateModifiers: `any` group of state terms → one OR expression", () => {
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
  assert.deepEqual(stateClassAttr(props, ctx), { "data-state-class": "mode=a||mode=b=>flex" });
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
    { "data-state-class": "sel=>ring-2 ring-primary" },
  );
});

test("stateModifiers: colon keys, AND groups and row-templated keys all map", () => {
  const ctx = { renderingNodeId: "c1", nodes: { c1: { type: "Container" }, ROOT: { props: {} } } } as any;
  const one = (conditions: any[], logic = "all") => stateClassAttr({ stateModifiers: [{ conditions: [{ logic, conditions }], modifiers: ["shown-block"] }] }, ctx);
  assert.deepEqual(one([{ type: "state", key: "cart:count", operator: "greater-than", value: "0" }]), { "data-state-class": "cart:count>0=>block" });
  assert.deepEqual(one([{ type: "state", key: "x", operator: "exists", value: "" }, { type: "state", key: "y", operator: "not-exists", value: "" }]), { "data-state-class": "x&&!y=>block" });
  assert.deepEqual(
    one([{ type: "state", key: "pdp:axis:{{item.axisName}}", operator: "equals", value: "{{item.label}}" }]),
    { "data-state-class": "pdp:axis:{{item.axisName}}={{item.label}}=>block" },
  );
  assert.deepEqual(one([{ type: "state", key: "gp:score", operator: "equals", value: "4" }, { type: "state", key: "gp:score", operator: "equals", value: "5" }], "any"), { "data-state-class": "gp:score=4||gp:score=5=>block" });
});

test("stateModifiers: a binding with no mapping is counted as a state-modifier report, not dropped silently", () => {
  const reports = new Set<string>();
  const ctx = { renderingNodeId: "c1", nodes: { c1: { type: "Container" }, ROOT: { props: {} } }, reports } as any;
  // contains has no test() operator
  assert.deepEqual(
    stateClassAttr({ stateModifiers: [{ conditions: [{ logic: "all", conditions: [{ type: "state", key: "x", operator: "contains", value: "a" }] }], modifiers: ["shown-flex"] }] }, ctx),
    {},
  );
  assert.deepEqual([...reports], ["state-modifier"]);
});

test("stateModifiers: a row condition is decided by the engine; mixed with state it gates the entry", () => {
  const ctx = { renderingNodeId: "b1", nodes: { b1: { type: "Button" }, ROOT: { props: {} } } } as any;
  const row = { type: "item", key: "label", operator: "equals", value: "Sage" };
  const st = { type: "state", key: "pdp:v", operator: "not-exists", value: "" };
  const mod = (conditions: any[]) => ({ stateModifiers: [{ conditions: [{ logic: "all", conditions }], modifiers: ["disabled-look"] }] });
  const classes = "opacity-50 pointer-events-none";
  // A {% tag %} may not sit in an attribute value: each decision is captured BEFORE the element, the attribute holds `{{ var }}`.
  const only = stateModifiers(mod([row]), ctx);
  assert.deepEqual(only.attrs, {});
  assert.equal(only.classAdd, "{{ ph_mod_1 }}");
  assert.deepEqual(ctx.pre, [`{% capture ph_mod_1 %}{% if item.label == 'Sage' %} ${classes}{% endif %}{% endcapture %}`]);
  ctx.pre = [];
  const both = stateModifiers(mod([row, st]), ctx);
  assert.equal(both.classAdd, "");
  assert.deepEqual(both.attrs, { "data-state-class": "{{ ph_mod_2 }}" });
  assert.deepEqual(ctx.pre, [`{% capture ph_mod_2 %}{% if item.label == 'Sage' %}!pdp:v=>${classes}{% endif %}{% endcapture %}`]);
  // a mixed `any` group has no safe expression
  assert.deepEqual(stateClassAttr({ stateModifiers: [{ conditions: [{ logic: "any", conditions: [row, st] }], modifiers: ["disabled-look"] }] }, ctx), {});
});

test("auth customer.* keys read the customer; a logged-out visitor passes the negatives", () => {
  const one = (c: any) => conditionExpr([{ logic: "all", conditions: [{ type: "auth", ...c }] }]);
  assert.equal(one({ key: "customer.isMember", operator: "equals", value: "true" }), "customer.isMember == true");
  assert.equal(one({ key: "customer.isMember", operator: "not-equals", value: "true" }), "customer.isMember != true");
  assert.equal(one({ key: "customer.plans.pro", operator: "not-exists", value: "" }), "customer.plans.pro == blank");
  assert.equal(one({ key: "customer.plans.pro", operator: "exists", value: "" }), "customer.plans.pro != blank");
  assert.equal(one({ key: "status", operator: "not-equals", value: "logged-out" }), "customer");
});
