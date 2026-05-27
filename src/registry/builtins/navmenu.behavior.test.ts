/**
 * Behavior tests for the nav menu drawer surface commands and menu
 * contributions. Mirrors `topbar.behavior.test.ts` — minimal browser /
 * ecosystem fakes, no jsdom.
 *
 * Covers:
 *  - dark-mode toggle flips DarkModeAtom
 *  - selectBackground selects ROOT (gated by features.directSave)
 *  - openAssistant writes AssistantOpenAtom with revealPanel: true
 *  - menu items resolve in the expected order (group@N sort)
 *  - isTenant `when` gating filters items
 *  - dynamic titles ("Hide layers panel" vs "Dock layers panel") flip with
 *    the host-set context key
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createContextRegistry } from "../context";
import { createCommandsRegistry } from "../commands";
import { createMenusRegistry } from "../menus";
import { BUILTIN_COMMANDS } from "./commands";
import { BUILTIN_MENUS } from "./menus";
import { setEditorBackref, clearEditorBackref } from "../editorBackref";
import { DarkModeAtom, AssistantOpenAtom } from "../../utils/atoms";

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
  const fakeDocAttrs: Record<string, string> = {};
  const fakeViewport = {
    setAttribute(name: string, value: string) {
      fakeDocAttrs[`viewport.${name}`] = value;
    },
    getAttribute(name: string): string | null {
      return fakeDocAttrs[`viewport.${name}`] ?? null;
    },
    scrollTop: 0,
    scrollLeft: 0,
    focus: () => {},
    getElementsByTagName: () => [],
  };
  const fakeDocument = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById(id: string) {
      if (id === "viewport") return fakeViewport;
      return null;
    },
    querySelector: () => null,
  };
  (globalThis as any).window = fakeWindow;
  (globalThis as any).document = fakeDocument;
  (globalThis as any).history = fakeWindow.history;
  return { fakeWindow, fakeDocument, fakeViewport, fakeDocAttrs };
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

// ─── Tests ───────────────────────────────────────────────────────────────

test("navmenu: ph.ui.toggleDarkMode flips DarkModeAtom", async () => {
  installFakeBrowser();
  const eco = installFakeEcosystem();
  const { commands } = setupCommands();
  try {
    assert.equal(eco.atomState.get(DarkModeAtom), undefined);
    await commands.execute("ph.ui.toggleDarkMode");
    assert.equal(eco.atomState.get(DarkModeAtom), true, "first toggle -> dark");
    await commands.execute("ph.ui.toggleDarkMode");
    assert.equal(eco.atomState.get(DarkModeAtom), false, "second toggle -> light");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("navmenu: ph.site.selectBackground selects ROOT and closes panel", async () => {
  const browser = installFakeBrowser();
  installFakeEcosystem();
  let selectedNode: string | null = null;
  const fakeActions = {
    selectNode(id: string) {
      selectedNode = id;
    },
  };
  setEditorBackref({ actions: fakeActions });
  const { context, commands } = setupCommands();
  // Tenant required for the command's `when` predicate to pass; we bypass
  // by calling commands.execute directly (commands.execute checks when at
  // dispatch time — but with empty ctx.features.directSave it returns
  // false). So drive features into context.
  context.setCommandContext({
    features: { directSave: true } as never,
  });
  try {
    // Pre-open a URL panel to verify close.
    await commands.execute("ph.theme.open");
    assert.match(browser.fakeWindow.location.search, /panel=theme/);
    await commands.execute("ph.site.selectBackground");
    assert.equal(selectedNode, "ROOT");
    assert.doesNotMatch(
      browser.fakeWindow.location.search,
      /panel=theme/,
      "theme panel closed by selectBackground"
    );
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("navmenu: ph.ai.openAssistant writes AssistantOpenAtom with revealPanel:true", async () => {
  installFakeBrowser();
  const eco = installFakeEcosystem();
  const { context, commands } = setupCommands();
  // ph.ai.openAssistant is gated on ctx.isAiEnabled
  context.setCommandContext({ isAiEnabled: true });
  try {
    await commands.execute("ph.ai.openAssistant");
    const payload = eco.atomState.get(AssistantOpenAtom) as Record<string, unknown> | undefined;
    assert.ok(payload, "atom set");
    assert.equal(payload?.revealPanel, true);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("navmenu: ph.ai.openAssistant accepts args overrides (mode/promptHint)", async () => {
  installFakeBrowser();
  const eco = installFakeEcosystem();
  const { context, commands } = setupCommands();
  context.setCommandContext({ isAiEnabled: true });
  try {
    await commands.execute("ph.ai.openAssistant", {
      mode: "edit",
      promptHint: "rewrite this",
    } as never);
    const payload = eco.atomState.get(AssistantOpenAtom) as Record<string, unknown> | undefined;
    assert.equal(payload?.revealPanel, true);
    assert.equal(payload?.mode, "edit");
    assert.equal(payload?.promptHint, "rewrite this");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("navmenu: Settings menu resolves theme + media for non-tenant; adds background for tenant", () => {
  installFakeBrowser();
  installFakeEcosystem();
  try {
    const { context, menus } = setupCommands();
    // Non-tenant: directSave is false / unset.
    let items = menus.items("navmenu/settings");
    const ids = items.map(i => i.command);
    assert.ok(!ids.includes("ph.site.selectBackground"), "no background for non-tenant");
    assert.ok(ids.includes("ph.theme.open"));
    assert.ok(ids.includes("ph.media.open"));

    // Tenant: directSave true -> background visible.
    context.setCommandContext({ features: { directSave: true } as never });
    items = menus.items("navmenu/settings");
    const tenantIds = items.map(i => i.command);
    assert.ok(tenantIds.includes("ph.site.selectBackground"));
    // Order: settings@10 (background) before settings@20 (theme) before settings@30 (media).
    assert.equal(tenantIds[0], "ph.site.selectBackground");
    assert.equal(tenantIds[1], "ph.theme.open");
    assert.equal(tenantIds[2], "ph.media.open");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("navmenu: View section emits 6 items in declared order", () => {
  installFakeBrowser();
  installFakeEcosystem();
  try {
    const { menus } = setupCommands();
    const ids = menus.items("navmenu/view").map(i => i.command);
    assert.deepEqual(ids, [
      "ph.layers.popOut",
      "ph.layers.toggleDock",
      "ph.canvas.toggleGridLines",
      "ph.canvas.toggleBreakpointMarkers",
      "ph.canvas.toggleDeviceGuides",
      "ph.canvas.toggleHidden",
    ]);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("navmenu: Tools section gates importExport via features flag", () => {
  installFakeBrowser();
  installFakeEcosystem();
  try {
    const { context, menus } = setupCommands();
    // Default: features.importExport undefined -> visible (!== false check).
    let ids = menus.items("navmenu/tools").map(i => i.command);
    assert.ok(ids.includes("ph.importExport.open"));
    // Explicit false -> hidden.
    context.setCommandContext({ features: { importExport: false } as never });
    ids = menus.items("navmenu/tools").map(i => i.command);
    assert.ok(!ids.includes("ph.importExport.open"));
    assert.ok(ids.includes("ph.modifiers.open"));
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("navmenu: dynamic titles flip with context state (Dock vs Hide layers panel)", () => {
  installFakeBrowser();
  installFakeEcosystem();
  try {
    const { context, menus } = setupCommands();
    // Default: sidebarLayersOpen unset -> falsy -> "Dock"
    let items = menus.items("navmenu/view");
    let dock = items.find(i => i.command === "ph.layers.toggleDock");
    assert.ok(dock);
    assert.equal(dock!.title, "Dock layers panel");
    // Flip to open
    context.setCommandContext({ sidebarLayersOpen: true } as never);
    items = menus.items("navmenu/view");
    dock = items.find(i => i.command === "ph.layers.toggleDock");
    assert.equal(dock!.title, "Hide layers panel");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("navmenu: ph.ui.toggleDarkMode title flips with editorDarkMode context key", () => {
  installFakeBrowser();
  installFakeEcosystem();
  try {
    const { context, menus } = setupCommands();
    let items = menus.items("navmenu/preferences");
    let dark = items.find(i => i.command === "ph.ui.toggleDarkMode");
    assert.ok(dark);
    assert.equal(dark!.title, "Switch to dark theme");
    context.setCommandContext({ editorDarkMode: true } as never);
    items = menus.items("navmenu/preferences");
    dark = items.find(i => i.command === "ph.ui.toggleDarkMode");
    assert.equal(dark!.title, "Switch to light theme");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("navmenu: Preferences section gates each row via features flags", () => {
  installFakeBrowser();
  installFakeEcosystem();
  try {
    const { context, menus } = setupCommands();
    // Both enabled by default.
    let ids = menus.items("navmenu/preferences").map(i => i.command);
    assert.deepEqual(ids, ["ph.ui.toggleSidebarSide", "ph.ui.toggleDarkMode"]);
    // Disable sidebar switcher.
    context.setCommandContext({
      features: { settingsPanelSwitcher: false } as never,
    });
    ids = menus.items("navmenu/preferences").map(i => i.command);
    assert.deepEqual(ids, ["ph.ui.toggleDarkMode"]);
    // Disable both.
    context.setCommandContext({
      features: { settingsPanelSwitcher: false, darkModeSwitcher: false } as never,
    });
    ids = menus.items("navmenu/preferences").map(i => i.command);
    assert.deepEqual(ids, []);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("navmenu: ph.site.openSettings is NOT in the builtin catalog (moved out of SDK)", () => {
  installFakeBrowser();
  try {
    const { commands } = setupCommands();
    const def = commands.get("ph.site.openSettings");
    assert.equal(def, undefined, "ph.site.openSettings should be unregistered");
  } finally {
    uninstallFakeBrowser();
  }
});
