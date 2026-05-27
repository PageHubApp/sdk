import test from "node:test";
import assert from "node:assert/strict";
import { createSlotsRegistry } from "./slots";
import { createContextRegistry } from "./context";
import { applyEditorChromeSlotsShim, FIELD_TO_SLOT } from "./adapter";
import { BUILTIN_SLOTS } from "./builtins/slots";

function setup() {
  const context = createContextRegistry();
  const slots = createSlotsRegistry({ context });
  for (const def of BUILTIN_SLOTS) slots.register(def);
  return { context, slots };
}

test("adapter: every FIELD_TO_SLOT id is a registered builtin slot", () => {
  const ids = new Set(BUILTIN_SLOTS.map(d => d.id));
  for (const slotId of Object.values(FIELD_TO_SLOT)) {
    assert.ok(ids.has(slotId), `slot ${slotId} not in BUILTIN_SLOTS`);
  }
});

test("adapter: missing fields are a noop", () => {
  const { slots } = setup();
  applyEditorChromeSlotsShim(undefined, slots);
  applyEditorChromeSlotsShim({}, slots);
  // Every slot resolves to nothing.
  for (const def of BUILTIN_SLOTS) {
    assert.deepEqual(slots.resolve(def.id), []);
  }
});

test("adapter: each render* field translates to the right slot id", () => {
  const { slots } = setup();
  const sentinels: Record<string, string> = {};
  const slotsField: Record<string, any> = {};
  for (const [field, slotId] of Object.entries(FIELD_TO_SLOT)) {
    const tag = `R:${field}`;
    sentinels[slotId] = tag;
    slotsField[field] = () => tag;
  }
  applyEditorChromeSlotsShim(slotsField, slots);
  for (const [slotId, expected] of Object.entries(sentinels)) {
    const resolved = slots.resolve(slotId);
    assert.equal(resolved.length, 1, `slot ${slotId} should have 1 contribution`);
    assert.equal(resolved[0]!.render(undefined), expected, `slot ${slotId} render`);
  }
});

test("adapter: settingsAiButton ReactNode is wrapped into a render fn", () => {
  const { slots } = setup();
  const node = { type: "fake-react-node" } as unknown;
  applyEditorChromeSlotsShim({ settingsAiButton: node as any }, slots);
  const resolved = slots.resolve("settings/ai-button");
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0]!.render(undefined), node);
});

test("adapter: pageSettingsExtraTabs becomes N list contributions", () => {
  const { slots } = setup();
  const tabs = [
    { key: "a", label: "A", order: 10, render: () => null },
    { key: "b", label: "B", order: 5, render: () => null },
    { key: "c", label: "C", render: () => null }, // no order -> idx (2)
  ];
  applyEditorChromeSlotsShim({ pageSettingsExtraTabs: tabs as any }, slots);
  const resolved = slots.resolve("page-settings/extra-tabs");
  assert.equal(resolved.length, 3);
  // Sorted by group@order ascending: C(2 from idx) < B(5) < A(10).
  const labels = resolved.map(
    r => (r.render(undefined) as unknown as { label: string }).label
  );
  assert.deepEqual(labels, ["C", "B", "A"]);
});

test("adapter: contributions carry shim key", () => {
  const { slots } = setup();
  applyEditorChromeSlotsShim(
    { renderToolboxAiButton: () => "x" } as any,
    slots
  );
  const resolved = slots.resolve("toolbox/ai-button");
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0]!.key, "editorChromeSlots:renderToolboxAiButton");
});

test("adapter: applying shim twice accumulates contributions (single picks one)", () => {
  const { slots } = setup();
  applyEditorChromeSlotsShim({ renderToolboxAiButton: () => "first" } as any, slots);
  applyEditorChromeSlotsShim({ renderToolboxAiButton: () => "second" } as any, slots);
  const resolved = slots.resolve("toolbox/ai-button");
  // Single-cardinality, last contribution wins on priority tie.
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0]!.render(undefined), "second");
});
