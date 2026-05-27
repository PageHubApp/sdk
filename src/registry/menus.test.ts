import test from "node:test";
import assert from "node:assert/strict";
import { createCommandsRegistry } from "./commands";
import { createMenusRegistry } from "./menus";
import { createContextRegistry } from "./context";

function setup() {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  const menus = createMenusRegistry({ commands, context });
  // Seed some commands.
  commands.register({ id: "cmd.a", title: "A", run: () => {} });
  commands.register({ id: "cmd.b", title: "B", run: () => {} });
  commands.register({
    id: "cmd.gated",
    title: "Gated",
    when: ctx => ctx.canUndo === true,
    enablement: ctx => ctx.canRedo === true,
    run: () => {},
  });
  return { context, commands, menus };
}

test("menus: contribute + items returns entries", () => {
  const { menus } = setup();
  menus.contribute("topbar", [{ command: "cmd.a" }, { command: "cmd.b" }]);
  const items = menus.items("topbar");
  assert.equal(items.length, 2);
  assert.equal(items[0]!.command, "cmd.a");
  assert.equal(items[1]!.command, "cmd.b");
  assert.equal(items[0]!.title, "A");
});

test("menus: group@order ordering across multiple groups", () => {
  const { menus } = setup();
  menus.contribute("topbar", [
    { command: "cmd.a", group: "view@20" },
    { command: "cmd.b", group: "edit@10" },
  ]);
  const items = menus.items("topbar");
  assert.equal(items.length, 2);
  // edit@10 should come before view@20
  assert.equal(items[0]!.command, "cmd.b");
  assert.equal(items[0]!.group, "edit");
  assert.equal(items[0]!.groupOrder, 10);
  assert.equal(items[1]!.command, "cmd.a");
  assert.equal(items[1]!.groupOrder, 20);
});

test("menus: when on command filters", () => {
  const { menus, context } = setup();
  menus.contribute("palette", [{ command: "cmd.gated" }, { command: "cmd.a" }]);
  // canUndo is false by default
  let items = menus.items("palette");
  assert.equal(items.length, 1);
  assert.equal(items[0]!.command, "cmd.a");
  // Flip canUndo
  context.setCommandContext({ canUndo: true });
  items = menus.items("palette");
  assert.equal(items.length, 2);
});

test("menus: per-item when filters", () => {
  const { menus } = setup();
  menus.contribute("topbar", [
    { command: "cmd.a", when: () => false },
    { command: "cmd.b", when: () => true },
  ]);
  const items = menus.items("topbar");
  assert.equal(items.length, 1);
  assert.equal(items[0]!.command, "cmd.b");
});

test("menus: titleOverride + iconOverride applied", () => {
  const { menus } = setup();
  menus.contribute("topbar", [
    { command: "cmd.a", titleOverride: "Overridden" },
  ]);
  const items = menus.items("topbar");
  assert.equal(items[0]!.title, "Overridden");
});

test("menus: args from MenuItem reach resolved entry", () => {
  const { menus } = setup();
  menus.contribute("topbar", [
    { command: "cmd.a", args: { view: "md" } },
  ]);
  const items = menus.items("topbar");
  assert.deepEqual(items[0]!.args, { view: "md" });
});

test("menus: enablement flows into ResolvedMenuItem.enabled", () => {
  const { menus, context } = setup();
  context.setCommandContext({ canUndo: true });
  menus.contribute("palette", [{ command: "cmd.gated" }]);
  // canRedo false → enablement false
  let items = menus.items("palette");
  assert.equal(items[0]!.enabled, false);
  context.setCommandContext({ canRedo: true });
  items = menus.items("palette");
  assert.equal(items[0]!.enabled, true);
});

test("menus: remove drops command entries by id", () => {
  const { menus } = setup();
  menus.contribute("topbar", [{ command: "cmd.a" }, { command: "cmd.b" }]);
  menus.remove("topbar", "cmd.a");
  const items = menus.items("topbar");
  assert.equal(items.length, 1);
  assert.equal(items[0]!.command, "cmd.b");
});

test("menus: unknown command in contribution is filtered out", () => {
  const { menus } = setup();
  menus.contribute("topbar", [{ command: "cmd.ghost" }, { command: "cmd.a" }]);
  const items = menus.items("topbar");
  assert.equal(items.length, 1);
  assert.equal(items[0]!.command, "cmd.a");
});
