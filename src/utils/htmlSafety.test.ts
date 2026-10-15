import test from "node:test";
import assert from "node:assert/strict";

import { escapeHTML, safeAttrValue, safeHref } from "./htmlSafety";
import { replaceVariables } from "./design/variables";
import { setState } from "./state/stateRegistry";
import { attrsPassthrough, actionsAttr } from "./staticHtml";
import { toHTML as textToHTML } from "../components/Text/Text.toHTML";
import { toHTML as buttonToHTML } from "../components/Button/Button.toHTML";
import { toHTML as linkToHTML } from "../components/Link/Link.toHTML";
import { toHTML as embedToHTML } from "../components/Embed/Embed.toHTML";

const XSS = `<img src=x onerror="alert(1)">`;

const ctx = (item: Record<string, any> | null = null): any => ({
  classes: new Set<string>(),
  pageIndex: { page_home: { isHomePage: true, displayName: "Home" } },
  currentPath: "/",
  nodes: { ROOT: { props: { company: { name: "<b>Acme</b>" } } } },
  currentItem: item,
});

test("escapeHTML escapes markup and both quote styles", () => {
  assert.equal(escapeHTML(`<a href='x'>"&"</a>`), "&lt;a href=&#39;x&#39;&gt;&quot;&amp;&quot;&lt;/a&gt;");
});

test("safeHref allows relative and listed schemes", () => {
  for (const ok of ["/a", "?q=1", "#top", "a/b", "https://x.com", "http://x", "mailto:a@b.c", "tel:+1", "sms:+1", "ref:page_x/y", "//cdn.x/a"]) {
    assert.equal(safeHref(ok), ok, ok);
  }
});

test("safeHref drops script and unknown schemes, including obfuscated ones", () => {
  for (const bad of ["javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:x", "java\tscript:x", "java\nscript:x", "vbscript:x", "data:text/html,x"]) {
    assert.equal(safeHref(bad), undefined, JSON.stringify(bad));
  }
  assert.equal(safeHref(""), undefined);
  assert.equal(safeHref(null), undefined);
});

test("safeAttrValue only gates URL attributes", () => {
  assert.equal(safeAttrValue("href", "javascript:x"), undefined);
  assert.equal(safeAttrValue("formaction", "javascript:x"), undefined);
  assert.equal(safeAttrValue("data-x", "javascript:x"), "javascript:x");
});

test("replaceVariables html mode escapes visitor values, not author text", () => {
  const root = { company: { name: "<b>Acme</b>" } };
  const item = { title: XSS };
  assert.equal(replaceVariables("<p>{{item.title}}</p>", root, item), `<p>${XSS}</p>`);
  assert.equal(
    replaceVariables("<p>{{item.title}}</p>", root, item, null, { html: true }),
    `<p>${escapeHTML(XSS)}</p>`
  );
  // Author-owned settings and literal branches stay raw.
  assert.equal(replaceVariables("{{company.name}}", root, item, null, { html: true }), "<b>Acme</b>");
  assert.equal(replaceVariables("{{item.nope || <i>x</i>}}", root, item, null, { html: true }), "<i>x</i>");
  setState("url:q", { value: XSS });
  assert.equal(replaceVariables("{{state.url:q}}", root, null, null, { html: true }), escapeHTML(XSS));
});

test("static Text escapes item values and drops a script href", () => {
  const html = textToHTML(
    { tagName: "div", text: "<p>{{item.title}}</p>", action: [{ type: "link", href: "{{item.url}}" }] },
    "",
    ctx({ title: XSS, url: "javascript:alert(1)" })
  );
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /javascript:/);
  assert.doesNotMatch(html, /<a /);
});

test("static Button / Link escape labels and drop script hrefs", () => {
  for (const toHTML of [buttonToHTML, linkToHTML]) {
    const html = toHTML(
      { text: "{{item.title}}", action: [{ type: "link", href: "{{item.url}}" }] },
      "",
      ctx({ title: XSS, url: "javascript:alert(1)" })
    );
    assert.doesNotMatch(html, /<img/, html);
    assert.doesNotMatch(html, /javascript:/, html);
  }
  const ok = linkToHTML(
    { text: "Go", action: [{ type: "link", href: "/p/{{item.slug}}" }] },
    "",
    ctx({ slug: "a" })
  );
  assert.match(ok, /href="\/p\/a"/);
});

test("static Embed escapes item values inside author markup", () => {
  const html = embedToHTML({ code: `<div title="{{item.t}}">{{item.t}}</div>` }, "", ctx({ t: `"><script>x</script>` }));
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /title=""/);
});

test("attrsPassthrough gates interpolated URL attrs, keeps author literals", () => {
  const out = attrsPassthrough(
    { attrs: { href: "{{item.url}}", "data-u": "{{item.url}}", formaction: "javascript:author()" } },
    ctx({ url: "javascript:alert(1)" })
  );
  assert.equal(out.href, undefined);
  assert.equal(out["data-u"], "javascript:alert(1)");
  assert.equal(out.formaction, "javascript:author()");
});

test("actionsAttr drops a script href from the serialized action", () => {
  const out = actionsAttr(
    { action: [{ type: "link", href: "{{item.url}}" }] },
    ctx({ url: "javascript:alert(1)" })
  );
  const parsed = JSON.parse(out["data-ph-actions"] as string);
  assert.equal(parsed[0].href, undefined);
});
