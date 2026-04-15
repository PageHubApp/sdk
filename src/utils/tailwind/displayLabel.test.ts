import test from "node:test";
import assert from "node:assert/strict";
import { formatTailwindDisplayLabel } from "./displayLabel";

test("formatTailwindDisplayLabel strips utility stems", () => {
  assert.equal(formatTailwindDisplayLabel("border-2"), "2");
  assert.equal(formatTailwindDisplayLabel("rounded-2xl"), "2X Large");
  assert.equal(formatTailwindDisplayLabel("drop-shadow-none"), "None");
});

test("formatTailwindDisplayLabel preserves variants", () => {
  assert.equal(formatTailwindDisplayLabel("hover:border-4"), "Hover: 4");
  assert.equal(formatTailwindDisplayLabel("sm:rounded-full"), "Small: Full");
  assert.equal(formatTailwindDisplayLabel("md:border-2"), "Medium: 2");
  assert.equal(formatTailwindDisplayLabel("hover:bg-neutral/80"), "Hover: Neutral 80%");
});

test("formatTailwindDisplayLabel keeps css vars shortened", () => {
  assert.equal(formatTailwindDisplayLabel("text-[var(--primary)]"), "text-[--primary]");
});
