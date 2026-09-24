import test from "node:test";
import assert from "node:assert/strict";
import { configureCdn } from "../../utils/cdn";
import { renderToHTML } from "../static/renderToHTML";
import type { SerializedNodes } from "../static/types";
import { EMAIL_RESOLVER, GAP_ATTR } from "./emitters";
import { n, tree } from "./fixtures/tree";

const render = (nodes: SerializedNodes) =>
  renderToHTML(JSON.stringify(nodes), {
    compressed: false,
    view: "desktop",
    resolver: EMAIL_RESOLVER,
  }).html;

const count = (html: string, re: RegExp) => (html.match(re) || []).length;

test("Container: a flex-row becomes one ph-col cell per child", () => {
  const html = render(
    tree([
      n("Container", { className: "bg-base-100 flex flex-col md:flex-row items-center gap-space-md" }, [
        n("Text", { text: "A" }),
        n("Text", { text: "B" }),
      ]),
    ])
  );
  assert.equal(count(html, /<td class="ph-col" width="50%" valign="middle"/g), 2);
  assert.equal(count(html, new RegExp(`${GAP_ATTR.x}="gap-space-md"`, "g")), 2);
  // Layout tokens become structure; the rest stays on the outer cell.
  assert.match(html, /<td class="bg-base-100">/);
  assert.doesNotMatch(html, /flex-row/);
});

test("Container: grid-cols-N wraps children into rows of N", () => {
  const html = render(
    tree([n("Container", { className: "grid grid-cols-3 gap-space-sm" }, [1, 2, 3, 4].map(i => n("Text", { text: `T${i}` })))])
  );
  assert.equal(count(html, /<td class="ph-col" width="33%"/g), 4);
  // Only the second row's cells carry the row gap.
  assert.equal(count(html, new RegExp(`${GAP_ATTR.top}=`, "g")), 1);
});

test("Container: stacked children get one row each, gap on every row after the first", () => {
  const html = render(
    tree(
      [n("Container", { className: "flex flex-col items-center gap-space-sm" }, [n("Text", { text: "A" }), n("Text", { text: "B" }), n("Text", { text: "C" })])],
      { className: "bg-base-100" } // gives the frame's own centered cell a class, so it isn't counted
    )
  );
  assert.equal(count(html, /<tr><td align="center"( data-ph-gap-top="[^"]*")?>/g), 3);
  assert.equal(count(html, new RegExp(`${GAP_ATTR.top}="gap-space-sm"`, "g")), 2);
  assert.doesNotMatch(html, /ph-col/);
});

test("Container: a link action wraps the table in <a href>", () => {
  const html = render(
    tree([n("Container", { action: [{ type: "link", href: "https://example.com/x" }] }, [n("Text", { text: "A" })])])
  );
  assert.match(html, /<a href="https:\/\/example.com\/x" style="text-decoration:none"><table/);
});

test("Button: bulletproof table with interpolated href + text, icon dropped", () => {
  const html = render(
    tree(
      [
        n("Button", {
          text: "Hi {{variables.name}}",
          className: "bg-primary text-primary-content px-space-md py-space-xs rounded-box font-semibold",
          action: [{ type: "link", href: "https://example.com/{{variables.name}}" }],
          icon: { value: "ref-icon:tb/TbArrowRight" },
        }),
      ],
      { variables: [{ key: "name", value: "ada" }] }
    )
  );
  assert.match(
    html,
    /<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td class="bg-primary text-primary-content px-space-md py-space-xs rounded-box font-semibold"><a href="https:\/\/example.com\/ada" class="text-primary-content font-semibold" style="display:inline-block;text-decoration:none">Hi ada<\/a><\/td><\/tr><\/table>/
  );
  assert.doesNotMatch(html, /<svg/);
});

test("Image: CDN ids get a fixed png/jpeg format; http passes through; width from class", () => {
  configureCdn({ accountHash: "acct" });
  const html = render(
    tree(
      [
        n("Image", { type: "cdn", src: "logo-id", alt: "Logo", className: "w-[120px]" }),
        n("Image", { type: "cdn", src: "photo-id", alt: "Photo" }),
        n("Image", { src: "https://example.com/a.jpg", alt: "A", className: "w-40" }),
        n("Image", { type: "svg", src: "<svg></svg>" }),
      ],
      { pageMedia: [{ id: "logo-id", metadata: { contentType: "image/png" } }] }
    )
  );
  assert.match(html, /src="https:\/\/imagedelivery.net\/acct\/logo-id\/w=1200,format=png"[^>]*width="120"/);
  assert.match(html, /src="https:\/\/imagedelivery.net\/acct\/photo-id\/w=1200,format=jpeg"[^>]*width="600"/);
  assert.match(html, /src="https:\/\/example.com\/a.jpg"[^>]*width="160"/);
  assert.match(html, /style="display:block;border:0;outline:none;height:auto;max-width:100%"/);
  assert.doesNotMatch(html, /<svg/);
});

test("Background: ROOT becomes the 600px frame with only email-safe ROOT classes", () => {
  const html = render(tree([n("Text", { text: "A" })], { className: "bg-base-200 min-h-dvh flex overflow-x-hidden" }));
  assert.match(html, /<td align="center" class="bg-base-200">/);
  assert.match(html, /<!--\[if mso\]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" align="center">/);
  assert.match(html, /style="max-width:600px;margin:0 auto"/);
});
