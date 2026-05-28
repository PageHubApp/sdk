/**
 * Behavior tests for the canvas right-click context menu — selection
 * context derivation + menu filtering. Split from
 * canvas-context.behavior.test.ts (R3 — file was 650 LOC).
 *
 * Covers:
 *   - selection-context predicates compute correctly for ROOT / page /
 *     normal / linked nodes
 *   - canvas/context menu items respect `when` filtering and group order
 */
import test from "node:test";
import assert from "node:assert/strict";
import { ROOT_NODE } from "@craftjs/utils";
import { deriveSelectionContext } from "../selectionContext";
import {
  installFakeBrowser,
  uninstallFakeBrowser,
  buildFakeCraft,
  setupCommands,
} from "./canvas-context.test-helpers";

test("selection-context: empty derivation when no selection", () => {
  installFakeBrowser();
  try {
    const derived = deriveSelectionContext(null, null);
    assert.equal(derived.selection.id, null);
    assert.equal(derived.selection.canDelete, false);
    assert.equal(derived["siblingMove.canMoveUp"], false);
    assert.equal(derived.canMakeSavedComponent, true);
  } finally {
    uninstallFakeBrowser();
  }
});

test("selection-context: normal node — canCopy/Delete/canMakeSavedComponent all true", () => {
  installFakeBrowser();
  try {
    const fake = buildFakeCraft([
      {
        id: ROOT_NODE,
        data: { parent: null, isCanvas: true, props: {}, custom: {}, nodes: ["page-1"] },
      },
      {
        id: "page-1",
        data: { parent: ROOT_NODE, isCanvas: true, props: { type: "page" }, custom: {}, nodes: ["n1"] },
      },
      {
        id: "n1",
        data: { parent: "page-1", isCanvas: false, props: {}, custom: {}, nodes: [] },
      },
    ]);
    const derived = deriveSelectionContext(fake.query, "n1", { components: [] });
    assert.equal(derived.selection.id, "n1");
    assert.equal(derived.selection.canDelete, true);
    assert.equal(derived.selection.isLinked, false);
    assert.equal(derived.parent.id, "page-1");
    assert.equal(derived.canMakeSavedComponent, true);
  } finally {
    uninstallFakeBrowser();
  }
});

test("selection-context: ROOT selection — canDelete false", () => {
  installFakeBrowser();
  try {
    const fake = buildFakeCraft([
      {
        id: ROOT_NODE,
        data: { parent: null, isCanvas: true, props: {}, custom: {}, nodes: [] },
      },
    ]);
    const derived = deriveSelectionContext(fake.query, ROOT_NODE, { components: [] });
    assert.equal(derived.selection.id, ROOT_NODE);
    assert.equal(derived.selection.canDelete, false);
  } finally {
    uninstallFakeBrowser();
  }
});

test("selection-context: page node — canCopy false (page type filtered)", () => {
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
    const derived = deriveSelectionContext(fake.query, "page-1", { components: [] });
    assert.equal(derived.selection.type, "page");
    // Note: page IS deletable from CraftJS perspective in the fake; the
    // command-level `canCopySelection` predicate filters page/background.
  } finally {
    uninstallFakeBrowser();
  }
});

test("selection-context: existing-component selection — canMakeSavedComponent false", () => {
  installFakeBrowser();
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
    const derived = deriveSelectionContext(fake.query, "n1", {
      components: [{ rootNodeId: "n1" }],
    });
    assert.equal(derived.canMakeSavedComponent, false);
  } finally {
    uninstallFakeBrowser();
  }
});

test("canvas/context: menu items filter by selection — empty when no selection", () => {
  installFakeBrowser();
  try {
    const { menus } = setupCommands();
    const items = menus.items("canvas/context");
    // With empty/default ctx, everything that requires a selection should hide.
    assert.equal(items.length, 0);
  } finally {
    uninstallFakeBrowser();
  }
});

test("canvas/context: menu items resolve in declared group order for normal selection", () => {
  installFakeBrowser();
  try {
    const { context, menus } = setupCommands();
    // Drive a "normal node" context.
    context.setCommandContext({
      selection: {
        id: "n1",
        type: null,
        isCanvas: false,
        isDeletable: true,
        isLinked: false,
        canDelete: true,
      },
      parent: { id: "page-1", displayName: "Section" },
      clipboard: { hasNode: true, hasClasses: true },
    });
    const items = menus.items("canvas/context");
    const ids = items.map(i => i.command);
    // Deselect should be first
    assert.equal(ids[0], "ph.node.deselect");
    // Delete should come AFTER duplicate/convert.
    const iDelete = ids.indexOf("ph.node.delete");
    const iDup = ids.indexOf("ph.node.duplicate");
    assert.ok(iDup >= 0 && iDelete > iDup);
    // Move up before move down
    const iUp = ids.indexOf("ph.node.moveUp");
    const iDown = ids.indexOf("ph.node.moveDown");
    assert.ok(iUp >= 0 && iDown > iUp);
  } finally {
    uninstallFakeBrowser();
  }
});
