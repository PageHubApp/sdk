/**
 * Behavior tests for the canvas right-click context menu — navigation
 * commands (deselect, sibling cycling, page selection). Split from
 * canvas-context.behavior.test.ts (R3 — file was 650 LOC).
 *
 * Covers:
 *   - deselect calls actions.selectNode(null)
 *   - cycleNextSibling rotates selection across siblings (wraps at end)
 *   - selectPage requires hasPageIsolation context flag
 */
import test from "node:test";
import assert from "node:assert/strict";
import { ROOT_NODE } from "@craftjs/utils";
import { setEditorBackref, clearEditorBackref } from "../editorBackref";
import {
  installFakeBrowser,
  uninstallFakeBrowser,
  installFakeEcosystem,
  buildFakeCraft,
  setupCommands,
} from "./canvas-context.test-helpers";

test("canvas/context: ph.node.deselect calls actions.selectNode(null)", async () => {
  installFakeBrowser();
  installFakeEcosystem();
  try {
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
    });
    await commands.execute("ph.node.deselect");
    assert.deepEqual(fake.selects, ["<null>"]);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("canvas/context: ph.node.cycleNextSibling rotates selection across siblings", async () => {
  installFakeBrowser();
  try {
    const fake = buildFakeCraft([
      {
        id: ROOT_NODE,
        data: { parent: null, isCanvas: true, props: {}, custom: {}, nodes: ["p"] },
      },
      {
        id: "p",
        data: { parent: ROOT_NODE, isCanvas: true, props: {}, custom: {}, nodes: ["a", "b", "c"] },
      },
      { id: "a", data: { parent: "p", isCanvas: false, props: {}, custom: {}, nodes: [] } },
      { id: "b", data: { parent: "p", isCanvas: false, props: {}, custom: {}, nodes: [] } },
      { id: "c", data: { parent: "p", isCanvas: false, props: {}, custom: {}, nodes: [] } },
    ]);
    fake.setSelected("a");
    setEditorBackref({ query: fake.query, actions: fake.actions });
    const { context, commands } = setupCommands();
    context.setCommandContext({
      selection: { id: "a", type: null, isCanvas: false, isDeletable: true, isLinked: false, canDelete: true },
    });
    await commands.execute("ph.node.cycleNextSibling");
    assert.equal(fake.selects[fake.selects.length - 1], "b");
    fake.setSelected("c");
    await commands.execute("ph.node.cycleNextSibling");
    assert.equal(fake.selects[fake.selects.length - 1], "a", "wraps to first sibling");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("canvas/context: selectPage requires hasPageIsolation context flag", async () => {
  installFakeBrowser();
  try {
    const fake = buildFakeCraft([
      {
        id: ROOT_NODE,
        data: { parent: null, isCanvas: true, props: {}, custom: {}, nodes: ["page-1"] },
      },
      {
        id: "page-1",
        data: { parent: ROOT_NODE, isCanvas: true, props: { type: "page" }, custom: {}, nodes: [] },
      },
    ]);
    setEditorBackref({ query: fake.query, actions: fake.actions });
    const { context, commands, menus } = setupCommands();
    // Without flag: command is not in the menu
    let items = menus.items("canvas/context");
    assert.ok(!items.some(i => i.command === "ph.node.selectPage"));
    // Flip flag + pageIsolation
    context.set("hasPageIsolation", true);
    context.set("pageIsolation", "page-1");
    // Run the command — should select page-1
    await commands.execute("ph.node.selectPage");
    assert.equal(fake.selects[fake.selects.length - 1], "page-1");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});
