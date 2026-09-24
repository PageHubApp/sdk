import test from "node:test";
import assert from "node:assert/strict";
import { evalStaticMath } from "./cssMath";

test("evalStaticMath: spatial clamp resolves against the 600px canvas", () => {
  // clamp(24px, 16px + 9px, 32px) — 1vw = 6px at 600px wide.
  assert.equal(evalStaticMath("calc(clamp(1.5rem, 1rem + 1.5vw, 2rem) * 1)"), "25px");
  assert.equal(evalStaticMath("calc(clamp(1.5rem, 1rem + 1.5vw, 2rem) * 1.125)"), "28.125px");
});

test("evalStaticMath: clamp picks the bound when the preferred value is outside it", () => {
  assert.equal(evalStaticMath("clamp(1rem, 10vw, 2rem)"), "32px");
  assert.equal(evalStaticMath("clamp(1rem, 1vw, 2rem)"), "16px");
});

test("evalStaticMath: nested calc / min / max", () => {
  assert.equal(evalStaticMath("calc(calc(1rem + 4px) * 2)"), "40px");
  assert.equal(evalStaticMath("min(calc(10px * 3), max(1rem, 20px))"), "20px");
  assert.equal(evalStaticMath("calc(-1 * 0.5rem)"), "-8px");
});

test("evalStaticMath: unitless math stays unitless", () => {
  assert.equal(evalStaticMath("calc(1.75 / 1.125)"), "1.5556");
});

test("evalStaticMath: math inside a larger value is replaced in place", () => {
  assert.equal(evalStaticMath("0 calc(2 * 0.25rem) solid"), "0 8px solid");
});

test("evalStaticMath: bare rem / vw lengths become px, other functions are untouched", () => {
  assert.equal(evalStaticMath("1.125rem"), "18px");
  assert.equal(evalStaticMath("10vw 0"), "60px 0");
  assert.equal(evalStaticMath("rgba(0, 0, 0, .5)"), "rgba(0, 0, 0, .5)");
  assert.equal(evalStaticMath("100%"), "100%");
});

test("evalStaticMath: unsupported math is dropped (null)", () => {
  assert.equal(evalStaticMath("calc(100% - 2rem)"), null);
  assert.equal(evalStaticMath("calc(1rem + 2)"), null);
  assert.equal(evalStaticMath("calc(1rem * 2rem)"), null);
  assert.equal(evalStaticMath("calc(10vh)"), null);
  assert.equal(evalStaticMath("calc(1rem"), null);
});
