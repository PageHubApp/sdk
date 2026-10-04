import test from "node:test";
import assert from "node:assert/strict";
import {
  SITE_ANIMATION_LIMIT,
  SITE_ANIMATION_STARTERS,
  generateSiteAnimationCSS,
  sanitizeSiteAnimations,
  validateSiteAnimation,
  type SiteAnimation,
} from "./siteAnimations";
import { describeSiteAnimationKey, getCSSAnimationProps, isCSSAnimation } from "./animations";
import { generateDesignSystemCSSVariables } from "../design/designSystemVars";
import { resolveTheme } from "../design/resolveTheme";
import { generateThemeVars } from "../../render/static/themeCss";
import { stripUnusedKeyframes } from "../../compile-css/transforms/stripKeyframes";

const base = (over: Partial<SiteAnimation> = {}): SiteAnimation => ({
  key: "rise",
  label: "Rise",
  trigger: "scroll",
  duration: 0.6,
  easing: "easeOut",
  iterations: 1,
  keyframes: [
    { at: 0, style: { opacity: "0", transform: "translateY(20px)" } },
    { at: 100, style: { opacity: "1", transform: "translateY(0)" } },
  ],
  ...over,
});

const withValue = (value: string) =>
  base({
    keyframes: [
      { at: 0, style: { opacity: value } },
      { at: 100, style: { opacity: "1" } },
    ],
  });

test("sanitizer keeps a valid animation", () => {
  assert.deepEqual(sanitizeSiteAnimations([base()]), [base()]);
  assert.deepEqual(validateSiteAnimation(base()), []);
});

test("sanitizer never throws on junk input", () => {
  for (const junk of [null, undefined, 1, "x", {}, [null, 1, "x", [], {}]]) {
    assert.deepEqual(sanitizeSiteAnimations(junk), []);
  }
});

test("sanitizer drops injection attempts in values", () => {
  for (const v of [
    "0}</style><script>alert(1)</script>",
    "url(https://evil.test/x.png)",
    "URL(x)",
    "0; background: red",
    "0{",
    "0 /* c */",
    "@import 'x'",
    "expression(alert(1))",
    "image-set('a.png' 1x)",
    "-webkit-image(x)",
    "0\\3c",
    "",
  ]) {
    assert.deepEqual(sanitizeSiteAnimations([withValue(v)]), [], `should drop ${JSON.stringify(v)}`);
  }
  // Palette tokens stay allowed.
  assert.equal(sanitizeSiteAnimations([withValue("var(--primary)")]).length, 1);
});

test("sanitizer drops non-allowlisted properties", () => {
  const a = base({
    keyframes: [
      { at: 0, style: { width: "0" } },
      { at: 100, style: { width: "100%" } },
    ],
  });
  assert.deepEqual(sanitizeSiteAnimations([a]), []);
  assert.match(validateSiteAnimation(a).join("\n"), /width: property not allowed/);
});

test("sanitizer drops bad keys, duplicates and enforces the limit", () => {
  for (const key of ["", "Rise", "1rise", "rise_up", "a".repeat(41), "rise:x", "-rise"]) {
    assert.deepEqual(sanitizeSiteAnimations([base({ key })]), [], `key ${key}`);
  }
  assert.equal(sanitizeSiteAnimations([base({ key: "a".repeat(40) })]).length, 1);
  const dup = sanitizeSiteAnimations([base(), base({ label: "Second" })]);
  assert.equal(dup.length, 1);
  assert.equal(dup[0].label, "Rise");
  const many = Array.from({ length: SITE_ANIMATION_LIMIT + 5 }, (_, i) => base({ key: `a${i}` }));
  assert.equal(sanitizeSiteAnimations(many).length, SITE_ANIMATION_LIMIT);
});

test("sanitizer enforces keyframe, duration, iteration and easing rules", () => {
  const bad: Partial<SiteAnimation>[] = [
    { keyframes: [{ at: 0, style: { opacity: "0" } }] },
    { keyframes: [{ at: 0, style: { opacity: "0" } }, { at: 50, style: { opacity: "1" } }] },
    {
      keyframes: Array.from({ length: 13 }, (_, i) => ({
        at: i === 12 ? 100 : i,
        style: { opacity: "1" },
      })),
    },
    { duration: 0.01 },
    { duration: 31 },
    { iterations: 0 },
    { iterations: 21 },
    { iterations: 1.5 },
    { easing: "bounce" },
    { easing: "cubic-bezier(0,0,1,1);x" },
    { trigger: "hover" as never },
    { direction: "sideways" as never },
    { label: "" },
  ];
  for (const over of bad) {
    assert.deepEqual(sanitizeSiteAnimations([base(over)]), [], JSON.stringify(over));
  }
  for (const easing of ["linear", "ease", "spring", "cubic-bezier(0.2, 0, 0, 1)", "steps(4, end)"]) {
    assert.equal(sanitizeSiteAnimations([base({ easing })]).length, 1, easing);
  }
  assert.equal(sanitizeSiteAnimations([base({ iterations: "infinite" })]).length, 1);
});

test("sanitizer sorts keyframes and strips unknown fields", () => {
  const input = {
    ...base(),
    extra: "x",
    keyframes: [
      { at: 100, style: { opacity: "1" } },
      { at: 0, style: { opacity: "0" } },
    ],
  };
  const [out] = sanitizeSiteAnimations([input]);
  assert.deepEqual(
    out.keyframes.map(f => f.at),
    [0, 100]
  );
  assert.equal("extra" in out, false);
});

test("emitter output", () => {
  assert.equal(generateSiteAnimationCSS([]), "");
  assert.equal(generateSiteAnimationCSS(undefined), "");
  const css = generateSiteAnimationCSS([
    base(),
    base({
      key: "spin-x",
      trigger: "continuous",
      easing: "linear",
      iterations: "infinite",
      direction: "alternate",
      keyframes: [
        { at: 100, style: { rotate: "360deg" } },
        { at: 0, style: { rotate: "0deg" } },
      ],
    }),
  ]);
  assert.equal(
    css,
    [
      "@keyframes ph-a-rise{0%{opacity:0;transform:translateY(20px)}100%{opacity:1;transform:translateY(0)}}",
      ".ph-a-rise{animation-name:ph-a-rise;animation-duration:0.6s;animation-timing-function:ease-out;animation-iteration-count:1;animation-direction:normal;animation-fill-mode:both}",
      "@keyframes ph-a-spin-x{0%{rotate:0deg}100%{rotate:360deg}}",
      ".ph-a-spin-x{animation-name:ph-a-spin-x;animation-duration:0.6s;animation-timing-function:linear;animation-iteration-count:infinite;animation-direction:alternate;animation-fill-mode:both}",
      ".ph-a-spin-x.ph-anim-scroll{animation-play-state:running}",
      '@media (prefers-reduced-motion: reduce){[class*="ph-a-"]{animation:none!important}}',
    ].join("\n")
  );
});

test("emitter skips invalid entries", () => {
  const css = generateSiteAnimationCSS([base(), withValue("</style>")]);
  assert.equal(css.includes("</style>"), false);
});

test("starters are all valid with unique keys", () => {
  assert.equal(sanitizeSiteAnimations(SITE_ANIMATION_STARTERS).length, SITE_ANIMATION_STARTERS.length);
  for (const key of ["fade-up", "scale-up", "line-draw", "fill", "march", "flow", "pulse"]) {
    assert.ok(SITE_ANIMATION_STARTERS.some(s => s.key === key), key);
  }
});

test("getCSSAnimationProps resolves site: keys", () => {
  assert.equal(isCSSAnimation("site:foo"), true);
  assert.equal(isCSSAnimation("site:"), false);
  assert.deepEqual(getCSSAnimationProps("site:foo"), {
    className: "ph-a-foo ph-anim-scroll",
    style: {},
  });
  assert.equal(getCSSAnimationProps("site:foo", { trigger: "load" }).className, "ph-a-foo");
  assert.equal(getCSSAnimationProps("site:foo", { trigger: "continuous" }).className, "ph-a-foo");
  assert.deepEqual(getCSSAnimationProps("nope"), { className: "", style: {} });
});

test("iterations override maps to animationIterationCount", () => {
  const count = (iterations: string | null) =>
    getCSSAnimationProps("cssFadeUp", { iterations }).style.animationIterationCount;
  assert.equal(count("loop"), "infinite");
  assert.equal(count("once"), "1");
  assert.equal(count("3"), "3");
  assert.equal(count("junk"), undefined);
  assert.equal(count(null), undefined);
  assert.equal(getCSSAnimationProps("site:foo", { iterations: "2" }).style.animationIterationCount, "2");
  // Hover presets have no animation to repeat.
  assert.deepEqual(getCSSAnimationProps("cssHoverGrow", { iterations: "loop" }).style, {});
});

test("easing override still maps named easings", () => {
  assert.equal(
    getCSSAnimationProps("cssFadeUp", { easing: "easeOut" }).style.animationTimingFunction,
    "ease-out"
  );
});

test("describeSiteAnimationKey", () => {
  assert.equal(describeSiteAnimationKey("site:rise", [{ key: "rise", label: "Rise" }]), "Rise");
  assert.equal(describeSiteAnimationKey("site:rise"), "rise");
  assert.equal(describeSiteAnimationKey("cssFadeUp"), "Fade Up");
  assert.equal(describeSiteAnimationKey("whatever"), "whatever");
});

test("theme emitters include site animations", () => {
  const props = { theme: { palette: [], animations: [base(), withValue("url(x)")] } };
  const theme = resolveTheme(props);
  assert.equal(theme.animations?.length, 1);
  const ds = generateDesignSystemCSSVariables(theme, "#viewport");
  assert.ok(ds.includes("@keyframes ph-a-rise{"));
  assert.ok(!ds.includes("#viewport .ph-a-rise"));
  assert.ok(generateThemeVars(props).includes(".ph-a-rise{animation-name:ph-a-rise;"));
  assert.ok(!generateDesignSystemCSSVariables(resolveTheme({}), ":root").includes("ph-a-"));
});

test("lean-mode keyframe stripping keeps site keyframes referenced by animation-name", () => {
  const css = generateSiteAnimationCSS([base()]);
  assert.equal(stripUnusedKeyframes(css), css);
});
