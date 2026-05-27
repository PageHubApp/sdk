import test from "node:test";
import assert from "node:assert/strict";
import { createKeybindingsRegistry, parseKey } from "./keybindings";
import { createContextRegistry } from "./context";

function fakeEvent(opts: {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}): KeyboardEvent {
  return {
    key: opts.key,
    metaKey: !!opts.meta,
    ctrlKey: !!opts.ctrl,
    shiftKey: !!opts.shift,
    altKey: !!opts.alt,
  } as KeyboardEvent;
}

function setup() {
  const context = createContextRegistry();
  const kb = createKeybindingsRegistry({ context });
  return { context, kb };
}

test("parseKey: cmd+shift+m", () => {
  const p = parseKey("cmd+shift+m");
  assert.equal(p.meta, true);
  assert.equal(p.shift, true);
  assert.equal(p.key, "m");
});

test("parseKey: mod+z (cmd OR ctrl)", () => {
  const p = parseKey("mod+z");
  assert.equal(p.mod, true);
  assert.equal(p.key, "z");
});

test("parseKey: escape / backspace / tab aliases", () => {
  assert.equal(parseKey("escape").key, "Escape");
  assert.equal(parseKey("backspace").key, "Backspace");
  assert.equal(parseKey("tab").key, "Tab");
  assert.equal(parseKey("space").key, " ");
});

test("keybindings: register + match returns binding for matching event", () => {
  const { kb } = setup();
  kb.register({ command: "x", key: "mod+s" });
  const m = kb.match(fakeEvent({ key: "s", meta: true }));
  assert.ok(m);
  assert.equal(m!.command, "x");
});

test("keybindings: highest priority wins", () => {
  const { kb } = setup();
  kb.register({ command: "low", key: "mod+s", priority: 0 });
  kb.register({ command: "high", key: "mod+s", priority: 50 });
  kb.register({ command: "mid", key: "mod+s", priority: 10 });
  const m = kb.match(fakeEvent({ key: "s", meta: true }));
  assert.equal(m!.command, "high");
});

test("keybindings: when=false skips entry", () => {
  const { kb } = setup();
  kb.register({ command: "no", key: "mod+s", when: () => false, priority: 100 });
  kb.register({ command: "yes", key: "mod+s" });
  const m = kb.match(fakeEvent({ key: "s", meta: true }));
  assert.equal(m!.command, "yes");
});

test("keybindings: unregister by command id", () => {
  const { kb } = setup();
  kb.register({ command: "x", key: "mod+s" });
  kb.unregister("x");
  const m = kb.match(fakeEvent({ key: "s", meta: true }));
  assert.equal(m, null);
});

test("keybindings: mod matches either meta or ctrl", () => {
  const { kb } = setup();
  kb.register({ command: "x", key: "mod+z" });
  assert.ok(kb.match(fakeEvent({ key: "z", meta: true })));
  assert.ok(kb.match(fakeEvent({ key: "z", ctrl: true })));
  // Plain z with no modifier does not match.
  assert.equal(kb.match(fakeEvent({ key: "z" })), null);
});

test("keybindings: shift+mod+z matches with both modifiers", () => {
  const { kb } = setup();
  kb.register({ command: "redo", key: "shift+mod+z" });
  assert.ok(kb.match(fakeEvent({ key: "z", meta: true, shift: true })));
  // Without shift, should not match.
  assert.equal(kb.match(fakeEvent({ key: "z", meta: true })), null);
});

test("keybindings: case-insensitive letter match", () => {
  const { kb } = setup();
  kb.register({ command: "x", key: "mod+a" });
  assert.ok(kb.match(fakeEvent({ key: "A", meta: true })));
});

test("keybindings: Escape and Backspace match", () => {
  const { kb } = setup();
  kb.register({ command: "esc", key: "escape" });
  kb.register({ command: "bs", key: "backspace" });
  assert.equal(kb.match(fakeEvent({ key: "Escape" }))!.command, "esc");
  assert.equal(kb.match(fakeEvent({ key: "Backspace" }))!.command, "bs");
});

test("keybindings: list() returns a snapshot copy", () => {
  const { kb } = setup();
  kb.register({ command: "x", key: "mod+s" });
  const snap = kb.list();
  kb.unregister("x");
  // Snapshot copy is independent from internal list.
  assert.equal(snap.length, 1);
  assert.equal(kb.list().length, 0);
});
