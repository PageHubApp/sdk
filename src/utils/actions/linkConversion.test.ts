import test from "node:test";
import assert from "node:assert/strict";
import { needsJsActionDispatch, type NodeAction } from "../action";
import { attachLink } from "./handlers/link";

const conversion = {
  provider: "google-ads" as const,
  eventName: "conversion",
  sendTo: "AW-123/abc",
};

// ─── needsJsActionDispatch ─────────────────────────────────────────────

test("single plain link navigates natively", () => {
  assert.equal(needsJsActionDispatch([{ type: "link", href: "/about" }]), false);
  assert.equal(needsJsActionDispatch([{ type: "link", href: "tel:+13105550100" }]), false);
});

test("single link with conversion needs the dispatcher", () => {
  assert.equal(
    needsJsActionDispatch([{ type: "link", href: "tel:+13105550100", conversion }]),
    true
  );
});

test("anchor, handler action, non-link single, and chains need the dispatcher", () => {
  assert.equal(needsJsActionDispatch([{ type: "link", href: "#features" }]), true);
  assert.equal(needsJsActionDispatch([{ type: "toggle-theme" } as NodeAction]), true);
  assert.equal(
    needsJsActionDispatch([{ type: "copy-to-clipboard", text: "x" } as NodeAction]),
    true
  );
  assert.equal(
    needsJsActionDispatch([
      { type: "link", href: "/a" },
      { type: "link", href: "/b" },
    ]),
    true
  );
  assert.equal(needsJsActionDispatch([]), false);
});

// ─── attachLink conversion firing ──────────────────────────────────────

function withFakeWindow(run: (w: { gtagCalls: any[][]; assigned: string[] }) => void) {
  const g = globalThis as any;
  const prev = g.window;
  const state = { gtagCalls: [] as any[][], assigned: [] as string[] };
  g.window = {
    gtag: (...args: any[]) => {
      state.gtagCalls.push(args);
      // Simulate the beacon completing.
      const cb = args[2]?.event_callback;
      if (typeof cb === "function") cb();
    },
    location: { assign: (h: string) => state.assigned.push(h) },
    setTimeout: () => 0,
    open: () => null,
  };
  try {
    run(state);
  } finally {
    g.window = prev;
  }
}

function click(prop: any, mods: Partial<Record<"metaKey" | "ctrlKey", boolean>> = {}) {
  let prevented = false;
  prop.onClick({
    ...mods,
    button: 0,
    preventDefault: () => {
      prevented = true;
    },
  });
  return prevented;
}

test("tel: link fires the Google Ads conversion, then opens the dialer once", () => {
  withFakeWindow(state => {
    const prop: any = {};
    const action: NodeAction = { type: "link", href: "tel:+13105550100", conversion };
    attachLink(prop, action, false, { resolvedLinkHref: "tel:+13105550100" });
    const prevented = click(prop);
    assert.equal(prevented, true);
    assert.equal(state.gtagCalls.length, 1);
    assert.equal(state.gtagCalls[0][1], "conversion");
    assert.equal(state.gtagCalls[0][2].send_to, "AW-123/abc");
    assert.deepEqual(state.assigned, ["tel:+13105550100"]);
  });
});

test("link handler runs after an earlier onClick and owns the navigation", () => {
  withFakeWindow(state => {
    const order: string[] = [];
    const prop: any = { onClick: () => order.push("earlier") };
    attachLink(prop, { type: "link", href: "ref:page_x", conversion }, false, {
      resolvedLinkHref: "/x",
    });
    click(prop);
    assert.deepEqual(order, ["earlier"]);
    assert.deepEqual(state.assigned, ["/x"]);
  });
});

test("modified click keeps native new-tab behavior but still fires the conversion", () => {
  withFakeWindow(state => {
    const prop: any = {};
    attachLink(prop, { type: "link", href: "/pricing", conversion }, false, {
      resolvedLinkHref: "/pricing",
    });
    const prevented = click(prop, { metaKey: true });
    assert.equal(prevented, false);
    assert.equal(state.gtagCalls.length, 1);
    assert.deepEqual(state.assigned, []);
  });
});

test("editor mode never fires conversions or navigates", () => {
  withFakeWindow(state => {
    const prop: any = {};
    attachLink(prop, { type: "link", href: "tel:+13105550100", conversion }, true);
    click(prop);
    assert.equal(state.gtagCalls.length, 0);
    assert.deepEqual(state.assigned, []);
  });
});
