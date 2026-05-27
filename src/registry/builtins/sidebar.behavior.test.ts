/**
 * Behavior tests for `ph.sidebar.search` (⌘F) + the mouseOverTracker.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createContextRegistry } from "../context";
import { createCommandsRegistry } from "../commands";
import { BUILTIN_COMMANDS } from "./commands";
import { setSidebarBackref } from "../sidebarBackref";
import { mountMouseOverTracker } from "../mouseOverTracker";

function makeRegistries() {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  for (const def of BUILTIN_COMMANDS) commands.register(def);
  return { context, commands };
}

test("ph.sidebar.search: fires backref when mouseOver = sidebar", async () => {
  const { context, commands } = makeRegistries();
  let calls = 0;
  setSidebarBackref({
    toggleSearch: () => {
      calls++;
    },
  });

  // Not over sidebar → no-op
  await commands.execute("ph.sidebar.search");
  assert.equal(calls, 0);

  context.set("mouseOver", "sidebar");
  await commands.execute("ph.sidebar.search");
  assert.equal(calls, 1);

  setSidebarBackref(null);
});

test("ph.sidebar.search: focusInSidebar=true also satisfies when-clause", async () => {
  const { context, commands } = makeRegistries();
  let calls = 0;
  setSidebarBackref({
    toggleSearch: () => {
      calls++;
    },
  });
  context.set("mouseOver", "canvas");
  context.set("focusInSidebar", true);
  await commands.execute("ph.sidebar.search");
  assert.equal(calls, 1);
  setSidebarBackref(null);
});

test("ph.sidebar.search: not stubbed", () => {
  const { commands } = makeRegistries();
  assert.equal(commands.get("ph.sidebar.search")?.stub, false);
});

// ─── mouseOverTracker ───────────────────────────────────────────────────

function fakeElement(id: string) {
  const listeners: Record<string, EventListener[]> = {};
  const el = {
    id,
    addEventListener(type: string, fn: EventListener) {
      (listeners[type] ||= []).push(fn);
    },
    removeEventListener(type: string, fn: EventListener) {
      const arr = listeners[type];
      if (!arr) return;
      const idx = arr.indexOf(fn);
      if (idx >= 0) arr.splice(idx, 1);
    },
    fire(type: string) {
      (listeners[type] || []).forEach(f => f({} as Event));
    },
  };
  return el;
}

test("mountMouseOverTracker: publishes mouseOver as regions enter/leave", () => {
  const viewport = fakeElement("viewport");
  const toolbar = fakeElement("toolbar");
  const doc = {
    querySelector(sel: string) {
      if (sel === "#viewport") return viewport;
      if (sel === "#toolbar") return toolbar;
      return null;
    },
  } as unknown as Document;

  const context = createContextRegistry();
  const unmount = mountMouseOverTracker({ context, doc });

  assert.equal(context.getSnapshot().mouseOver, null, "initial null");

  viewport.fire("mouseenter");
  assert.equal(context.getSnapshot().mouseOver, "canvas");

  toolbar.fire("mouseenter");
  assert.equal(context.getSnapshot().mouseOver, "sidebar", "last entered wins");

  toolbar.fire("mouseleave");
  assert.equal(context.getSnapshot().mouseOver, "canvas", "falls back to next on stack");

  viewport.fire("mouseleave");
  assert.equal(context.getSnapshot().mouseOver, null);

  unmount();
});

test("mountMouseOverTracker: unmount clears subscriptions + resets context", () => {
  const viewport = fakeElement("viewport");
  const doc = {
    querySelector: (sel: string) => (sel === "#viewport" ? viewport : null),
  } as unknown as Document;
  const context = createContextRegistry();
  const unmount = mountMouseOverTracker({ context, doc });
  viewport.fire("mouseenter");
  assert.equal(context.getSnapshot().mouseOver, "canvas");
  unmount();
  assert.equal(context.getSnapshot().mouseOver, null, "unmount clears");
  // After unmount, fire shouldn't update context.
  viewport.fire("mouseenter");
  assert.equal(context.getSnapshot().mouseOver, null);
});
