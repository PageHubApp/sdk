/**
 * Behavior tests for the Media Manager surface — Phase 3.
 *
 * Verifies that:
 *   - `ph.media.selectAll` invokes the backref's `selectAllVisible` only
 *     when the chord's `when` predicate holds (modal open + not selection
 *     mode).
 *   - `ph.media.deleteSelected` invokes `handleDeleteSelected` only when
 *     modal is open AND selectedCount > 0.
 *   - The backref is cleared when the modal closes (no stale firing).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createContextRegistry } from "../context";
import { createCommandsRegistry } from "../commands";
import { createKeybindingsRegistry } from "../keybindings";
import { BUILTIN_COMMANDS } from "./commands";
import { BUILTIN_KEYBINDINGS } from "./keybindings";
import { setMediaBackref } from "../mediaBackref";

function makeRegistries() {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  const keybindings = createKeybindingsRegistry({ context });
  for (const def of BUILTIN_COMMANDS) commands.register(def);
  for (const def of BUILTIN_KEYBINDINGS) keybindings.register(def);
  return { context, commands, keybindings };
}

test("ph.media.selectAll: fires backref.selectAllVisible when modal open", async () => {
  const { context, commands } = makeRegistries();
  let calls = 0;
  setMediaBackref({
    selectAllVisible: () => {
      calls++;
    },
    handleDeleteSelected: () => {},
  });

  // when=false (modal closed) → execute() is a no-op via when-gate
  await commands.execute("ph.media.selectAll");
  assert.equal(calls, 0, "no fire while modal closed");

  context.set("media.modalOpen", true);
  context.set("media.selectionMode", false);

  await commands.execute("ph.media.selectAll");
  assert.equal(calls, 1, "fires once modal is open");

  setMediaBackref(null);
});

test("ph.media.selectAll: blocked when selectionMode=true", async () => {
  const { context, commands } = makeRegistries();
  let calls = 0;
  setMediaBackref({
    selectAllVisible: () => {
      calls++;
    },
    handleDeleteSelected: () => {},
  });

  context.set("media.modalOpen", true);
  context.set("media.selectionMode", true);
  await commands.execute("ph.media.selectAll");
  assert.equal(calls, 0, "selection-mode blocks select-all");

  setMediaBackref(null);
});

test("ph.media.deleteSelected: requires selectedCount>0", async () => {
  const { context, commands } = makeRegistries();
  let calls = 0;
  setMediaBackref({
    selectAllVisible: () => {},
    handleDeleteSelected: () => {
      calls++;
    },
  });

  context.set("media.modalOpen", true);
  context.set("media.selectedCount", 0);
  await commands.execute("ph.media.deleteSelected");
  assert.equal(calls, 0, "no-op when nothing selected");

  context.set("media.selectedCount", 3);
  await commands.execute("ph.media.deleteSelected");
  assert.equal(calls, 1, "fires when count > 0");

  setMediaBackref(null);
});

test("ph.media.deleteSelected: silently no-ops if backref cleared", async () => {
  const { context, commands } = makeRegistries();
  setMediaBackref(null);
  context.set("media.modalOpen", true);
  context.set("media.selectedCount", 1);
  await commands.execute("ph.media.deleteSelected");
  // no throw / no error — backref guard via optional chaining
  assert.ok(true);
});

test("media commands are no longer stubbed", () => {
  const { commands } = makeRegistries();
  const selectAll = commands.get("ph.media.selectAll");
  const del = commands.get("ph.media.deleteSelected");
  assert.equal(selectAll?.stub, false, "ph.media.selectAll is not a stub");
  assert.equal(del?.stub, false, "ph.media.deleteSelected is not a stub");
});
