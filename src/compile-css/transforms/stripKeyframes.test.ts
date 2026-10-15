import test from "node:test";
import assert from "node:assert/strict";
import { stripUnusedKeyframes } from "./stripKeyframes";

const CSS =
  ".animate-css-fade-up{animation:css-fade-up .6s ease-out both}" +
  "@keyframes css-fade-up{from{opacity:0}to{opacity:1}}" +
  "@keyframes css-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}" +
  "@keyframes css-spin{to{transform:rotate(360deg)}}";

test("keeps keyframes a compiled rule references, drops the rest", () => {
  const out = stripUnusedKeyframes(CSS);
  assert.match(out, /@keyframes css-fade-up/);
  assert.doesNotMatch(out, /@keyframes css-marquee/);
  assert.doesNotMatch(out, /@keyframes css-spin/);
});

test("keeps keyframes the page mentions outside compiled CSS (inline style, inject)", () => {
  const nodeTree = JSON.stringify({ a: { props: { root: { style: "animation: css-marquee 20s linear infinite" } } } });
  const out = stripUnusedKeyframes(CSS, nodeTree);
  assert.match(out, /@keyframes css-marquee/);
  assert.doesNotMatch(out, /@keyframes css-spin/);
});

test("keeps keyframes reached through a custom property (Tailwind animate-*)", () => {
  const css =
    ":root{--animate-pulse:pulse 2s cubic-bezier(.4,0,.6,1) infinite}" +
    ".animate-pulse{animation:var(--animate-pulse)}" +
    "@keyframes pulse{50%{opacity:.5}}" +
    "@keyframes css-spin{to{transform:rotate(360deg)}}";
  const out = stripUnusedKeyframes(css);
  assert.match(out, /@keyframes pulse/);
  assert.doesNotMatch(out, /@keyframes css-spin/);
});

test("a mention must be the whole name, not part of a longer one", () => {
  const out = stripUnusedKeyframes(CSS, "css-spinner css-marquee-slow");
  assert.doesNotMatch(out, /@keyframes css-spin\{/);
  assert.doesNotMatch(out, /@keyframes css-marquee\{/);
});
