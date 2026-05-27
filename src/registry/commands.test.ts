import test from "node:test";
import assert from "node:assert/strict";
import { createCommandsRegistry } from "./commands";
import { createContextRegistry } from "./context";
import type { CommandDef } from "./types";

function setup() {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  return { context, commands };
}

test("commands: register + get + list", () => {
  const { commands } = setup();
  const def: CommandDef = { id: "x.test", title: "Test", run: () => {} };
  commands.register(def);
  assert.equal(commands.get("x.test"), def);
  assert.equal(commands.list().length, 1);
});

test("commands: duplicate id throws", () => {
  const { commands } = setup();
  commands.register({ id: "dup", title: "A", run: () => {} });
  assert.throws(() => commands.register({ id: "dup", title: "B", run: () => {} }));
});

test("commands: unregister removes from map", () => {
  const { commands } = setup();
  commands.register({ id: "rm", title: "T", run: () => {} });
  commands.unregister("rm");
  assert.equal(commands.get("rm"), undefined);
  assert.equal(commands.list().length, 0);
});

test("commands: execute calls run with ctx + args", async () => {
  const { commands } = setup();
  let captured: { ctx: any; args: any } | null = null;
  commands.register({
    id: "e",
    title: "E",
    run: (ctx, args) => {
      captured = { ctx, args };
    },
  });
  await commands.execute("e", { foo: 1 }, { trigger: "menu" });
  assert.ok(captured);
  assert.equal((captured as any).args.foo, 1);
  assert.equal((captured as any).ctx.trigger, "menu");
  // includes the base context snapshot
  assert.ok((captured as any).ctx.selection);
});

test("commands: when=false prevents execute", async () => {
  const { commands } = setup();
  let ran = false;
  commands.register({
    id: "gated",
    title: "Gated",
    when: () => false,
    run: () => {
      ran = true;
    },
  });
  await commands.execute("gated");
  assert.equal(ran, false);
});

test("commands: enablement=false is observable in isEnabled but not in list()", () => {
  const { commands } = setup();
  commands.register({
    id: "dis",
    title: "Dis",
    enablement: () => false,
    run: () => {},
  });
  assert.equal(commands.list().length, 1);
  assert.equal(commands.isVisible("dis"), true);
  assert.equal(commands.isEnabled("dis"), false);
});

test("commands: enablement=false also prevents execute", async () => {
  const { commands } = setup();
  let ran = false;
  commands.register({
    id: "noexec",
    title: "N",
    enablement: () => false,
    run: () => {
      ran = true;
    },
  });
  await commands.execute("noexec");
  assert.equal(ran, false);
});

test("commands: subscribe notified on register/unregister", () => {
  const { commands } = setup();
  let calls = 0;
  const unsub = commands.subscribe(() => calls++);
  commands.register({ id: "a", title: "A", run: () => {} });
  assert.equal(calls, 1);
  commands.unregister("a");
  assert.equal(calls, 2);
  unsub();
  commands.register({ id: "b", title: "B", run: () => {} });
  assert.equal(calls, 2);
});

test("commands: execute on missing id is a noop (warns)", async () => {
  const { commands } = setup();
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    await commands.execute("nope");
  } finally {
    console.warn = origWarn;
  }
});

test("commands: register without run throws", () => {
  const { commands } = setup();
  assert.throws(() =>
    commands.register({ id: "bad", title: "B" } as unknown as CommandDef)
  );
});
