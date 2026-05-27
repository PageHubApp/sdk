import test from "node:test";
import assert from "node:assert/strict";
import { isInsideTextEditingSurface } from "./isInsideTextEditingSurface";

/**
 * Minimal HTMLElement fake. We only stub the surface area the predicate
 * touches: `tagName`, `isContentEditable`, `getAttribute`, `closest`. No
 * jsdom — keeps the test fast and dependency-free.
 */
function fakeEl(opts: {
  tag?: string;
  contentEditable?: "true" | "false" | "" | null;
  isContentEditable?: boolean;
  /** Ancestors (and self) matched by `.closest(selector)`. */
  matches?: string[];
}): EventTarget {
  const matchSet = new Set(opts.matches ?? []);
  return {
    tagName: opts.tag ?? "DIV",
    isContentEditable: opts.isContentEditable ?? false,
    getAttribute(name: string) {
      if (name === "contenteditable") return opts.contentEditable ?? null;
      return null;
    },
    closest(selector: string) {
      return matchSet.has(selector) ? this : null;
    },
  } as unknown as EventTarget;
}

test("returns false for null target", () => {
  assert.equal(isInsideTextEditingSurface(null), false);
});

test("returns false for EventTarget without closest()", () => {
  // Window / Document don't have .closest()
  assert.equal(isInsideTextEditingSurface({} as EventTarget), false);
});

test("returns true for INPUT", () => {
  assert.equal(isInsideTextEditingSurface(fakeEl({ tag: "INPUT" })), true);
});

test("returns true for TEXTAREA", () => {
  assert.equal(isInsideTextEditingSurface(fakeEl({ tag: "TEXTAREA" })), true);
});

test("returns true for SELECT", () => {
  assert.equal(isInsideTextEditingSurface(fakeEl({ tag: "SELECT" })), true);
});

test('returns true for contentEditable="true"', () => {
  assert.equal(
    isInsideTextEditingSurface(fakeEl({ contentEditable: "true" })),
    true
  );
});

test('returns true for contentEditable="" (empty string)', () => {
  assert.equal(
    isInsideTextEditingSurface(fakeEl({ contentEditable: "" })),
    true
  );
});

test("returns true for isContentEditable=true (DOM property)", () => {
  assert.equal(
    isInsideTextEditingSurface(fakeEl({ isContentEditable: true })),
    true
  );
});

test("returns true for ProseMirror ancestor", () => {
  assert.equal(
    isInsideTextEditingSurface(fakeEl({ matches: [".ProseMirror"] })),
    true
  );
});

test("returns true for CodeMirror (.cm-editor) ancestor", () => {
  assert.equal(
    isInsideTextEditingSurface(fakeEl({ matches: [".cm-editor"] })),
    true
  );
});

test("returns true for CodeMirror (.cm-content) ancestor", () => {
  assert.equal(
    isInsideTextEditingSurface(fakeEl({ matches: [".cm-content"] })),
    true
  );
});

test("returns true for Monaco (.monaco-editor) ancestor", () => {
  assert.equal(
    isInsideTextEditingSurface(fakeEl({ matches: [".monaco-editor"] })),
    true
  );
});

test("returns false for plain DIV without editing context", () => {
  assert.equal(isInsideTextEditingSurface(fakeEl({ tag: "DIV" })), false);
});

test('returns false for contentEditable="false"', () => {
  assert.equal(
    isInsideTextEditingSurface(fakeEl({ contentEditable: "false" })),
    false
  );
});
