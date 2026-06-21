import test from "node:test";
import assert from "node:assert/strict";
import {
  replaceVariables,
  resolveVariable,
  setAuthState,
  setConnectorData,
  setRuntimeVar,
} from "./variables";
import { setState } from "../state/stateRegistry";

/**
 * Parity test for the `replaceVariables` decomposition (per-domain resolvers +
 * `parseTemplateExpr`). Locks the behavior across every namespace and template
 * form, AND the two documented divergences from the editor-preview
 * `resolveVariable` (state empty-walk + item live-vs-preview).
 *
 * Runtime-only: seeds the global auth / connector / runtime / state registries
 * (module-level singletons) and builds rootProps / itemContext by hand. node:test
 * runs sequentially, but `seed()` re-asserts globals at the top of each case so
 * ordering can't leak.
 */

const rootProps = {
  company: { name: "Acme", email: "hi@acme.com" },
  variables: [{ key: "tagline", value: "Best ever" }],
};

const itemContext = {
  title: "Live Item",
  slug: "live-item",
  images: ["a.jpg"],
  nested: { x: "deep" },
};

function seed() {
  setAuthState({ status: "logged-in", customer: { email: "a@b.com", name: "Ann" } });
  setConnectorData({ stripe: { bindings: { b1: [{ title: "Widget", price: 10 }] } } });
  setRuntimeVar("promo", "SUMMER");
  setState("cart:count", { kind: "value", value: "3", source: "runtime" });
  setState("pdp:abc:matching-variant", {
    kind: "value",
    value: JSON.stringify({ formatted: "$9.99", empty: "" }),
    source: "runtime",
  });
  setState("ph-chat-1:title", { kind: "value", value: "Chat Title", source: "runtime" });
}

// ── auth.* ──────────────────────────────────────────────────────────────────
test("auth.* resolves status + nested customer fields, miss → empty", () => {
  seed();
  assert.equal(replaceVariables("{{auth.status}}", rootProps), "logged-in");
  assert.equal(replaceVariables("{{auth.customer.name}}", rootProps), "Ann");
  // unresolved auth.* renders empty (context-dependent prefix policy)
  assert.equal(replaceVariables("{{auth.customer.phone}}", rootProps), "");
});

// ── state.* (incl. JSON tail walk) ───────────────────────────────────────────
test("state.* resolves bare key + JSON tail; empty/miss → raw literal", () => {
  seed();
  assert.equal(replaceVariables("{{state.cart:count}}", rootProps), "3");
  assert.equal(
    replaceVariables("{{state.pdp:abc:matching-variant.formatted}}", rootProps),
    "$9.99"
  );
  // tail walks to "" → runtime treats as miss; state.* is NOT in the empty-prefix
  // list → the raw literal survives.
  assert.equal(
    replaceVariables("{{state.pdp:abc:matching-variant.empty}}", rootProps),
    "{{state.pdp:abc:matching-variant.empty}}"
  );
  assert.equal(
    replaceVariables("{{state.nope:key}}", rootProps),
    "{{state.nope:key}}"
  );
});

// ── item.* (live repeater context) ───────────────────────────────────────────
test("item.* resolves against the live itemContext; miss → empty", () => {
  seed();
  assert.equal(replaceVariables("{{item.title}}", rootProps, itemContext), "Live Item");
  assert.equal(replaceVariables("{{item.nested.x}}", rootProps, itemContext), "deep");
  assert.equal(replaceVariables("{{item.images.0}}", rootProps, itemContext), "a.jpg");
  assert.equal(replaceVariables("{{item.missing}}", rootProps, itemContext), "");
  // no itemContext → falls through to generic walk (undefined) → item.* → empty
  assert.equal(replaceVariables("{{item.title}}", rootProps), "");
});

// ── connector.* ──────────────────────────────────────────────────────────────
test("connector.* walks bindings + length; miss → empty", () => {
  seed();
  assert.equal(
    replaceVariables("{{connector.stripe.bindings.b1.0.title}}", rootProps),
    "Widget"
  );
  assert.equal(
    replaceVariables("{{connector.stripe.bindings.b1.length}}", rootProps),
    "1"
  );
  assert.equal(
    replaceVariables("{{connector.stripe.bindings.bX.0.title}}", rootProps),
    ""
  );
});

// ── variables.* (runtime store wins over rootProps) ──────────────────────────
test("variables.* prefers runtime store, then rootProps; miss → empty", () => {
  seed();
  assert.equal(replaceVariables("{{variables.tagline}}", rootProps), "Best ever");
  assert.equal(replaceVariables("{{variables.promo}}", rootProps), "SUMMER");
  assert.equal(replaceVariables("{{variables.unknown}}", rootProps), "");
});

// ── generic root props + DEFAULT_VALUES + unknown literal ────────────────────
test("generic root-prop lookup, company defaults, unknown → raw literal", () => {
  seed();
  assert.equal(replaceVariables("{{company.name}}", rootProps), "Acme");
  // not on rootProps → DEFAULT_VALUES placeholder
  assert.equal(replaceVariables("{{company.phone}}", rootProps), "(555) 123-4567");
  // unresolved, no default, non-context prefix → raw literal survives
  assert.equal(replaceVariables("{{totally.unknown}}", rootProps), "{{totally.unknown}}");
});

// ── ternary / truthy / || / year ─────────────────────────────────────────────
test("ternary == / != selects + quote-strips the chosen branch", () => {
  seed();
  assert.equal(
    replaceVariables("{{auth.status == logged-in ? /account : /login}}", rootProps),
    "/account"
  );
  assert.equal(
    replaceVariables("{{auth.status == logged-out ? /account : /login}}", rootProps),
    "/login"
  );
  assert.equal(
    replaceVariables("{{auth.status != logged-out ? /yes : /no}}", rootProps),
    "/yes"
  );
});

test("bare truthiness branch", () => {
  seed();
  assert.equal(replaceVariables("{{auth.customer.name ? Hi : Bye}}", rootProps), "Hi");
  assert.equal(replaceVariables("{{auth.customer.phone ? Hi : Bye}}", rootProps), "Bye");
});

test("|| fallback (literal) only when the key misses", () => {
  seed();
  assert.equal(replaceVariables("{{company.phoneX || N/A}}", rootProps), "N/A");
  assert.equal(replaceVariables("{{company.name || N/A}}", rootProps), "Acme");
});

test("{{year}} resolves to the current year", () => {
  seed();
  assert.equal(replaceVariables("{{year}}", rootProps), new Date().getFullYear().toString());
});

// ── span unwrap + anchor pre-pass ────────────────────────────────────────────
test("span[data-variable] unwrap + anchor token pre-pass", () => {
  seed();
  assert.equal(
    replaceVariables('<span data-variable="company.name">{{company.name}}</span>', rootProps),
    "Acme"
  );
  // bare anchor → id string
  assert.equal(replaceVariables("{{anchor.chat}}", rootProps, null, { chat: "ph-chat-1" }), "ph-chat-1");
  // nested anchor inside a state key
  assert.equal(
    replaceVariables("{{state.{{anchor.chat}}:title}}", rootProps, null, { chat: "ph-chat-1" }),
    "Chat Title"
  );
});

// ── resolveVariable (editor preview) — shared paths + documented divergences ──
test("resolveVariable reuses shared auth/connector/variables/generic resolvers", () => {
  seed();
  assert.equal(resolveVariable("auth.customer.email", rootProps), "a@b.com");
  assert.equal(resolveVariable("connector.stripe.bindings.b1.0.title", rootProps), "Widget");
  assert.equal(resolveVariable("variables.tagline", rootProps), "Best ever");
  // miss → raw varId (preview miss policy, distinct from replaceVariables)
  assert.equal(resolveVariable("company.unknownField", rootProps), "company.unknownField");
});

test("resolveVariable keeps divergent state (empty-walk → '') + item (preview)", () => {
  seed();
  // state JSON tail walks to "" → preview returns "" (NOT a miss, unlike runtime)
  assert.equal(resolveVariable("state.pdp:abc:matching-variant.empty", rootProps), "");
  // item.* in preview resolves against the connector first-item, not a live item
  assert.equal(resolveVariable("item.title", rootProps), "Widget");
});
