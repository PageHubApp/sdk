/**
 * Behavior tests for `ph.sidebar.search` (⌘F) + the mouseOverTracker.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createContextRegistry } from "../context";
import { createHeadlessCommandsRegistry } from "../commands.test-helpers";
import { BUILTIN_COMMANDS } from "./commands";
import { setSidebarBackref } from "../sidebarBackref";
import { mountMouseOverTracker } from "../mouseOverTracker";

function makeRegistries() {
  const context = createContextRegistry();
  const commands = createHeadlessCommandsRegistry({ context });
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

/** An element whose `closest` / `matches` answer for the given selectors. */
function fakeElement(selectors: string[], parent: FakeEl | null = null): FakeEl {
  const el: FakeEl = {
    matches: (sel: string) => sel.split(",").some(s => selectors.includes(s.trim())),
    closest: (sel: string) => {
      for (let cur: FakeEl | null = el; cur; cur = cur.parent) if (cur.matches(sel)) return cur;
      return null;
    },
    parent,
  };
  return el;
}
type FakeEl = {
  matches: (sel: string) => boolean;
  closest: (sel: string) => FakeEl | null;
  parent: FakeEl | null;
};

function fakeDoc() {
  const listeners: Record<string, Array<(e: unknown) => void>> = {};
  return {
    addEventListener(type: string, fn: (e: unknown) => void) {
      (listeners[type] ||= []).push(fn);
    },
    removeEventListener(type: string, fn: (e: unknown) => void) {
      listeners[type] = (listeners[type] || []).filter(f => f !== fn);
    },
    fire(type: string, e: unknown) {
      (listeners[type] || []).forEach(f => f(e));
    },
  };
}

test("mountMouseOverTracker: publishes the innermost region under the cursor", () => {
  const doc = fakeDoc();
  const viewport = fakeElement(["#viewport"]);
  const inCanvas = fakeElement([], viewport);
  const toolbar = fakeElement(["#toolbar"]);
  const panelFrame = fakeElement(["[data-ph-panel]"]);
  const inPanel = fakeElement([], panelFrame);
  const modalInPanel = fakeElement(['[data-ph-region="modal"]'], panelFrame);
  const outside = fakeElement([]);

  const context = createContextRegistry();
  const unmount = mountMouseOverTracker({ context, doc: doc as unknown as Document });
  assert.equal(context.getSnapshot().mouseOver, null, "initial null");

  doc.fire("mouseover", { target: inCanvas });
  assert.equal(context.getSnapshot().mouseOver, "canvas");

  doc.fire("mouseover", { target: toolbar });
  assert.equal(context.getSnapshot().mouseOver, "sidebar");

  doc.fire("mouseover", { target: inPanel });
  assert.equal(context.getSnapshot().mouseOver, "sidebar", "a host panel frame is the sidebar");

  doc.fire("mouseover", { target: modalInPanel });
  assert.equal(context.getSnapshot().mouseOver, "modal", "innermost wins");

  doc.fire("mouseover", { target: outside });
  assert.equal(context.getSnapshot().mouseOver, null);

  doc.fire("mouseover", { target: inCanvas });
  doc.fire("mouseout", { target: inCanvas, relatedTarget: null });
  assert.equal(context.getSnapshot().mouseOver, null, "leaving the window clears");

  unmount();
});

test("mountMouseOverTracker: unmount clears subscriptions + resets context", () => {
  const doc = fakeDoc();
  const viewport = fakeElement(["#viewport"]);
  const context = createContextRegistry();
  const unmount = mountMouseOverTracker({ context, doc: doc as unknown as Document });
  doc.fire("mouseover", { target: viewport });
  assert.equal(context.getSnapshot().mouseOver, "canvas");
  unmount();
  assert.equal(context.getSnapshot().mouseOver, null, "unmount clears");
  doc.fire("mouseover", { target: viewport });
  assert.equal(context.getSnapshot().mouseOver, null);
});
