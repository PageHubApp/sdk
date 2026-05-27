import test from "node:test";
import assert from "node:assert/strict";
import { createSlotsRegistry } from "./slots";
import { createContextRegistry } from "./context";

function setup() {
  const context = createContextRegistry();
  const slots = createSlotsRegistry({ context });
  slots.register({ id: "single", cardinality: "single" });
  slots.register({ id: "many", cardinality: "list" });
  return { context, slots };
}

test("slots: register + getDef", () => {
  const { slots } = setup();
  const def = slots.getDef("single");
  assert.ok(def);
  assert.equal(def!.cardinality, "single");
});

test("slots: contribute to undefined slot throws", () => {
  const { slots } = setup();
  assert.throws(() =>
    slots.contribute({ slot: "nope", render: () => "x" as unknown as null })
  );
});

test("slots: single — highest priority wins", () => {
  const { slots } = setup();
  slots.contribute({ slot: "single", render: () => "low", priority: 0 });
  slots.contribute({ slot: "single", render: () => "high", priority: 10 });
  slots.contribute({ slot: "single", render: () => "mid", priority: 5 });
  const resolved = slots.resolve<unknown>("single");
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0]!.render(undefined), "high");
});

test("slots: single — tie broken by insertion order (later wins)", () => {
  const { slots } = setup();
  slots.contribute({ slot: "single", render: () => "first" });
  slots.contribute({ slot: "single", render: () => "second" });
  const resolved = slots.resolve("single");
  assert.equal(resolved[0]!.render(undefined), "second");
});

test("slots: list — sorted by group@order", () => {
  const { slots } = setup();
  slots.contribute({ slot: "many", render: () => "c", group: "g@20" });
  slots.contribute({ slot: "many", render: () => "a", group: "g@5" });
  slots.contribute({ slot: "many", render: () => "b", group: "g@10" });
  const resolved = slots.resolve("many");
  assert.equal(resolved.length, 3);
  assert.equal(resolved[0]!.render(undefined), "a");
  assert.equal(resolved[1]!.render(undefined), "b");
  assert.equal(resolved[2]!.render(undefined), "c");
});

test("slots: when() filters", () => {
  const { slots } = setup();
  slots.contribute({
    slot: "single",
    render: () => "yes",
    when: () => true,
  });
  slots.contribute({
    slot: "single",
    render: () => "no",
    when: () => false,
    priority: 100,
  });
  const resolved = slots.resolve("single");
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0]!.render(undefined), "yes");
});

test("slots: remove all by slot id", () => {
  const { slots } = setup();
  slots.contribute({ slot: "many", render: () => "a" });
  slots.contribute({ slot: "many", render: () => "b" });
  slots.remove("many");
  assert.equal(slots.resolve("many").length, 0);
});

test("slots: remove by key", () => {
  const { slots } = setup();
  slots.contribute({ slot: "many", render: () => "a", key: "k1" });
  slots.contribute({ slot: "many", render: () => "b", key: "k2" });
  slots.remove("many", "k1");
  const resolved = slots.resolve("many");
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0]!.render(undefined), "b");
});

test("slots: resolve on unregistered slot returns empty array", () => {
  const { slots } = setup();
  assert.deepEqual(slots.resolve("missing"), []);
});

test("slots: subscribe fires on contribute / remove", () => {
  const { slots } = setup();
  let count = 0;
  const unsub = slots.subscribe(() => count++);
  slots.contribute({ slot: "single", render: () => "x" });
  assert.equal(count, 1);
  slots.remove("single");
  assert.equal(count, 2);
  unsub();
});
