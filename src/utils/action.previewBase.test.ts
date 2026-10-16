import { test } from "node:test";
import assert from "node:assert/strict";
import { actionToHref } from "./action";

const href = (h: string, path?: string) => actionToHref({ type: "link", href: h } as any, {}, path);

test("root-relative links mount under the preview prefix", () => {
  assert.equal(href("/shop", "/view/abc/product/x"), "/view/abc/shop");
  assert.equal(href("/shop?category=tees", "/view/abc"), "/view/abc/shop?category=tees");
  assert.equal(href("/#visit", "/view/abc/shop"), "/view/abc#visit");
  assert.equal(href("/", "/build/abc"), "/build/abc");
  assert.equal(href("/care", "/static/site123/plants"), "/static/site123/care");
});

test("root-relative links are untouched off preview routes", () => {
  assert.equal(href("/shop", "/product/x"), "/shop");
  assert.equal(href("/shop", undefined), "/shop");
  // A custom domain's internal /static/<host> rewrite is served at "/".
  assert.equal(href("/shop", "/static/example.com/product"), "/shop");
});

test("api paths, protocol-relative and already-prefixed links pass through", () => {
  assert.equal(href("/api/downloads/x", "/view/abc"), "/api/downloads/x");
  assert.equal(href("//cdn.example.com/a", "/view/abc"), "//cdn.example.com/a");
  assert.equal(href("/view/abc/shop", "/view/abc"), "/view/abc/shop");
  assert.equal(href("#contact", "/view/abc"), "#contact");
  assert.equal(href("https://x.com", "/view/abc"), "https://x.com");
});
