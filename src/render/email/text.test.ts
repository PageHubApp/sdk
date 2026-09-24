import test from "node:test";
import assert from "node:assert/strict";
import { htmlToText } from "./text";

test("htmlToText: blocks become paragraphs, whitespace collapses", () => {
  const html = `<table><tr><td><h1>Hello   there</h1></td></tr><tr><td><p>Line one
    continues</p><p>Line two</p></td></tr></table>`;
  assert.equal(htmlToText(html), "Hello there\n\nLine one continues\n\nLine two");
});

test("htmlToText: links show their href, images their alt", () => {
  const html = `<p>Read <a href="https://example.com/post">the post</a> now</p><img src="x.png" alt="A photo"><a href="#top">Top</a>`;
  assert.equal(htmlToText(html), "Read the post (https://example.com/post) now\n\nA photo Top");
});

test("htmlToText: skips head, style, preheader and Outlook comments", () => {
  const html = `<html><head><title>T</title><style>.a{color:red}</style></head><body>
    <div data-ph-preheader style="display:none">Preview text</div>
    <!--[if mso]><table><tr><td><![endif]--><p>Body</p><!--[if mso]></td></tr></table><![endif]--></body></html>`;
  assert.equal(htmlToText(html), "Body");
});

test("htmlToText: decodes entities", () => {
  assert.equal(htmlToText("<p>Fish &amp; chips &mdash; &pound;5</p>"), "Fish & chips — £5");
});
