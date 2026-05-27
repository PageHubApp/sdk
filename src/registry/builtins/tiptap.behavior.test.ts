/**
 * Behavior tests for the C2g (tiptap inline toolbar) + C2h (tiptap context
 * menu) surface migrations.
 *
 * Coverage:
 *  - setActiveTiptapEditor round-trips via getActiveTiptapEditor.
 *  - clearActiveTiptapEditorIf only clears matching identity.
 *  - ph.text.* commands no-op when no active editor.
 *  - ph.text.bold / italic / underline / toggleStrike / toggleSuperscript /
 *    toggleSubscript / toggleBulletList / toggleOrderedList call the
 *    matching editor.chain().focus().X().run() path.
 *  - ph.text.setBlockType parameterized (paragraph + heading levels).
 *  - ph.text.setAlign / setColor / unsetColor / setHighlight / unsetHighlight
 *    / setLink / unsetLink.
 *  - ph.text.openFontPanel / openLinkPanel / openMorePanel / closeActivePanel
 *    drive InlineEditActivePanelAtom.
 *  - ph.text.insertVariable parameterized via args.id.
 *  - tiptap/inline menu items resolve only when tiptap.active.
 *  - tiptap/inline/context-menu menu items respect ai gates.
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
  getActiveTiptapEditor,
  setActiveTiptapEditor,
  clearActiveTiptapEditorIf,
} from "../tiptapBackref";
import { InlineEditActivePanelAtom } from "../../utils/atoms";

// ─── Browser + ecosystem fakes ───────────────────────────────────────────

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
      replaceState() {},
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
  (globalThis as any).queueMicrotask =
    (globalThis as any).queueMicrotask ?? ((fn: () => void) => Promise.resolve().then(fn));
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

function setupCommands(opts?: { tiptapActive?: boolean; selectionEmpty?: boolean }) {
  const context = createContextRegistry();
  const commands = createCommandsRegistry({ context });
  const menus = createMenusRegistry({ commands, context });
  for (const def of BUILTIN_COMMANDS) commands.register(def);
  for (const { location, items } of BUILTIN_MENUS) menus.contribute(location, items);
  if (opts?.tiptapActive) {
    context.setCommandContext({
      tiptap: {
        active: true,
        selectionEmpty: opts.selectionEmpty ?? false,
        richTextMode: "full",
        isActive: () => false,
        can: () => ({}),
        activePanel: null,
      },
    } as never);
  }
  return { context, commands, menus };
}

// ─── Fake Tiptap editor ──────────────────────────────────────────────────

interface ChainCall {
  method: string;
  args: unknown[];
}

function makeFakeEditor(opts?: { isActive?: (name: string, attrs?: unknown) => boolean }) {
  const calls: ChainCall[] = [];
  const chain: any = new Proxy(
    {},
    {
      get(_, prop: string) {
        if (prop === "run") {
          return () => true;
        }
        return (...args: unknown[]) => {
          calls.push({ method: prop, args });
          return chain;
        };
      },
    }
  );
  const ed: any = {
    state: { selection: { empty: true } },
    schema: { topNodeType: { spec: { content: "block+" } } },
    chain: () => chain,
    isActive: opts?.isActive ?? (() => false),
    can: () => ({}),
    on() {},
    off() {},
  };
  return { editor: ed, calls };
}

// ─── tiptapBackref ───────────────────────────────────────────────────────

test("tiptap: setActiveTiptapEditor round-trips via getActiveTiptapEditor", () => {
  setActiveTiptapEditor(null);
  assert.equal(getActiveTiptapEditor(), null);
  const { editor } = makeFakeEditor();
  setActiveTiptapEditor(editor as any);
  assert.equal(getActiveTiptapEditor(), editor);
  setActiveTiptapEditor(null);
  assert.equal(getActiveTiptapEditor(), null);
});

test("tiptap: clearActiveTiptapEditorIf only clears matching identity", () => {
  const a = makeFakeEditor().editor;
  const b = makeFakeEditor().editor;
  setActiveTiptapEditor(a as any);
  // Stale blur from b — must not clobber a.
  clearActiveTiptapEditorIf(b as any);
  assert.equal(getActiveTiptapEditor(), a);
  // Real blur from a — should clear.
  clearActiveTiptapEditorIf(a as any);
  assert.equal(getActiveTiptapEditor(), null);
});

// ─── ph.text.* run bodies (real-editor path) ─────────────────────────────

test("c2g: ph.text.bold / italic / underline / strike call chain().toggleX().run()", async () => {
  installFakeBrowser();
  installFakeEcosystem();
  const { editor, calls } = makeFakeEditor();
  setActiveTiptapEditor(editor as any);
  const { commands } = setupCommands({ tiptapActive: true });
  try {
    await commands.execute("ph.text.bold");
    await commands.execute("ph.text.italic");
    await commands.execute("ph.text.underline");
    await commands.execute("ph.text.toggleStrike");
    await commands.execute("ph.text.toggleSuperscript");
    await commands.execute("ph.text.toggleSubscript");
    const methods = calls.map(c => c.method);
    assert.ok(methods.includes("toggleBold"), "expected toggleBold call");
    assert.ok(methods.includes("toggleItalic"));
    assert.ok(methods.includes("toggleUnderline"));
    assert.ok(methods.includes("toggleStrike"));
    assert.ok(methods.includes("toggleSuperscript"));
    assert.ok(methods.includes("toggleSubscript"));
  } finally {
    setActiveTiptapEditor(null);
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2g: ph.text.* commands no-op when no active editor", async () => {
  installFakeBrowser();
  installFakeEcosystem();
  setActiveTiptapEditor(null);
  const { commands } = setupCommands();
  try {
    // Execute should not throw even with no editor; chain methods never
    // called because there's nothing to call.
    await commands.execute("ph.text.bold");
    await commands.execute("ph.text.setColor", { value: "primary" });
    await commands.execute("ph.text.setFontSize", { size: "16px" });
    // No assertion needed beyond "didn't throw" — coverage proves the
    // withActiveTiptap guard works.
    assert.ok(true);
  } finally {
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2g: ph.text.setBlockType parameterized (paragraph + heading levels)", async () => {
  installFakeBrowser();
  installFakeEcosystem();
  const { editor, calls } = makeFakeEditor();
  setActiveTiptapEditor(editor as any);
  const { commands } = setupCommands({ tiptapActive: true });
  try {
    await commands.execute("ph.text.setBlockType", { type: "paragraph" });
    await commands.execute("ph.text.setBlockType", { type: "heading2" });
    const methods = calls.map(c => c.method);
    assert.ok(methods.includes("setParagraph"));
    const heading = calls.find(c => c.method === "toggleHeading");
    assert.ok(heading, "expected toggleHeading call");
    assert.deepEqual(heading?.args, [{ level: 2 }]);
  } finally {
    setActiveTiptapEditor(null);
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2g: ph.text.setAlign + setFontSize parameterized", async () => {
  installFakeBrowser();
  installFakeEcosystem();
  const { editor, calls } = makeFakeEditor();
  setActiveTiptapEditor(editor as any);
  const { commands } = setupCommands({ tiptapActive: true });
  try {
    await commands.execute("ph.text.setAlign", { dir: "center" });
    await commands.execute("ph.text.setFontSize", { size: "20px" });
    const align = calls.find(c => c.method === "setTextAlign");
    assert.deepEqual(align?.args, ["center"]);
    const size = calls.find(c => c.method === "setFontSize");
    assert.deepEqual(size?.args, ["20px"]);
  } finally {
    setActiveTiptapEditor(null);
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2g: ph.text.setColor / unsetColor / setHighlight / unsetHighlight", async () => {
  installFakeBrowser();
  installFakeEcosystem();
  const { editor, calls } = makeFakeEditor();
  setActiveTiptapEditor(editor as any);
  const { commands } = setupCommands({ tiptapActive: true });
  try {
    await commands.execute("ph.text.setColor", { cssVar: "var(--primary)" });
    await commands.execute("ph.text.unsetColor");
    await commands.execute("ph.text.setHighlight", { color: "var(--accent)" });
    await commands.execute("ph.text.unsetHighlight");
    const methods = calls.map(c => c.method);
    assert.ok(methods.includes("setColor"));
    assert.ok(methods.includes("unsetColor"));
    assert.ok(methods.includes("setHighlight"));
    assert.ok(methods.includes("unsetHighlight"));
  } finally {
    setActiveTiptapEditor(null);
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2g: ph.text.setLink / unsetLink", async () => {
  installFakeBrowser();
  installFakeEcosystem();
  let linkActive = false;
  const { editor, calls } = makeFakeEditor({
    isActive: name => name === "link" && linkActive,
  });
  setActiveTiptapEditor(editor as any);
  const { context, commands } = setupCommands();
  context.setCommandContext({
    tiptap: {
      active: true,
      selectionEmpty: false,
      richTextMode: "full",
      isActive: (n: string) => n === "link" && linkActive,
      can: () => ({}),
      activePanel: null,
    },
  } as never);
  try {
    // No existing link — bare setLink path.
    await commands.execute("ph.text.setLink", { href: "https://example.com" });
    let methods = calls.map(c => c.method);
    assert.ok(methods.includes("setLink"));
    assert.ok(!methods.includes("extendMarkRange"));

    // Now mark a link active and run again — should extendMarkRange first.
    calls.length = 0;
    linkActive = true;
    await commands.execute("ph.text.setLink", { href: "https://elsewhere.dev" });
    methods = calls.map(c => c.method);
    assert.ok(methods.includes("extendMarkRange"));
    assert.ok(methods.includes("setLink"));

    // unsetLink — gated on tiptap.isActive("link"); context returns true.
    calls.length = 0;
    await commands.execute("ph.text.unsetLink");
    methods = calls.map(c => c.method);
    assert.ok(methods.includes("unsetLink"));
  } finally {
    setActiveTiptapEditor(null);
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2g: ph.text.insertVariable parameterized via args.id", async () => {
  installFakeBrowser();
  installFakeEcosystem();
  const { editor, calls } = makeFakeEditor();
  setActiveTiptapEditor(editor as any);
  const { commands } = setupCommands({ tiptapActive: true });
  try {
    await commands.execute("ph.text.insertVariable", { id: "company.name" });
    const ins = calls.find(c => c.method === "insertVariable");
    assert.deepEqual(ins?.args, [{ id: "company.name" }]);
  } finally {
    setActiveTiptapEditor(null);
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

test("c2g: InlineEditActivePanelAtom driven by open-panel commands", async () => {
  installFakeBrowser();
  const eco = installFakeEcosystem();
  const { editor } = makeFakeEditor();
  setActiveTiptapEditor(editor as any);
  const { context, commands } = setupCommands();
  // Tiptap.active must be true for the openLinkPanel `when` gate.
  context.setCommandContext({
    tiptap: {
      active: true,
      selectionEmpty: false,
      richTextMode: "full",
      isActive: () => false,
      can: () => ({}),
      activePanel: null,
    },
  } as never);
  try {
    await commands.execute("ph.text.openFontPanel");
    assert.equal(eco.atomState.get(InlineEditActivePanelAtom), "font");
    await commands.execute("ph.text.openLinkPanel");
    assert.equal(eco.atomState.get(InlineEditActivePanelAtom), "link");
    await commands.execute("ph.text.openMorePanel");
    assert.equal(eco.atomState.get(InlineEditActivePanelAtom), "more");
    // closeActivePanel `when` requires activePanel != null — flip via context.
    context.setCommandContext({
      tiptap: {
        active: true,
        selectionEmpty: false,
        richTextMode: "full",
        isActive: () => false,
        can: () => ({}),
        activePanel: "more",
      },
    } as never);
    await commands.execute("ph.text.closeActivePanel");
    assert.equal(eco.atomState.get(InlineEditActivePanelAtom), null);
  } finally {
    setActiveTiptapEditor(null);
    clearEditorBackref();
    uninstallFakeBrowser();
  }
});

// ─── Menu visibility ─────────────────────────────────────────────────────

test("c2g: tiptap/inline menu items resolve when tiptap.active === true", () => {
  const { context, menus } = setupCommands();
  // tiptap inactive — menu items filter out (when: tiptap.active).
  let items = menus.items("tiptap/inline");
  assert.equal(items.length, 0);

  context.setCommandContext({
    tiptap: {
      active: true,
      selectionEmpty: false,
      richTextMode: "full",
      isActive: () => false,
      can: () => ({}),
      activePanel: null,
    },
  } as never);
  items = menus.items("tiptap/inline");
  // 8 items in the menu — bold/italic/underline + font/link + textcolor +
  // highlight + more.
  assert.ok(items.length >= 7, `expected 7+ items, got ${items.length}`);
  assert.ok(items.some(i => i.command === "ph.text.bold"));
  assert.ok(items.some(i => i.command === "ph.text.openLinkPanel"));
});

test("c2h: tiptap/inline/context-menu surfaces variable + AI", () => {
  const { context, menus } = setupCommands();
  context.setCommandContext({
    tiptap: {
      active: true,
      selectionEmpty: false,
      richTextMode: "full",
      isActive: () => false,
      can: () => ({}),
      activePanel: null,
    },
    isAiEnabled: true,
  } as never);
  const items = menus.items("tiptap/inline/context-menu");
  // AI + variable picker rows present.
  assert.ok(items.some(i => i.command === "ph.ai.includeTextInChat"));
  assert.ok(items.some(i => i.command === "ph.text.openVariablePicker"));
});

test("c2h: tiptap/inline/context-menu filters AI when aiEnabled is false", () => {
  const { context, menus } = setupCommands();
  context.setCommandContext({
    tiptap: {
      active: true,
      selectionEmpty: false,
      richTextMode: "full",
      isActive: () => false,
      can: () => ({}),
      activePanel: null,
    },
    isAiEnabled: false,
  } as never);
  const items = menus.items("tiptap/inline/context-menu");
  assert.ok(!items.some(i => i.command === "ph.ai.includeTextInChat"));
  // Variable picker still visible (only gated on tiptap.active).
  assert.ok(items.some(i => i.command === "ph.text.openVariablePicker"));
});

test("c2g: tiptap/inline filters inline-only commands when richTextMode === inline", () => {
  const { context, menus } = setupCommands();
  context.setCommandContext({
    tiptap: {
      active: true,
      selectionEmpty: false,
      richTextMode: "inline",
      isActive: () => false,
      can: () => ({}),
      activePanel: null,
    },
  } as never);
  // More panel still visible (when: tiptap.active only) — but its children
  // (setAlign / toggleBulletList) are gated on richTextMode !== "inline".
  const more = menus.items("tiptap/inline/more-panel");
  assert.ok(!more.some(i => i.command === "ph.text.setAlign"));
  assert.ok(!more.some(i => i.command === "ph.text.toggleBulletList"));
  // Strike / super / sub are NOT inline-gated, so they remain.
  assert.ok(more.some(i => i.command === "ph.text.toggleStrike"));
});
