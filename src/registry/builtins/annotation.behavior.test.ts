/**
 * Behavior tests for the canvas annotation Backspace/Delete migration —
 * Phase 3.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createContextRegistry } from "../context";
import { createCommandsRegistry } from "../commands";
import { BUILTIN_COMMANDS } from "./commands";
import { setAnnotationBackref } from "../annotationBackref";

function makeRegistries() {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  for (const def of BUILTIN_COMMANDS) commands.register(def);
  return { context, commands };
}

test("ph.annotation.delete: fires backref when annotation selected and not editing", async () => {
  const { context, commands } = makeRegistries();
  let calls = 0;
  setAnnotationBackref({
    deleteSelected: () => {
      calls++;
    },
  });
  context.set("annotation.selectedId", "ann-1");
  context.set("annotation.editingId", null);
  await commands.execute("ph.annotation.delete");
  assert.equal(calls, 1);
  setAnnotationBackref(null);
});

test("ph.annotation.delete: blocked while editingId set", async () => {
  const { context, commands } = makeRegistries();
  let calls = 0;
  setAnnotationBackref({
    deleteSelected: () => {
      calls++;
    },
  });
  context.set("annotation.selectedId", "ann-1");
  context.set("annotation.editingId", "ann-1");
  await commands.execute("ph.annotation.delete");
  assert.equal(calls, 0);
  setAnnotationBackref(null);
});

test("ph.annotation.delete: not stubbed", () => {
  const { commands } = makeRegistries();
  assert.equal(commands.get("ph.annotation.delete")?.stub, false);
});
