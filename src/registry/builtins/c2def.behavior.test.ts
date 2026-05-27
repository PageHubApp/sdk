/**
 * Behavior tests for the C2d (node breadcrumb), C2e (sidebar tab strip),
 * and C2f (empty-state card) surface migrations. Style mirrors the topbar /
 * navmenu / canvas-context tests — minimal browser + ecosystem fakes, no
 * jsdom.
 *
 * Coverage:
 *  - ph.node.selectAncestor calls actions.selectNode with the args id
 *  - ph.node.renameDisplayName writes the BreadcrumbRenameRequestedAtom
 *  - ph.editor.openBlocksPanel / openComponentsPanel push the URL panel
 *    parameter
 *  - ph.editor.closeSidebar clears events + flips SideBarOpen atom
 *  - ph.component.createReusable is callable from the registry without
 *    throwing (extracted non-hook helper)
 *  - sidebar/tabs menu items respect features.blocksPanel.enabled
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createContextRegistry } from "../context";
import { createCommandsRegistry } from "../commands";
import { createMenusRegistry } from "../menus";
import { BUILTIN_COMMANDS } from "./commands";
import { BUILTIN_MENUS } from "./menus";
import { setEditorBackref, clearEditorBackref } from "../editorBackref";
import {
  BreadcrumbRenameRequestedAtom,
  SideBarOpen,
} from "../../utils/atoms";
import { CanvasIsolateAtom } from "../../utils/component/componentIsolation";

// ─── Fakes ───────────────────────────────────────────────────────────────

function installFakeBrowser() {
  const url = new URL("http://localhost/edit");
  const fakeWindow = {
    location: { search: "", pathname: "/edit", href: url.toString() },
    addEventListener: () => {},
    removeEventListener: () => {},
    history: {
      pushState(_state: unknown, _title: string, newUrl: string) {
        const parsed = new URL(newUrl, "http://localhost");
        fakeWindow.location.search = parsed.search;
        fakeWindow.location.pathname = parsed.pathname;
        fakeWindow.location.href = parsed.toString();
      },
      replaceState(_state: unknown, _title: string, newUrl: string) {
        const parsed = new URL(newUrl, "http://localhost");
        fakeWindow.location.search = parsed.search;
        fakeWindow.location.pathname = parsed.pathname;
      },
    },
    matchMedia: () => ({ matches: false }),
  };
  const fakeDocument = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
  };
  (globalThis as any).window = fakeWindow;
  (globalThis as any).document = fakeDocument;
  (globalThis as any).history = fakeWindow.history;
  return { fakeWindow, fakeDocument };
}

function uninstallFakeBrowser() {
  delete (globalThis as any).window;
  delete (globalThis as any).document;
  delete (globalThis as any).history;
}

function installFakeEcosystem() {
  const atomState = new Map<unknown, unknown>();
  const ecosystem = {
    getInstance(template: any) {
      return {
        getState() {
          return atomState.get(template);
        },
        setState(value: any) {
          const current = atomState.get(template);
          const next = typeof value === "function" ? value(current) : value;
          atomState.set(template, next);
        },
      };
    },
  } as any;
  setEditorBackref({ ecosystem });
  return { ecosystem, atomState };
}

function setupCommands() {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  const menus = createMenusRegistry({ commands, context });
  for (const def of BUILTIN_COMMANDS) commands.register(def);
  for (const { location, items } of BUILTIN_MENUS) menus.contribute(location, items);
  return { context, commands, menus };
}

// ─── C2d: node breadcrumb ────────────────────────────────────────────────

test("c2d: ph.node.selectAncestor calls actions.selectNode with args.id", async () => {
  installFakeBrowser();
  installFakeEcosystem();
  let selected: string | null = null;
  const fakeActions = {
    selectNode(id: string) {
      selected = id;
    },
  };
  setEditorBackref({ actions: fakeActions });
  const { context, commands } = setupCommands();
  // Bypass the breadcrumbLength gate.
  context.setCommandContext({ breadcrumbLength: 3 } as never);
  try {
    await commands.execute("ph.node.selectAncestor", { id: "node-42" });
    assert.equal(selected, "node-42");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2d: ph.node.selectAncestor is a no-op without args.id", async () => {
  installFakeBrowser();
  installFakeEcosystem();
  let called = 0;
  setEditorBackref({
    actions: {
      selectNode() {
        called += 1;
      },
    },
  });
  const { context, commands } = setupCommands();
  context.setCommandContext({ breadcrumbLength: 3 } as never);
  try {
    await commands.execute("ph.node.selectAncestor");
    assert.equal(called, 0);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2d: ph.node.renameDisplayName writes the BreadcrumbRenameRequestedAtom", async () => {
  installFakeBrowser();
  const eco = installFakeEcosystem();
  // The command resolves selectedId via query when no args.id; provide a
  // fake query so the selection path also works.
  const fakeQuery = {
    getEvent() {
      return { first: () => "live-sel" };
    },
    node() {
      return { get: () => null };
    },
  };
  setEditorBackref({ query: fakeQuery });
  const { context, commands } = setupCommands();
  context.setCommandContext({
    selection: { id: "live-sel", type: null, isCanvas: false, isDeletable: false, isLinked: false },
  } as never);
  try {
    // Explicit args.id wins.
    await commands.execute("ph.node.renameDisplayName", { id: "explicit-id" });
    assert.equal(eco.atomState.get(BreadcrumbRenameRequestedAtom), "explicit-id");
    // No args -> falls back to selectedId(query).
    await commands.execute("ph.node.renameDisplayName");
    assert.equal(eco.atomState.get(BreadcrumbRenameRequestedAtom), "live-sel");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

// ─── C2e: sidebar tab strip ──────────────────────────────────────────────

test("c2e: ph.editor.openBlocksPanel pushes ?panel=blocks", async () => {
  const browser = installFakeBrowser();
  installFakeEcosystem();
  const { commands } = setupCommands();
  try {
    await commands.execute("ph.editor.openBlocksPanel");
    assert.match(browser.fakeWindow.location.search, /panel=blocks/);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2e: ph.editor.openComponentsPanel pushes ?panel=components", async () => {
  const browser = installFakeBrowser();
  installFakeEcosystem();
  const { commands } = setupCommands();
  try {
    await commands.execute("ph.editor.openComponentsPanel");
    assert.match(browser.fakeWindow.location.search, /panel=components/);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2e: sidebar/tabs menu yields both pills by default", () => {
  installFakeBrowser();
  installFakeEcosystem();
  try {
    const { menus } = setupCommands();
    const ids = menus.items("sidebar/tabs").map(i => i.command);
    assert.deepEqual(ids, [
      "ph.editor.openComponentsPanel",
      "ph.editor.openBlocksPanel",
    ]);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2e: sidebar/tabs hides Blocks when features.blocksPanel.enabled === false", () => {
  installFakeBrowser();
  installFakeEcosystem();
  try {
    const { context, menus } = setupCommands();
    context.setCommandContext({
      features: { blocksPanel: { enabled: false } } as never,
    });
    const ids = menus.items("sidebar/tabs").map(i => i.command);
    assert.deepEqual(ids, ["ph.editor.openComponentsPanel"]);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

// ─── C2f: empty-state card ───────────────────────────────────────────────

test("c2f: ph.editor.closeSidebar clears craft events and flips SideBarOpen", async () => {
  installFakeBrowser();
  const eco = installFakeEcosystem();
  let cleared = 0;
  setEditorBackref({
    actions: {
      clearEvents() {
        cleared += 1;
      },
    },
  });
  // Pre-set SideBarOpen so we can verify the flip-to-false path.
  eco.atomState.set(SideBarOpen, true);
  const { commands } = setupCommands();
  try {
    await commands.execute("ph.editor.closeSidebar");
    assert.equal(cleared, 1, "clearEvents called");
    assert.equal(eco.atomState.get(SideBarOpen), false);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2f: ph.component.createReusable is callable from the registry without throwing", async () => {
  installFakeBrowser();
  installFakeEcosystem();
  // No editor backref — the lazy import resolves; the helper logs a warn
  // and returns. We just verify the command dispatches cleanly.
  const { commands } = setupCommands();
  try {
    await commands.execute("ph.component.createReusable");
    // If we got here without throwing, the command body executed.
    assert.ok(true);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

// ─── C2i: canvas selection chip — ph.node.isolate ────────────────────────

test("c2i: ph.node.isolate writes CanvasIsolateAtom with args.id (chip surface)", async () => {
  installFakeBrowser();
  const eco = installFakeEcosystem();
  const { context, commands } = setupCommands();
  // when() requires selection.type === "component"; synthesize one.
  context.setCommandContext({
    selection: {
      id: "selected-anchor",
      type: "component",
      isCanvas: true,
      isDeletable: true,
      isLinked: false,
      canDelete: true,
    },
  });
  try {
    await commands.execute(
      "ph.node.isolate",
      { id: "container-7" },
      { trigger: "menu" }
    );
    // Args id wins over current selection.id.
    assert.equal(eco.atomState.get(CanvasIsolateAtom), "container-7");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2i: ph.node.isolate falls back to ctx.selection.id when args omitted", async () => {
  installFakeBrowser();
  const eco = installFakeEcosystem();
  const { context, commands } = setupCommands();
  // Selection-context bypass: pass a synthetic component selection.
  context.setCommandContext({
    selection: {
      id: "selected-container",
      type: "component",
      isCanvas: true,
      isDeletable: true,
      isLinked: false,
      canDelete: true,
    },
  });
  try {
    await commands.execute("ph.node.isolate", undefined, { trigger: "palette" });
    assert.equal(eco.atomState.get(CanvasIsolateAtom), "selected-container");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2i: canvas/chip menu surfaces ph.node.isolate when selection is a component", () => {
  installFakeBrowser();
  installFakeEcosystem();
  const { context, menus } = setupCommands();
  context.setCommandContext({
    selection: {
      id: "n1",
      type: "component",
      isCanvas: true,
      isDeletable: true,
      isLinked: false,
      canDelete: true,
    },
  });
  try {
    const ids = menus.items("canvas/chip").map(i => i.command);
    assert.deepEqual(ids, ["ph.node.isolate"]);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2i: canvas/chip menu hides ph.node.isolate when disableIsolate flag set", () => {
  installFakeBrowser();
  installFakeEcosystem();
  const { context, menus } = setupCommands();
  context.setCommandContext({
    selection: {
      id: "n1",
      type: "component",
      isCanvas: true,
      isDeletable: true,
      isLinked: false,
      canDelete: true,
    },
  });
  context.set("disableIsolate", true);
  try {
    const ids = menus.items("canvas/chip").map(i => i.command);
    assert.deepEqual(ids, []);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

// ─── C2i: ph.editor.openCommandPalette ───────────────────────────────────

test("c2i: ph.editor.openCommandPalette toggles CommandPaletteAtom", async () => {
  installFakeBrowser();
  const eco = installFakeEcosystem();
  const { commands } = setupCommands();
  try {
    // First execute opens.
    await commands.execute(
      "ph.editor.openCommandPalette",
      undefined,
      { trigger: "keybinding" }
    );
    const { CommandPaletteAtom } = await import(
      "../../chrome/toolbar/dialogs/dialogAtoms"
    );
    assert.deepEqual(eco.atomState.get(CommandPaletteAtom), { open: true });
    // Second execute closes (Spotlight toggle).
    await commands.execute(
      "ph.editor.openCommandPalette",
      undefined,
      { trigger: "keybinding" }
    );
    assert.deepEqual(eco.atomState.get(CommandPaletteAtom), { open: false });
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});
