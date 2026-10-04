import test from "node:test";
import assert from "node:assert/strict";

import {
  createInViewTracker,
  normalizeInViewState,
  pickInViewWinner,
  treeUsesInViewState,
} from "./inViewTracker";
import { getInViewStateScript } from "../../render/static/runtime/inViewState";
import { renderToHTML } from "../../render/static/renderToHTML";

const VH = 800;

test("pick: the section filling the screen beats one peeking in", () => {
  const w = pickInViewWinner(
    [
      { visible: 120, height: 900, top: -780 },
      { visible: 680, height: 900, top: 120 },
    ],
    VH
  );
  assert.equal(w, 1);
});

test("pick: a short last section shown in full beats a tall one still covering most of the screen", () => {
  const w = pickInViewWinner(
    [
      { visible: 500, height: 2000, top: -1500 },
      { visible: 300, height: 300, top: 500 },
    ],
    VH
  );
  assert.equal(w, 1);
});

test("pick: ties go to the topmost", () => {
  const w = pickInViewWinner(
    [
      { visible: 200, height: 200, top: 400 },
      { visible: 200, height: 200, top: 100 },
    ],
    VH
  );
  assert.equal(w, 1);
});

test("pick: nothing visible → -1 (caller keeps the previous winner)", () => {
  assert.equal(pickInViewWinner([{ visible: 0, height: 500, top: 900 }], VH), -1);
  assert.equal(pickInViewWinner([], VH), -1);
});

test("normalize: needs a key and a non-empty value", () => {
  assert.deepEqual(normalizeInViewState({ key: " deck:step ", value: 3 }), {
    key: "deck:step",
    value: "3",
  });
  assert.equal(normalizeInViewState({ key: "deck:step", value: "" }), null);
  assert.equal(normalizeInViewState({ key: "", value: "a" }), null);
  assert.equal(normalizeInViewState("deck:step"), null);
  assert.equal(normalizeInViewState(null), null);
});

test("treeUsesInViewState: true only when a node carries a usable prop", () => {
  assert.equal(treeUsesInViewState({ ROOT: { props: {} } }), false);
  assert.equal(
    treeUsesInViewState({ ROOT: { props: {} }, a: { props: { inViewState: { key: "k" } } } }),
    false
  );
  assert.equal(
    treeUsesInViewState({ ROOT: { props: {} }, a: { props: { inViewState: { key: "k", value: "v" } } } }),
    true
  );
});

// ── Tracker against a fake DOM (no IntersectionObserver → every member measured) ──

function fakeEl(order: number, rect: { top: number; height: number }) {
  return {
    order,
    rect,
    getBoundingClientRect() {
      return { top: this.rect.top, bottom: this.rect.top + this.rect.height, height: this.rect.height };
    },
    compareDocumentPosition(other: any) {
      return other.order > this.order ? 4 : 2;
    },
  };
}

test("tracker: publishes value/index/number/count, distinct values in document order, writes only on change", async () => {
  const g = globalThis as any;
  const prev = { window: g.window, document: g.document, raf: g.requestAnimationFrame };
  g.window = { innerHeight: VH };
  g.document = { documentElement: { clientHeight: VH } };
  g.requestAnimationFrame = undefined;
  try {
    const writes: Array<[string, string]> = [];
    const t = createInViewTracker(pickInViewWinner, (k, v) => writes.push([k, v]));
    const intro = fakeEl(0, { top: -2000, height: 800 });
    const how1 = fakeEl(1, { top: 100, height: 900 }); // most visible
    const how2 = fakeEl(2, { top: 1000, height: 900 });
    const price = fakeEl(3, { top: 2000, height: 600 });
    // Added out of order — the tracker sorts by document position.
    t.add(price as any, "deck:phase", "pricing");
    t.add(how2 as any, "deck:phase", "how");
    t.add(intro as any, "deck:phase", "intro");
    t.add(how1 as any, "deck:phase", "how");
    await new Promise(r => setTimeout(r, 5));
    const state = Object.fromEntries(writes);
    assert.equal(state["deck:phase"], "how");
    assert.equal(state["deck:phase:index"], "1");
    assert.equal(state["deck:phase:number"], "2");
    assert.equal(state["deck:phase:count"], "3");
    const n = writes.length;
    // Same layout again → nothing new written.
    const leave = t.add(fakeEl(4, { top: 5000, height: 10 }) as any, "deck:phase", "how");
    await new Promise(r => setTimeout(r, 5));
    assert.equal(writes.length, n);
    // Scroll to pricing.
    intro.rect.top -= 2000;
    how1.rect.top -= 2000;
    how2.rect.top -= 2000;
    price.rect.top = 100;
    leave(); // also schedules a republish
    await new Promise(r => setTimeout(r, 5));
    const after = Object.fromEntries(writes);
    assert.equal(after["deck:phase"], "pricing");
    assert.equal(after["deck:phase:number"], "3");
  } finally {
    g.window = prev.window;
    g.document = prev.document;
    g.requestAnimationFrame = prev.raf;
  }
});

// ── Static emission ──

test("static script: parses as JS and contains the shared functions by source", () => {
  const html = getInViewStateScript();
  const body = html.replace(/^<script>/, "").replace(/<\/script>$/, "");
  assert.doesNotThrow(() => new Function(body));
  assert.match(body, /__PH_RT_EXT__/);
  assert.match(body, /data-in-view-state/);
});

test("static script: runs against a fake runtime and writes the group's keys", async () => {
  const g = globalThis as any;
  const prev = { window: g.window, document: g.document, raf: g.requestAnimationFrame };
  const els = [
    Object.assign(fakeEl(0, { top: -900, height: 800 }), {
      getAttribute: () => JSON.stringify({ key: "deck:step", value: "a" }),
    }),
    Object.assign(fakeEl(1, { top: 50, height: 800 }), {
      getAttribute: () => JSON.stringify({ key: "deck:step", value: "b" }),
    }),
  ];
  const ext: any[] = [];
  g.window = { innerHeight: VH, __PH_RT_EXT__: ext };
  g.document = { documentElement: { clientHeight: VH }, querySelectorAll: () => els };
  g.requestAnimationFrame = undefined;
  try {
    const body = getInViewStateScript().replace(/^<script>/, "").replace(/<\/script>$/, "");
    new Function("window", "document", body)(g.window, g.document);
    assert.equal(ext.length, 1);
    const state: Record<string, string> = {};
    ext[0]({ setState: (k: string, p: { value: string }) => (state[k] = p.value) });
    await new Promise(r => setTimeout(r, 5));
    assert.equal(state["deck:step"], "b");
    assert.equal(state["deck:step:number"], "2");
    assert.equal(state["deck:step:count"], "2");
  } finally {
    g.window = prev.window;
    g.document = prev.document;
    g.requestAnimationFrame = prev.raf;
  }
});

function tree(withProp: boolean) {
  return JSON.stringify({
    ROOT: {
      type: { resolvedName: "Container" },
      isCanvas: true,
      props: { type: "container", className: "w-full" },
      nodes: ["s1"],
      linkedNodes: {},
      parent: null,
    },
    s1: {
      type: { resolvedName: "Container" },
      isCanvas: true,
      props: {
        type: "section",
        className: "min-h-screen",
        ...(withProp ? { inViewState: { key: "deck:step", value: "intro" } } : {}),
      },
      nodes: [],
      linkedNodes: {},
      parent: "ROOT",
    },
  });
}

test("renderToHTML: emits the extension + attr only when a node uses inViewState", () => {
  const on = renderToHTML(tree(true), { compressed: false, runtime: true }).html;
  assert.match(on, /data-in-view-state="\{&quot;key&quot;:&quot;deck:step&quot;,&quot;value&quot;:&quot;intro&quot;\}"/);
  const onScripts = renderToHTML(tree(true), { compressed: false, runtime: true });
  assert.match(onScripts.scrollObserverScript, /data-in-view-state/);
  const off = renderToHTML(tree(false), { compressed: false, runtime: true });
  assert.doesNotMatch(off.html, /data-in-view-state/);
  assert.doesNotMatch(off.scrollObserverScript, /data-in-view-state/);
});
