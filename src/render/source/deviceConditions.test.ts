/**
 * `device` visibility conditions → responsive hide classes (conditions.ts `deviceGate`, nodeGate.ts). "Mobile" is the
 * old evaluator's `viewport < breakpoints.md`, which is the site's Tailwind `md:` boundary, so the class is exact.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { deviceGate, DEVICE_HIDE_CLASS } from "./conditions";
import { addRootClass, gateNode } from "./nodeGate";

const dev = (value: "mobile" | "desktop", operator = "equals") => ({ type: "device", key: "viewport", operator, value });
const url = { type: "url-param", key: "ref", operator: "equals", value: "x" };

test("mobile only → hidden from md up; desktop only → hidden below md", () => {
  assert.deepEqual(deviceGate([{ logic: "all", conditions: [dev("mobile")] }] as any), { hide: DEVICE_HIDE_CLASS.mobile, rest: true });
  assert.deepEqual(deviceGate([{ logic: "all", conditions: [dev("desktop")] }] as any), { hide: DEVICE_HIDE_CLASS.desktop, rest: true });
  assert.deepEqual(deviceGate([{ logic: "all", conditions: [dev("mobile", "not-equals")] }] as any), { hide: DEVICE_HIDE_CLASS.desktop, rest: true });
});

test("no device condition: not this gate's job", () => {
  assert.equal(deviceGate([{ logic: "all", conditions: [url] }] as any), null);
  assert.equal(deviceGate(undefined), null);
});

test("device AND another condition: the class plus the remaining gate", () => {
  assert.deepEqual(deviceGate([{ logic: "all", conditions: [dev("mobile"), url] }] as any), {
    hide: DEVICE_HIDE_CLASS.mobile,
    rest: [{ logic: "all", conditions: [url] }],
  });
});

test("mobile OR desktop shows everywhere; mobile AND desktop nowhere", () => {
  assert.deepEqual(deviceGate([{ logic: "any", conditions: [dev("mobile"), dev("desktop")] }] as any), { hide: null, rest: true });
  assert.equal(deviceGate([{ logic: "all", conditions: [dev("mobile"), dev("desktop")] }] as any), "never");
});

test("phone always, wide screens only with another condition: one element can't say that, so it is reported", () => {
  assert.equal(deviceGate([{ logic: "any", conditions: [dev("mobile"), url] }] as any), null);
});

test("the class merges into the element's own class, or adds one", () => {
  assert.equal(addRootClass(`<div class="flex gap-2">x</div>`, "md:hidden"), `<div class="md:hidden flex gap-2">x</div>`);
  assert.equal(addRootClass(`<section id="a">x</section>`, "max-md:hidden"), `<section id="a" class="max-md:hidden">x</section>`);
  assert.equal(addRootClass(`<img src="a.png" />`, "md:hidden"), `<img src="a.png" class="md:hidden" />`);
  assert.equal(addRootClass(`{% for p in x %}<a>{{ p }}</a>{% endfor %}`, "md:hidden"), `<div class="contents md:hidden">{% for p in x %}<a>{{ p }}</a>{% endfor %}</div>`);
});

test("gateNode: a phone-only banner gated on a query param gets both the class and the {% if %}", () => {
  const props = { conditionGroups: [{ logic: "all", conditions: [dev("mobile"), url] }] };
  assert.equal(gateNode(props, `<div class="banner">Hi</div>`), `{% if request.query.ref == 'x' %}<div class="md:hidden banner">Hi</div>{% endif %}`);
  assert.equal(gateNode({ conditionGroups: [{ logic: "all", conditions: [dev("mobile"), dev("desktop")] }] }, `<p>x</p>`), "");
  assert.equal(gateNode({}, `<p>x</p>`), `<p>x</p>`);
});
