import { test } from "node:test";
import assert from "node:assert/strict";
import { pageNodeSlug, pageSlugFromName, pageSlugMatches, resolvePageSlug } from "./pageSlug";

test("display names slug to one canonical URL segment", () => {
  const cases: Array<[string, string]> = [
    ["Lana B. Nassar", "lana-b-nassar"],
    ["Q&A", "qa"],
    ["About Us", "about-us"],
    ["Café", "cafe"],
    ["Hello  World", "hello-world"],
    ["Shipping & Returns", "shipping-returns"],
    ["  Trim Me  ", "trim-me"],
    ["FAQ’s", "faqs"],
    ["Dr. Smith, M.D.", "dr-smith-md"],
  ];
  for (const [name, slug] of cases) assert.equal(pageSlugFromName(name), slug, name);
});

test("explicit pageSlug wins; empty name falls back to the node id", () => {
  assert.equal(resolvePageSlug({ pageSlug: "data-sharing-opt-out", displayName: "Your Privacy Choices" }), "data-sharing-opt-out");
  assert.equal(resolvePageSlug({ displayName: "" }, "page_x"), "page_x");
  assert.equal(resolvePageSlug({ displayName: null }), "");
});

test("serialized page nodes read custom.displayName + props.pageSlug", () => {
  assert.equal(pageNodeSlug({ custom: { displayName: "Lana B. Nassar" }, props: {} }, "p1"), "lana-b-nassar");
  assert.equal(pageNodeSlug({ custom: { displayName: "Contact" }, props: { pageSlug: "reach-us" } }), "reach-us");
});

test("matching is case-insensitive and rejects empty segments", () => {
  const slug = resolvePageSlug({ displayName: "Lana B. Nassar" });
  assert.ok(pageSlugMatches(slug, "lana-b-nassar"));
  assert.ok(pageSlugMatches(slug, "Lana-B-Nassar"));
  assert.ok(!pageSlugMatches(slug, "lana-b.-nassar"));
  assert.ok(!pageSlugMatches(slug, ""));
  assert.ok(!pageSlugMatches("", ""));
});
