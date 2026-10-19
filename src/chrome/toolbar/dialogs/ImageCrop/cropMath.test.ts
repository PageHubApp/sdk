import test from "node:test";
import assert from "node:assert/strict";
import {
  CROP_RATIO_PRESETS,
  clampCrop,
  cropSizeLabel,
  initialCrop,
  isFullImageCrop,
  resolveRatio,
} from "./cropMath";

const wide = { width: 2680, height: 1787 };
const tall = { width: 1000, height: 3000 };
const preset = (key: string) => CROP_RATIO_PRESETS.find(p => p.key === key)!;

test("resolveRatio: free is null, original is the image's own ratio, fixed is the number", () => {
  assert.equal(resolveRatio(preset("free"), wide), null);
  assert.equal(resolveRatio(preset("original"), wide), 2680 / 1787);
  assert.equal(resolveRatio(preset("16:9"), wide), 16 / 9);
  assert.equal(resolveRatio(preset("1:1"), tall), 1);
});

test("initialCrop: free covers the whole image", () => {
  assert.deepEqual(initialCrop(wide, null), { x: 0, y: 0, width: 2680, height: 1787 });
});

test("initialCrop: original covers the whole image", () => {
  assert.deepEqual(initialCrop(wide, resolveRatio(preset("original"), wide)), {
    x: 0,
    y: 0,
    width: 2680,
    height: 1787,
  });
});

test("initialCrop: square on a wide image is full height, centred", () => {
  assert.deepEqual(initialCrop(wide, 1), { x: 447, y: 0, width: 1787, height: 1787 });
});

test("initialCrop: 16:9 on a wide (3:2) image is full width, centred vertically", () => {
  assert.deepEqual(initialCrop(wide, 16 / 9), { x: 0, y: 140, width: 2680, height: 1508 });
});

test("initialCrop: square on a tall image is full width, centred", () => {
  assert.deepEqual(initialCrop(tall, 1), { x: 0, y: 1000, width: 1000, height: 1000 });
});

test("initialCrop: 16:9 on a tall image is full width", () => {
  assert.deepEqual(initialCrop(tall, 16 / 9), { x: 0, y: 1219, width: 1000, height: 563 });
});

test("initialCrop: 9:16 on a wide image is full height", () => {
  const c = initialCrop(wide, 9 / 16);
  assert.equal(c.height, 1787);
  assert.equal(c.width, 1005);
  assert.equal(c.x, Math.round((2680 - 1787 * (9 / 16)) / 2));
});

test("clampCrop: rounds to whole pixels", () => {
  assert.deepEqual(clampCrop({ x: 10.4, y: 9.6, width: 100.5, height: 50.2 }, wide), {
    x: 10,
    y: 10,
    width: 101,
    height: 50,
  });
});

test("clampCrop: dragged past an edge keeps its size and moves back inside", () => {
  assert.deepEqual(clampCrop({ x: 2600, y: -40, width: 400, height: 300 }, wide), {
    x: 2280,
    y: 0,
    width: 400,
    height: 300,
  });
});

test("clampCrop: bigger than the image shrinks to the image", () => {
  assert.deepEqual(clampCrop({ x: -5, y: -5, width: 9999, height: 9999 }, wide), {
    x: 0,
    y: 0,
    width: 2680,
    height: 1787,
  });
});

test("clampCrop: enforces minSize, but never past the image", () => {
  assert.deepEqual(clampCrop({ x: 0, y: 0, width: 2, height: 0 }, wide, 50), {
    x: 0,
    y: 0,
    width: 50,
    height: 50,
  });
  assert.deepEqual(clampCrop({ x: 0, y: 0, width: 2, height: 2 }, { width: 20, height: 30 }, 50), {
    x: 0,
    y: 0,
    width: 20,
    height: 30,
  });
});

test("isFullImageCrop", () => {
  assert.equal(isFullImageCrop(initialCrop(wide, null), wide), true);
  assert.equal(isFullImageCrop(initialCrop(wide, 1), wide), false);
});

test("cropSizeLabel", () => {
  assert.equal(cropSizeLabel({ width: 1600, height: 900 }), "1600 × 900 px");
  assert.equal(cropSizeLabel({ width: 1599.6, height: 900.2 }), "1600 × 900 px");
});
