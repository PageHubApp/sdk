import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PageHubError } from "../../utils/errors";
import type { SerializedNodes } from "../static/types";
import { n, tree } from "./fixtures/tree";
import { renderEmailHTML, type RenderEmailResult } from "./renderEmailHTML";

/**
 * End-to-end: every fixture through `renderEmailHTML`, asserting on the final
 * HTML. Set `EMAIL_FIXTURE_OUT=<dir>` to also write each rendered email there
 * for eyeballing. Snapshots live in `renderEmailHTML.test.ts.snapshot`;
 * refresh with `--test-update-snapshots`.
 */

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const FIXTURES = ["one-column", "two-column", "three-column", "button-row", "image-text"];
const FORBIDDEN = ["oklch(", "var(", "lab(", "@layer", "<script"];

const loadFixture = (name: string): SerializedNodes =>
  JSON.parse(readFileSync(join(FIXTURES_DIR, `${name}.json`), "utf8"));

const rendered = new Map<string, Promise<RenderEmailResult>>();
function renderFixture(name: string): Promise<RenderEmailResult> {
  if (!rendered.has(name)) {
    rendered.set(
      name,
      renderEmailHTML({
        content: loadFixture(name),
        variables: { "customer.name": "Ada", "order.id": "A-1001" },
        preheader: "Your order is on its way",
        title: "Acme Supply Co.",
      })
    );
  }
  return rendered.get(name)!;
}

for (const name of FIXTURES) {
  test(`renderEmailHTML fixture ${name}: email-safe output`, async t => {
    const { html, text, warnings } = await renderFixture(name);
    const outDir = process.env.EMAIL_FIXTURE_OUT;
    if (outDir) {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, `${name}.html`), html);
    }

    for (const token of FORBIDDEN) assert.ok(!html.includes(token), `${name}: found ${token}`);
    assert.doesNotMatch(html, /display:\s*(inline-)?(flex|grid)/, `${name}: flex/grid display`);
    assert.deepEqual(warnings, []);
    assert.match(html, /^<!DOCTYPE html>/);
    assert.match(html, /max-width:\s*600px/);
    assert.match(html, /<div data-ph-preheader[^>]*>Your order is on its way<\/div>/);
    assert.ok(text.length > 0 && !text.includes("<") && !text.includes("Your order is on its way"));
    t.assert.snapshot(html);
  });
}

test("renderEmailHTML: the site primary wins over the SDK default", async () => {
  const { html } = await renderFixture("one-column");
  // Site Primary oklch(52% 0.19 256) lowers to #0065cc; the SDK default is oklch(14% 0 0).
  assert.match(html, /class="bg-primary[^"]*"[^>]*background-color: #0065cc/);
  assert.match(html, /bgcolor="#0065cc"/);
  assert.doesNotMatch(html, /#090909/);
});

test("renderEmailHTML: spatial padding resolves to px at density 1", async () => {
  const { html } = await renderFixture("one-column");
  // py-space-md = calc(clamp(1.5rem, 1rem + 1.5vw, 2rem) * 1) = 25px at 600px.
  assert.match(html, /class="bg-base-100 py-space-md[^"]*"[^>]*padding-top: 25px; padding-bottom: 25px/);
  // Stacked gap-space-sm → padding-top on rows after the first.
  assert.match(html, /padding-top:\s*12.5px/);
});

test("renderEmailHTML: variables interpolate; opacity colors lower to rgba", async () => {
  const { html, text } = await renderFixture("one-column");
  assert.match(html, /Hi Ada, your order shipped/);
  assert.match(html, /href="https:\/\/example.com\/track\/A-1001"/);
  assert.match(html, /color: rgba\(31, 41, 55, \.7\)/);
  assert.equal(
    text,
    [
      "Acme Supply Co.",
      "Hi Ada, your order shipped",
      "Everything you ordered is on its way. You can follow the delivery at any time.",
      "Track your order (https://example.com/track/A-1001)",
      "Questions? Reply to this email.",
    ].join("\n\n")
  );
});

test("renderEmailHTML: columns become ph-col cells that stack on phones", async () => {
  const { html } = await renderFixture("two-column");
  assert.equal((html.match(/<td class="ph-col" width="50%"/g) || []).length, 2);
  assert.match(html, /padding-left: 12.5px; padding-right: 12.5px/);
  assert.ok(
    html.includes(
      "@media (max-width:620px){.ph-col{display:block!important;width:100%!important;padding-left:0!important;padding-right:0!important}"
    )
  );
  const three = await renderFixture("three-column");
  assert.equal((three.html.match(/<td class="ph-col" width="33%"/g) || []).length, 3);
});

test("renderEmailHTML: hidden md:block shows on desktop and hides on phones", async () => {
  const { html } = await renderFixture("image-text");
  assert.match(html, /class="[^"]*ph-d-block ph-m-none"[^>]*display: block/);
});

test("renderEmailHTML: invalid trees throw EMAIL_RENDER_INVALID", async () => {
  const nodes = tree([n("Container", { className: "btn" }), n("Video", {})]);
  await assert.rejects(renderEmailHTML({ content: nodes }), (err: unknown) => {
    assert.ok(err instanceof PageHubError);
    assert.equal(err.code, "EMAIL_RENDER_INVALID");
    assert.match(err.message, /2 problem/);
    return true;
  });
});

test("renderEmailHTML: accepts a JSON string and replaces stored variables", async () => {
  const nodes = tree([n("Text", { text: "Hi {{variables.who}}!" })], {
    variables: [{ key: "who", value: "stored" }],
  });
  const { html, text } = await renderEmailHTML({ content: JSON.stringify(nodes) });
  assert.match(html, /Hi !/);
  assert.equal(text, "Hi !");
});

test("renderEmailHTML: site fonts and spacing density come from the full theme", async () => {
  const nodes = tree([n("Text", { tagName: "h1", className: "font-heading py-space-md", text: "Hi" })], {
    theme: {
      palette: [{ name: "Primary", color: "#0065cc" }],
      styleGuide: { spacingDensity: 2 },
      typography: [{ name: "Heading", fontFamily: "Space Grotesk", fontWeight: "700" }],
    },
  });
  const { html } = await renderEmailHTML({ content: nodes });
  assert.match(html, /font-family:\s*["']?Space Grotesk/, "heading font from theme.typography");
  assert.match(html, /padding-(top|block-start):\s*50px/, "py-space-md × density 2 = 50px");
});

test("renderEmailHTML: an image's width attribute fits its column", async () => {
  const img = (src: string) => n("Image", { type: "url", src, className: "w-full" });
  const nodes = tree([
    n("Container", { className: "flex flex-row" }, [img("https://x.test/a.png"), img("https://x.test/b.png")]),
    img("https://x.test/c.png"),
  ]);
  const { html } = await renderEmailHTML({ content: nodes });
  assert.match(html, /<img[^>]*src="https:\/\/x\.test\/a\.png"[^>]*width="300"/);
  assert.match(html, /<img[^>]*src="https:\/\/x\.test\/c\.png"[^>]*width="600"/);
});
