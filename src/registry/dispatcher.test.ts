import test from "node:test";
import assert from "node:assert/strict";
import { createContextRegistry } from "./context";
import { createCommandsRegistry } from "./commands";
import { createKeybindingsRegistry } from "./keybindings";
import { mountKeybindingDispatcher } from "./dispatcher";
import type { CommandDef } from "./types";

/**
 * Minimal in-test Document fake — captures keydown listeners and forwards
 * events synchronously. Avoids jsdom; runs under plain tsx --test.
 */
function makeFakeDoc() {
  const listeners: Array<(e: KeyboardEvent) => void> = [];
  const doc = {
    addEventListener(type: string, fn: (e: KeyboardEvent) => void) {
      if (type === "keydown") listeners.push(fn);
    },
    removeEventListener(type: string, fn: (e: KeyboardEvent) => void) {
      if (type === "keydown") {
        const idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
      }
    },
    dispatch(e: KeyboardEvent) {
      for (const l of listeners.slice()) l(e);
    },
    listenerCount: () => listeners.length,
  };
  return doc;
}

function fakeEvent(opts: {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  target?: EventTarget | null;
}): KeyboardEvent {
  let prevented = false;
  let stopped = false;
  return {
    key: opts.key,
    metaKey: !!opts.meta,
    ctrlKey: !!opts.ctrl,
    shiftKey: !!opts.shift,
    altKey: !!opts.alt,
    target: opts.target ?? null,
    preventDefault() {
      prevented = true;
    },
    stopPropagation() {
      stopped = true;
    },
    get defaultPrevented() {
      return prevented;
    },
    get _stopped() {
      return stopped;
    },
  } as unknown as KeyboardEvent & { _stopped: boolean };
}

function plainTarget(): EventTarget {
  return {
    tagName: "DIV",
    isContentEditable: false,
    getAttribute: () => null,
    closest: () => null,
  } as unknown as EventTarget;
}

function inputTarget(): EventTarget {
  return {
    tagName: "INPUT",
    isContentEditable: false,
    getAttribute: () => null,
    closest: () => null,
  } as unknown as EventTarget;
}

function setup() {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  const keybindings = createKeybindingsRegistry({ context });
  const doc = makeFakeDoc();
  return { context, commands, keybindings, doc };
}

function makeCmd(id: string, opts: Partial<CommandDef> = {}): CommandDef {
  let calls = 0;
  const def: CommandDef = {
    id,
    title: id,
    ...opts,
    run: () => {
      calls++;
    },
  };
  // Attach the counter for assertions.
  (def as unknown as { _calls: () => number })._calls = () => calls;
  return def;
}

// ───────────────────────────────────────────────────────────────────────────

test("dispatcher: ⌘S matches and calls command.execute (real, non-stub)", async () => {
  const { commands, keybindings, context, doc } = setup();
  const cmd = makeCmd("editor.save");
  commands.register(cmd);
  keybindings.register({ command: "editor.save", key: "mod+s" });

  const unmount = mountKeybindingDispatcher({
    commands,
    keybindings,
    context,
    target: doc as unknown as Document,
  });

  const ev = fakeEvent({ key: "s", meta: true, target: plainTarget() });
  doc.dispatch(ev);

  // execute is async; wait one tick for microtask
  await Promise.resolve();
  await Promise.resolve();

  assert.equal((cmd as unknown as { _calls: () => number })._calls(), 1);
  assert.equal(ev.defaultPrevented, true);
  assert.equal((ev as unknown as { _stopped: boolean })._stopped, true);
  unmount();
});

test("dispatcher: stub:true skips preventDefault and stopPropagation", async () => {
  const { commands, keybindings, context, doc } = setup();
  commands.register(makeCmd("stub.cmd", { stub: true }));
  keybindings.register({ command: "stub.cmd", key: "mod+s" });

  const unmount = mountKeybindingDispatcher({
    commands,
    keybindings,
    context,
    target: doc as unknown as Document,
  });

  const ev = fakeEvent({ key: "s", meta: true, target: plainTarget() });
  doc.dispatch(ev);
  await Promise.resolve();

  assert.equal(ev.defaultPrevented, false);
  assert.equal((ev as unknown as { _stopped: boolean })._stopped, false);
  unmount();
});

test("dispatcher: ⌘Z matches mod+z", async () => {
  const { commands, keybindings, context, doc } = setup();
  const cmd = makeCmd("editor.undo");
  commands.register(cmd);
  keybindings.register({ command: "editor.undo", key: "mod+z" });

  const unmount = mountKeybindingDispatcher({
    commands,
    keybindings,
    context,
    target: doc as unknown as Document,
  });

  doc.dispatch(fakeEvent({ key: "z", meta: true, target: plainTarget() }));
  await Promise.resolve();
  await Promise.resolve();
  assert.equal((cmd as unknown as { _calls: () => number })._calls(), 1);
  unmount();
});

test("dispatcher: ⌘⇧M matches shift+mod+m", async () => {
  const { commands, keybindings, context, doc } = setup();
  const cmd = makeCmd("media.open");
  commands.register(cmd);
  keybindings.register({ command: "media.open", key: "shift+mod+m" });

  const unmount = mountKeybindingDispatcher({
    commands,
    keybindings,
    context,
    target: doc as unknown as Document,
  });

  doc.dispatch(
    fakeEvent({ key: "m", meta: true, shift: true, target: plainTarget() })
  );
  await Promise.resolve();
  await Promise.resolve();
  assert.equal((cmd as unknown as { _calls: () => number })._calls(), 1);
  unmount();
});

test("dispatcher: when:false skips binding", async () => {
  const { commands, keybindings, context, doc } = setup();
  const cmd = makeCmd("never.fire");
  commands.register(cmd);
  keybindings.register({
    command: "never.fire",
    key: "mod+s",
    when: () => false,
  });

  const unmount = mountKeybindingDispatcher({
    commands,
    keybindings,
    context,
    target: doc as unknown as Document,
  });

  const ev = fakeEvent({ key: "s", meta: true, target: plainTarget() });
  doc.dispatch(ev);
  await Promise.resolve();

  assert.equal((cmd as unknown as { _calls: () => number })._calls(), 0);
  assert.equal(ev.defaultPrevented, false);
  unmount();
});

test("dispatcher: text-editing surface skips canvas binding", async () => {
  const { commands, keybindings, context, doc } = setup();
  const cmd = makeCmd("canvas.backspace");
  commands.register(cmd);
  keybindings.register({ command: "canvas.backspace", key: "backspace" });

  const unmount = mountKeybindingDispatcher({
    commands,
    keybindings,
    context,
    target: doc as unknown as Document,
  });

  doc.dispatch(fakeEvent({ key: "Backspace", target: inputTarget() }));
  await Promise.resolve();

  assert.equal((cmd as unknown as { _calls: () => number })._calls(), 0);
  unmount();
});

test("dispatcher: ph.text.* command allowed inside text surface", async () => {
  const { commands, keybindings, context, doc } = setup();
  const cmd = makeCmd("ph.text.bold");
  commands.register(cmd);
  keybindings.register({ command: "ph.text.bold", key: "mod+b" });

  const unmount = mountKeybindingDispatcher({
    commands,
    keybindings,
    context,
    target: doc as unknown as Document,
  });

  doc.dispatch(fakeEvent({ key: "b", meta: true, target: inputTarget() }));
  await Promise.resolve();
  await Promise.resolve();

  assert.equal((cmd as unknown as { _calls: () => number })._calls(), 1);
  unmount();
});

test("dispatcher: higher priority wins on conflict", async () => {
  const { commands, keybindings, context, doc } = setup();
  const low = makeCmd("low");
  const high = makeCmd("high");
  commands.register(low);
  commands.register(high);
  keybindings.register({ command: "low", key: "mod+s", priority: 0 });
  keybindings.register({ command: "high", key: "mod+s", priority: 100 });

  const unmount = mountKeybindingDispatcher({
    commands,
    keybindings,
    context,
    target: doc as unknown as Document,
  });

  doc.dispatch(fakeEvent({ key: "s", meta: true, target: plainTarget() }));
  await Promise.resolve();
  await Promise.resolve();

  assert.equal((high as unknown as { _calls: () => number })._calls(), 1);
  assert.equal((low as unknown as { _calls: () => number })._calls(), 0);
  unmount();
});

test("dispatcher: trigger is 'keybinding' on execute", async () => {
  const { commands, keybindings, context, doc } = setup();
  let observedTrigger: string | undefined;
  commands.register({
    id: "trigger.probe",
    title: "probe",
    run: ctx => {
      observedTrigger = ctx.trigger;
    },
  });
  keybindings.register({ command: "trigger.probe", key: "mod+s" });

  const unmount = mountKeybindingDispatcher({
    commands,
    keybindings,
    context,
    target: doc as unknown as Document,
  });

  doc.dispatch(fakeEvent({ key: "s", meta: true, target: plainTarget() }));
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(observedTrigger, "keybinding");
  unmount();
});

test("dispatcher: unmount removes listener", () => {
  const { commands, keybindings, context, doc } = setup();
  const unmount = mountKeybindingDispatcher({
    commands,
    keybindings,
    context,
    target: doc as unknown as Document,
  });
  assert.equal(doc.listenerCount(), 1);
  unmount();
  assert.equal(doc.listenerCount(), 0);
});

test("dispatcher: no-ops when target is null (SSR)", () => {
  const { commands, keybindings, context } = setup();
  const unmount = mountKeybindingDispatcher({
    commands,
    keybindings,
    context,
    target: null,
  });
  // Should not throw and unmount should be callable.
  unmount();
  assert.ok(true);
});
