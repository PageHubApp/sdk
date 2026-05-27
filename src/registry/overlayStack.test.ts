/**
 * Tests for the editor overlay stack + `ph.overlay.dismissTop` integration.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  _resetOverlayStackForTests,
  dismissTopOverlay,
  getOverlayDepth,
  getTopOverlayId,
  popOverlay,
  pushOverlay,
  subscribeOverlayStack,
} from "./overlayStack";
import { createCommandsRegistry } from "./commands";
import { createContextRegistry } from "./context";
import { BUILTIN_COMMANDS } from "./builtins/commands";

test("overlayStack: push / pop maintains LIFO order", () => {
  _resetOverlayStackForTests();
  pushOverlay({ id: "a", dismiss: () => {} });
  pushOverlay({ id: "b", dismiss: () => {} });
  pushOverlay({ id: "c", dismiss: () => {} });
  assert.equal(getOverlayDepth(), 3);
  assert.equal(getTopOverlayId(), "c");
  popOverlay("c");
  assert.equal(getTopOverlayId(), "b");
  popOverlay("a");
  assert.equal(getOverlayDepth(), 1);
  assert.equal(getTopOverlayId(), "b");
  _resetOverlayStackForTests();
});

test("overlayStack: re-pushing same id moves it to the top", () => {
  _resetOverlayStackForTests();
  pushOverlay({ id: "a", dismiss: () => {} });
  pushOverlay({ id: "b", dismiss: () => {} });
  pushOverlay({ id: "a", dismiss: () => {} });
  assert.equal(getOverlayDepth(), 2, "re-push deduplicates");
  assert.equal(getTopOverlayId(), "a");
  _resetOverlayStackForTests();
});

test("overlayStack: dismissTopOverlay pops + invokes callback", () => {
  _resetOverlayStackForTests();
  let dismissed: string[] = [];
  pushOverlay({ id: "outer", dismiss: () => dismissed.push("outer") });
  pushOverlay({ id: "inner", dismiss: () => dismissed.push("inner") });
  const ok = dismissTopOverlay();
  assert.equal(ok, true);
  assert.deepEqual(dismissed, ["inner"], "top dismiss fires");
  assert.equal(getTopOverlayId(), "outer", "outer remains");
  dismissTopOverlay();
  assert.deepEqual(dismissed, ["inner", "outer"]);
  assert.equal(dismissTopOverlay(), false, "empty stack returns false");
  _resetOverlayStackForTests();
});

test("overlayStack: subscribe fires on push / pop / dismiss", () => {
  _resetOverlayStackForTests();
  let calls = 0;
  const unsub = subscribeOverlayStack(() => calls++);
  pushOverlay({ id: "a", dismiss: () => {} });
  pushOverlay({ id: "b", dismiss: () => {} });
  popOverlay("a");
  dismissTopOverlay();
  assert.equal(calls, 4);
  unsub();
  pushOverlay({ id: "c", dismiss: () => {} });
  assert.equal(calls, 4, "no fire after unsubscribe");
  _resetOverlayStackForTests();
});

test("ph.overlay.dismissTop: not stubbed", () => {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  for (const def of BUILTIN_COMMANDS) commands.register(def);
  const cmd = commands.get("ph.overlay.dismissTop");
  assert.ok(cmd, "command exists");
  assert.equal(cmd?.stub, false, "stub flag cleared");
});

test("ph.overlay.dismissTop: when-clause gated on stackDepth", async () => {
  _resetOverlayStackForTests();
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  for (const def of BUILTIN_COMMANDS) commands.register(def);

  // Stack empty → when() returns false.
  context.setCommandContext({ overlay: { stackDepth: 0, topId: null } });
  const def = commands.get("ph.overlay.dismissTop")!;
  assert.equal(def.when?.(context.getSnapshot()), false);

  // Stack populated → when() returns true.
  context.setCommandContext({ overlay: { stackDepth: 1, topId: "x" } });
  assert.equal(def.when?.(context.getSnapshot()), true);
  _resetOverlayStackForTests();
});

test("ph.overlay.dismissTop: run pops the top entry", async () => {
  _resetOverlayStackForTests();
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  for (const def of BUILTIN_COMMANDS) commands.register(def);

  let dismissed = false;
  pushOverlay({ id: "modal-1", dismiss: () => (dismissed = true) });
  // when() reads from snapshot — bump it to match the stack.
  context.setCommandContext({ overlay: { stackDepth: 1, topId: "modal-1" } });
  await commands.execute("ph.overlay.dismissTop");
  assert.equal(dismissed, true);
  assert.equal(getOverlayDepth(), 0);
  _resetOverlayStackForTests();
});
