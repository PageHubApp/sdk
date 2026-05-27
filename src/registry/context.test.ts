import test from "node:test";
import assert from "node:assert/strict";
import { createContextRegistry } from "./context";

test("context: default snapshot has expected shape", () => {
  const ctx = createContextRegistry();
  const s = ctx.getSnapshot();
  assert.equal(s.selection.id, null);
  assert.equal(s.canUndo, false);
  assert.equal(s.canRedo, false);
  assert.equal(s.mode, "editor");
  assert.equal(s.viewMode, "page");
  assert.equal(s.tiptap.active, false);
  assert.equal(s.overlay.stackDepth, 0);
});

test("context: setCommandContext merges fields", () => {
  const ctx = createContextRegistry();
  ctx.setCommandContext({ canUndo: true, mode: "preview" });
  const s = ctx.getSnapshot();
  assert.equal(s.canUndo, true);
  assert.equal(s.mode, "preview");
  // untouched fields preserved
  assert.equal(s.canRedo, false);
});

test("context: set/unset host keys", () => {
  const ctx = createContextRegistry();
  ctx.set("media.modalOpen", true);
  assert.equal(ctx.getSnapshot()["media.modalOpen"], true);
  ctx.unset("media.modalOpen");
  assert.equal(ctx.getSnapshot()["media.modalOpen"], undefined);
});

test("context: subscribe fires on update", () => {
  const ctx = createContextRegistry();
  let count = 0;
  const unsub = ctx.subscribe(() => count++);
  ctx.setCommandContext({ canUndo: true });
  ctx.set("k", 1);
  ctx.unset("k");
  assert.equal(count, 3);
  unsub();
  ctx.setCommandContext({ canRedo: true });
  assert.equal(count, 3);
});

test("context: snapshot is immutable per tick", () => {
  const ctx = createContextRegistry();
  const a = ctx.getSnapshot();
  ctx.setCommandContext({ canUndo: true });
  const b = ctx.getSnapshot();
  assert.notEqual(a, b);
  assert.equal(a.canUndo, false);
  assert.equal(b.canUndo, true);
});
