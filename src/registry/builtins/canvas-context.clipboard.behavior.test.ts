/**
 * Behavior tests for the canvas right-click context menu — class
 * clipboard (copy/paste classes). Split from
 * canvas-context.behavior.test.ts (R3 — file was 650 LOC).
 *
 * Covers:
 *   - copyClasses writes CANVAS_CLASS_CLIPBOARD into phStorage
 *   - pasteClasses applies className + activeModifiers to the selection
 */
import test from "node:test";
import assert from "node:assert/strict";
import { ROOT_NODE } from "@craftjs/utils";
import { setEditorBackref, clearEditorBackref } from "../editorBackref";
import {
  installFakeBrowser,
  uninstallFakeBrowser,
  buildFakeCraft,
  setupCommands,
} from "./canvas-context.test-helpers";

test("canvas/context: ph.node.copyClasses writes phStorage", async () => {
  installFakeBrowser();
  try {
    const fake = buildFakeCraft([
      {
        id: ROOT_NODE,
        data: { parent: null, isCanvas: true, props: {}, custom: {}, nodes: ["n1"] },
      },
      {
        id: "n1",
        data: {
          parent: ROOT_NODE,
          isCanvas: false,
          props: { className: "btn btn-primary", root: { activeModifiers: ["dark"] } },
          custom: {},
          nodes: [],
        },
      },
    ]);
    fake.setSelected("n1");
    setEditorBackref({ query: fake.query, actions: fake.actions });
    const { context, commands } = setupCommands();
    context.setCommandContext({
      selection: {
        id: "n1",
        type: null,
        isCanvas: false,
        isDeletable: true,
        isLinked: false,
        canDelete: true,
      },
    });
    await commands.execute("ph.node.copyClasses", undefined, { trigger: "menu" });
    // phStorage prefixes keys with "ph-".
    const raw = (globalThis as any).localStorage.getItem("ph-canvas-class-clipboard");
    assert.ok(raw, "phStorage write");
    const parsed = JSON.parse(raw);
    assert.equal(parsed.className, "btn btn-primary");
    assert.deepEqual(parsed.activeModifiers, ["dark"]);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("canvas/context: ph.node.pasteClasses sets className + activeModifiers", async () => {
  const browser = installFakeBrowser();
  try {
    // Seed the class clipboard.
    browser.storage = browser.storage; // satisfy ts
    (globalThis as any).localStorage.setItem(
      "ph-canvas-class-clipboard",
      JSON.stringify({ className: "p-4 bg-primary", activeModifiers: ["hover"] })
    );
    const fake = buildFakeCraft([
      {
        id: ROOT_NODE,
        data: { parent: null, isCanvas: true, props: {}, custom: {}, nodes: ["n1"] },
      },
      {
        id: "n1",
        data: { parent: ROOT_NODE, isCanvas: false, props: {}, custom: {}, nodes: [] },
      },
    ]);
    fake.setSelected("n1");
    setEditorBackref({ query: fake.query, actions: fake.actions });
    const { context, commands } = setupCommands();
    context.setCommandContext({
      selection: {
        id: "n1",
        type: null,
        isCanvas: false,
        isDeletable: true,
        isLinked: false,
        canDelete: true,
      },
      clipboard: { hasNode: false, hasClasses: true },
    });
    await commands.execute("ph.node.pasteClasses");
    const n1 = fake.query.node("n1").get();
    assert.equal(n1.data.props.className, "p-4 bg-primary");
    assert.deepEqual(n1.data.props.root.activeModifiers, ["hover"]);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});
