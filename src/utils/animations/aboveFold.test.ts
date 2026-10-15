import test from "node:test";
import assert from "node:assert/strict";
import { withoutAboveFoldEntrances } from "./aboveFold";
import { renderToHTML } from "../../render/static/renderToHTML";

const box = (nodes: string[], props: Record<string, any> = {}) => ({
  type: { resolvedName: "Container" },
  props,
  nodes,
});
const anim = (animation: string, extra: Record<string, any> = {}) => ({
  root: { animation, animationDelay: "0.2", ...extra },
});

/** ROOT → header, a start-hidden modal, page (hero, below-fold section), footer. */
function tree() {
  return {
    ROOT: box(["header", "modal", "page", "footer"], {
      theme: { animations: [{ key: "pop", trigger: "load" }, { key: "spin", trigger: "continuous" }] },
    }),
    header: box(["logo"], { type: "header" }),
    logo: box([], anim("cssFadeIn")),
    modal: box([], { className: "hidden ph-overlay", ...anim("cssFadeUp") }),
    page: box(["hero", "below"], { type: "page" }),
    hero: box(["heroCard", "heroSite", "heroLoop", "heroMarquee"], anim("cssFadeUp")),
    heroCard: box([], anim("cssBlurIn")),
    heroSite: box([], anim("site:pop")),
    heroLoop: box([], anim("site:spin")),
    heroMarquee: box([], anim("cssMarquee")),
    below: box([], anim("cssFadeUp")),
    footer: box([], { type: "footer", ...anim("cssFadeUp") }),
  };
}

test("strips entrance animations from the header and first section only", () => {
  const out = withoutAboveFoldEntrances(tree());
  for (const id of ["logo", "hero", "heroCard", "heroSite"]) {
    assert.equal(out[id].props.root.animation, undefined, id);
    assert.equal(out[id].props.root.animationDelay, undefined, id);
  }
  assert.equal(out.heroLoop.props.root.animation, "site:spin");
  assert.equal(out.heroMarquee.props.root.animation, "cssMarquee");
  assert.equal(out.below.props.root.animation, "cssFadeUp");
  assert.equal(out.footer.props.root.animation, "cssFadeUp");
  assert.equal(out.modal.props.root.animation, "cssFadeUp");
});

test("a trigger override decides, not the preset", () => {
  const t = tree();
  t.heroCard.props.root.animationTrigger = "continuous";
  assert.equal(withoutAboveFoldEntrances(t).heroCard.props.root.animation, "cssBlurIn");
});

test("never mutates the input; returns it as-is when nothing to strip", () => {
  const t = tree();
  const snapshot = JSON.stringify(t);
  withoutAboveFoldEntrances(t);
  assert.equal(JSON.stringify(t), snapshot);

  const plain = { ROOT: box(["s"]), s: box([]) };
  assert.equal(withoutAboveFoldEntrances(plain), plain);
});

test("without page containers, the first non-header ROOT child is the hero", () => {
  const t = { ROOT: box(["hero", "next"]), hero: box([], anim("cssFadeUp")), next: box([], anim("cssFadeUp")) };
  const out = withoutAboveFoldEntrances(t);
  assert.equal(out.hero.props.root.animation, undefined);
  assert.equal(out.next.props.root.animation, "cssFadeUp");
});

test("static walker paints the hero without the paused scroll class", () => {
  const t = {
    ROOT: box(["hero", "next"]),
    hero: { type: { resolvedName: "Container" }, props: { className: "hero-x", ...anim("cssFadeUp") }, nodes: [] },
    next: { type: { resolvedName: "Container" }, props: { className: "next-x", ...anim("cssFadeUp") }, nodes: [] },
  };
  const { html } = renderToHTML(JSON.stringify(t), { compressed: false });
  assert.match(html, /class="[^"]*next-x[^"]*ph-anim-scroll/);
  assert.doesNotMatch(html, /class="[^"]*hero-x[^"]*animate-css/);
});
