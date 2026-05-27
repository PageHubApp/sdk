/**
 * Behavior tests for `ph.sections.toggleQuickLook` Space-key migration.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createContextRegistry } from "../context";
import { createCommandsRegistry } from "../commands";
import { BUILTIN_COMMANDS } from "./commands";
import { setSectionsBackref } from "../sectionsBackref";

function makeRegistries() {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  for (const def of BUILTIN_COMMANDS) commands.register(def);
  return { context, commands };
}

test("ph.sections.toggleQuickLook: fires only when modal open + block hovered", async () => {
  const { context, commands } = makeRegistries();
  let calls = 0;
  setSectionsBackref({
    toggleQuickLook: () => {
      calls++;
    },
  });

  // modal closed → no-op
  await commands.execute("ph.sections.toggleQuickLook");
  assert.equal(calls, 0);

  // modal open, no hover → no-op
  context.set("sections.modalOpen", true);
  context.set("sections.hoveredBlock", null);
  await commands.execute("ph.sections.toggleQuickLook");
  assert.equal(calls, 0);

  // modal open, hover present → fires
  context.set("sections.hoveredBlock", "hero/some-block");
  await commands.execute("ph.sections.toggleQuickLook");
  assert.equal(calls, 1);

  setSectionsBackref(null);
});

test("ph.sections.toggleQuickLook: not stubbed", () => {
  const { commands } = makeRegistries();
  assert.equal(commands.get("ph.sections.toggleQuickLook")?.stub, false);
});
