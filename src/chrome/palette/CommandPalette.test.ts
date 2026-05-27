/**
 * Wave B2 — Command palette results / filter / group logic tests.
 *
 * These tests target the pure `computePaletteResults` function (no React,
 * no DOM). The React-side palette UI is mechanically driven by this output,
 * so covering the function gives us the meaningful coverage.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createContextRegistry, DEFAULT_CONTEXT } from "../../registry/context";
import { computePaletteResults, fuzzyScore } from "./useCommandPaletteResults";
import type { CommandContext, CommandDef } from "../../registry/types";

function ctxSnapshot(overrides: Partial<CommandContext> = {}): CommandContext {
  const reg = createContextRegistry();
  const base = reg.getSnapshot();
  return { ...base, ...overrides } as CommandContext;
}

function cmd(partial: Partial<CommandDef> & { id: string }): CommandDef {
  return {
    title: partial.id,
    run: () => {},
    ...partial,
  } as CommandDef;
}

// ─── fuzzyScore ──────────────────────────────────────────────────────────

test("fuzzyScore: empty query yields 0", () => {
  assert.equal(fuzzyScore("", "anything"), 0);
});

test("fuzzyScore: prefix match outranks substring match", () => {
  const prefix = fuzzyScore("undo", "Undo last change");
  const substring = fuzzyScore("undo", "Can't undo here");
  assert.ok(prefix > substring);
});

test("fuzzyScore: no match returns -1", () => {
  assert.equal(fuzzyScore("xyz", "Open settings"), -1);
});

test("fuzzyScore: subsequence match returns positive", () => {
  // 'opn' matches 'Open' via subsequence.
  const score = fuzzyScore("opn", "Open settings");
  assert.ok(score > 0);
});

// ─── computePaletteResults: filtering ─────────────────────────────────────

test("palette: empty query returns every visible command, grouped by category", () => {
  const commands: CommandDef[] = [
    cmd({ id: "a.one", title: "Alpha", category: "Edit" }),
    cmd({ id: "a.two", title: "Beta", category: "Edit" }),
    cmd({ id: "b.one", title: "Gamma", category: "View" }),
  ];
  const out = computePaletteResults(commands, ctxSnapshot(), "");
  assert.equal(out.count, 3);
  assert.equal(out.groups.length, 2);
  // Categories appear in alphabetical order due to sort.
  assert.deepEqual(
    out.groups.map(g => g.category),
    ["Edit", "View"]
  );
  assert.deepEqual(
    out.groups[0]!.items.map(i => i.title),
    ["Alpha", "Beta"]
  );
});

test("palette: when:false hides commands", () => {
  const commands: CommandDef[] = [
    cmd({ id: "shown", title: "Shown", category: "Edit" }),
    cmd({
      id: "hidden",
      title: "Hidden",
      category: "Edit",
      when: () => false,
    }),
  ];
  const out = computePaletteResults(commands, ctxSnapshot(), "");
  assert.equal(out.count, 1);
  assert.equal(out.flat[0]!.id, "shown");
});

test("palette: paletteHide:true is skipped", () => {
  const commands: CommandDef[] = [
    cmd({ id: "in", title: "Visible", category: "Edit" }),
    cmd({ id: "out", title: "Skipped", category: "Edit", paletteHide: true }),
  ];
  const out = computePaletteResults(commands, ctxSnapshot(), "");
  assert.equal(out.count, 1);
  assert.equal(out.flat[0]!.id, "in");
});

test("palette: enablement:false leaves command visible but disabled", () => {
  const commands: CommandDef[] = [
    cmd({
      id: "disabled",
      title: "Greyed",
      category: "Edit",
      enablement: () => false,
    }),
  ];
  const out = computePaletteResults(commands, ctxSnapshot(), "");
  assert.equal(out.count, 1);
  assert.equal(out.flat[0]!.enabled, false);
});

test("palette: query filters non-matching commands", () => {
  const commands: CommandDef[] = [
    cmd({ id: "undo", title: "Undo", category: "Edit" }),
    cmd({ id: "redo", title: "Redo", category: "Edit" }),
    cmd({ id: "save", title: "Save", category: "File" }),
  ];
  const out = computePaletteResults(commands, ctxSnapshot(), "und");
  assert.equal(out.count, 1);
  assert.equal(out.flat[0]!.id, "undo");
});

test("palette: query matches against category as well as title", () => {
  const commands: CommandDef[] = [
    cmd({ id: "x", title: "Random title", category: "Format" }),
  ];
  const out = computePaletteResults(commands, ctxSnapshot(), "form");
  assert.equal(out.count, 1);
});

test("palette: query ranks better matches higher (prefix > scattered)", () => {
  const commands: CommandDef[] = [
    cmd({ id: "scattered", title: "Reload pages now", category: "View" }),
    cmd({ id: "prefix", title: "Reload", category: "View" }),
  ];
  const out = computePaletteResults(commands, ctxSnapshot(), "reload");
  assert.equal(out.flat[0]!.id, "prefix");
});

test("palette: when() throwing is treated as when:false (no crash)", () => {
  const commands: CommandDef[] = [
    cmd({ id: "ok", title: "OK", category: "Edit" }),
    cmd({
      id: "throws",
      title: "Throws",
      category: "Edit",
      when: () => {
        throw new Error("boom");
      },
    }),
  ];
  const out = computePaletteResults(commands, ctxSnapshot(), "");
  assert.equal(out.count, 1);
  assert.equal(out.flat[0]!.id, "ok");
});

test("palette: dynamic title fn is resolved with ctx", () => {
  const commands: CommandDef[] = [
    cmd({
      id: "dyn",
      title: ctx => (ctx.canUndo ? "Undo (available)" : "Undo (none)"),
      category: "Edit",
    }),
  ];
  const out = computePaletteResults(
    commands,
    ctxSnapshot({ canUndo: true }),
    ""
  );
  assert.equal(out.flat[0]!.title, "Undo (available)");
});

test("palette: groups preserve category sort order across results", () => {
  const commands: CommandDef[] = [
    cmd({ id: "x", title: "X", category: "View" }),
    cmd({ id: "y", title: "Y", category: "AI" }),
    cmd({ id: "z", title: "Z", category: "Edit" }),
  ];
  const out = computePaletteResults(commands, ctxSnapshot(), "");
  // Alphabetical when no query: AI, Edit, View
  assert.deepEqual(
    out.groups.map(g => g.category),
    ["AI", "Edit", "View"]
  );
});

test("palette: default context shape matches DEFAULT_CONTEXT (smoke)", () => {
  // Sanity: the shared DEFAULT_CONTEXT remains usable as an input snapshot.
  const out = computePaletteResults([], DEFAULT_CONTEXT, "anything");
  assert.equal(out.count, 0);
  assert.equal(out.groups.length, 0);
});
