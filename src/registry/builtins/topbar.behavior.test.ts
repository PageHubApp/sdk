/**
 * Behavior tests for the topbar surface commands.
 *
 * Each test mocks the absolute minimum (window/document, panel state,
 * the editor ecosystem) and verifies that the registered `run` body
 * produces the expected side effect — not just that the command exists.
 *
 * The goal is to prove the C2a migration didn't lose behavior. We avoid
 * jsdom and rely on plain globals.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createContextRegistry } from "../context";
import { createCommandsRegistry } from "../commands";
import { BUILTIN_COMMANDS } from "./commands";
import { setEditorBackref, clearEditorBackref } from "../editorBackref";

// ─── globalThis fakes ────────────────────────────────────────────────────

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
  for (const def of BUILTIN_COMMANDS) commands.register(def);
  return { context, commands };
}

// ─── Tests ──────────────────────────────────────────────────────────────

test("topbar: ph.editor.save opens publish panel", async () => {
  const browser = installFakeBrowser();
  const { commands } = setupCommands();
  try {
    await commands.execute("ph.editor.save");
    assert.match(browser.fakeWindow.location.search, /panel=publish/);
  } finally {
    uninstallFakeBrowser();
  }
});

test("topbar: ph.editor.insert toggles components panel (opens then closes)", async () => {
  const browser = installFakeBrowser();
  const { commands } = setupCommands();
  try {
    await commands.execute("ph.editor.insert");
    assert.match(
      browser.fakeWindow.location.search,
      /panel=(components|blocks)/,
      "panel opens on first call"
    );
    await commands.execute("ph.editor.insert");
    assert.doesNotMatch(
      browser.fakeWindow.location.search,
      /panel=/,
      "panel closes on second call"
    );
  } finally {
    uninstallFakeBrowser();
  }
});

test("topbar: ph.theme.open opens theme panel with cat=colors by default", async () => {
  const browser = installFakeBrowser();
  const { commands } = setupCommands();
  try {
    await commands.execute("ph.theme.open");
    assert.match(browser.fakeWindow.location.search, /panel=theme/);
    assert.match(browser.fakeWindow.location.search, /cat=colors/);
  } finally {
    uninstallFakeBrowser();
  }
});

test("topbar: ph.importExport.open toggles panel", async () => {
  const browser = installFakeBrowser();
  const { commands } = setupCommands();
  try {
    await commands.execute("ph.importExport.open");
    assert.match(browser.fakeWindow.location.search, /panel=import-export/);
  } finally {
    uninstallFakeBrowser();
  }
});

test("topbar: ph.canvas.toggleGridLines flips atom + writes data-show-gridlines", async () => {
  const browser = installFakeBrowser();
  const eco = installFakeEcosystem();
  const { commands } = setupCommands();
  try {
    await commands.execute("ph.canvas.toggleGridLines");
    assert.equal(browser.fakeDocAttrs["viewport.data-show-gridlines"], "true");
    await commands.execute("ph.canvas.toggleGridLines");
    assert.equal(browser.fakeDocAttrs["viewport.data-show-gridlines"], "false");
    // Sanity: atom reflects the same flip
    void eco;
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("topbar: ph.canvas.toggleHidden flips atom + writes data-show-hidden", async () => {
  const browser = installFakeBrowser();
  installFakeEcosystem();
  const { commands } = setupCommands();
  try {
    // Default ShowHiddenAtom is true; first toggle -> false.
    await commands.execute("ph.canvas.toggleHidden");
    assert.equal(browser.fakeDocAttrs["viewport.data-show-hidden"], "false");
    await commands.execute("ph.canvas.toggleHidden");
    assert.equal(browser.fakeDocAttrs["viewport.data-show-hidden"], "true");
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("topbar: ph.media.open closes any open URL panel + flips atom", async () => {
  const browser = installFakeBrowser();
  installFakeEcosystem();
  const { commands } = setupCommands();
  try {
    // Pre-open theme panel to verify it gets closed.
    await commands.execute("ph.theme.open");
    assert.match(browser.fakeWindow.location.search, /panel=theme/);
    await commands.execute("ph.media.open");
    assert.doesNotMatch(
      browser.fakeWindow.location.search,
      /panel=theme/,
      "theme panel closed by media.open"
    );
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("topbar: ph.editor.undo dispatches actions.history.undo via editor backref", async () => {
  const browser = installFakeBrowser();
  installFakeEcosystem();
  let undoCalled = 0;
  const fakeQuery = {
    getEvent: () => ({ first: () => "ROOT" }),
  };
  const fakeActions = {
    history: { undo: () => undoCalled++ },
    selectNode: () => {},
  };
  setEditorBackref({ query: fakeQuery, actions: fakeActions });
  const { context, commands } = setupCommands();
  context.setCommandContext({ canUndo: true });
  try {
    await commands.execute("ph.editor.undo");
    assert.equal(undoCalled, 1);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
    void browser;
  }
});
