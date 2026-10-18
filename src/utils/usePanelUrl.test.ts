import assert from "node:assert/strict";
import { test } from "node:test";
import { readPanelParams, stripPanelParams, writePanelParams } from "./usePanelUrl";

test("readPanelParams: no prefix reads the bare keys", () => {
  assert.deepEqual(readPanelParams("?panel=blocks&cat=hero&q=x"), {
    panel: "blocks",
    cat: "hero",
    sub: null,
    sty: null,
    q: "x",
  });
});

test("readPanelParams: a prefix reads only the prefixed keys", () => {
  const state = readPanelParams("?panel=sheet&ed_panel=theme&ed_cat=colors", "ed_");
  assert.equal(state.panel, "theme");
  assert.equal(state.cat, "colors");
});

test("writePanelParams: sets and removes prefixed keys, keeps the host's own params", () => {
  const qs = writePanelParams("?sheet=settings&ed_q=old", { panel: "blocks", q: null }, "ed_");
  const sp = new URLSearchParams(qs);
  assert.equal(sp.get("sheet"), "settings");
  assert.equal(sp.get("ed_panel"), "blocks");
  assert.equal(sp.has("ed_q"), false);
  assert.equal(sp.has("panel"), false);
});

test("writePanelParams: keys not in the update are left alone", () => {
  const qs = writePanelParams("?panel=blocks&cat=hero", { q: "btn" });
  assert.deepEqual(readPanelParams(`?${qs}`), {
    panel: "blocks",
    cat: "hero",
    sub: null,
    sty: null,
    q: "btn",
  });
});

test("stripPanelParams: removes only this prefix's panel keys", () => {
  const qs = stripPanelParams("?panel=sheet&ed_panel=theme&ed_cat=colors&tab=2", "ed_");
  assert.equal(qs, "panel=sheet&tab=2");
});
