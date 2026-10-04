// ─── Site animations — sanitizer, validator, CSS emitter ───────────────────
//
// A site defines its own animations in `ROOT.props.theme.animations`; nodes
// reference one as `root.animation: "site:<key>"`. The theme can be written
// by any client (editor, MCP, public v1 API) and the result lands inside a
// `<style>` tag on published sites, so the EMITTER is the security boundary:
// every list is sanitized right before it becomes CSS.

import allowedProperties from "../../data/site-animation-properties.json";
import { EASING_MAP, toTimingFunction } from "./animations";
import {
  SITE_ANIMATION_DIRECTIONS,
  SITE_ANIMATION_KEY_RE,
  SITE_ANIMATION_LIMIT,
  SITE_ANIMATION_MAX_DURATION,
  SITE_ANIMATION_MAX_ITERATIONS,
  SITE_ANIMATION_MAX_KEYFRAMES,
  SITE_ANIMATION_MIN_DURATION,
  SITE_ANIMATION_MIN_KEYFRAMES,
  SITE_ANIMATION_TRIGGERS,
  siteAnimationClass,
  type SiteAnimation,
  type SiteAnimationKeyframe,
} from "./siteAnimationConstants";

export * from "./siteAnimationConstants";
export { SITE_ANIMATION_STARTERS } from "./siteAnimationStarters";

/** CSS properties a keyframe may animate. No layout properties (width, top, margin …). */
export const SITE_ANIMATION_PROPERTIES: readonly string[] = allowedProperties;

const PROPERTY_SET = new Set(SITE_ANIMATION_PROPERTIES);
const MAX_LABEL_LENGTH = 60;
const MAX_VALUE_LENGTH = 200;
const FORBIDDEN_CHARS = /[<>{};\\@]/;
const FORBIDDEN_TOKENS = ["/*", "url(", "expression(", "image(", "image-set("];
const EASING_KEYWORDS = new Set([
  "ease",
  "ease-in",
  "ease-out",
  "ease-in-out",
  "linear",
  "step-start",
  "step-end",
]);
const NUM = String.raw`-?(?:\d+(?:\.\d+)?|\.\d+)`;
const CUBIC_BEZIER_RE = new RegExp(String.raw`^cubic-bezier\(\s*${NUM}(?:\s*,\s*${NUM}){3}\s*\)$`);
const STEPS_RE =
  /^steps\(\s*\d{1,3}\s*(?:,\s*(?:jump-start|jump-end|jump-none|jump-both|start|end)\s*)?\)$/;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/** Easing accepted by a site animation: EASING_MAP key, CSS keyword, cubic-bezier(), steps(). */
export function isValidSiteAnimationEasing(easing: unknown): easing is string {
  if (typeof easing !== "string") return false;
  return (
    easing in EASING_MAP ||
    EASING_KEYWORDS.has(easing) ||
    CUBIC_BEZIER_RE.test(easing) ||
    STEPS_RE.test(easing)
  );
}

/** Keyframe value safe to emit inside a `<style>` block. `var(--token)` is allowed. */
export function isSafeSiteAnimationValue(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const v = value.trim();
  if (!v || v.length > MAX_VALUE_LENGTH || FORBIDDEN_CHARS.test(v)) return false;
  const lower = v.toLowerCase();
  return !FORBIDDEN_TOKENS.some(t => lower.includes(t));
}

function keyframeErrors(frames: unknown): string[] {
  if (!Array.isArray(frames)) return ["keyframes: must be an array"];
  const errors: string[] = [];
  if (frames.length < SITE_ANIMATION_MIN_KEYFRAMES || frames.length > SITE_ANIMATION_MAX_KEYFRAMES) {
    errors.push(
      `keyframes: need ${SITE_ANIMATION_MIN_KEYFRAMES}–${SITE_ANIMATION_MAX_KEYFRAMES} stops (got ${frames.length})`
    );
  }
  const seen = new Set<number>();
  frames.forEach((f, i) => {
    if (!isRecord(f)) return void errors.push(`keyframes[${i}]: must be an object`);
    const at = f.at;
    if (typeof at !== "number" || !Number.isFinite(at) || at < 0 || at > 100) {
      errors.push(`keyframes[${i}].at: must be a number 0–100`);
    } else if (seen.has(at)) {
      errors.push(`keyframes[${i}].at: duplicate stop ${at}%`);
    } else {
      seen.add(at);
    }
    if (!isRecord(f.style) || Object.keys(f.style).length === 0) {
      return void errors.push(`keyframes[${i}].style: must be a non-empty object`);
    }
    for (const [prop, value] of Object.entries(f.style)) {
      if (!PROPERTY_SET.has(prop)) {
        errors.push(`keyframes[${i}].style.${prop}: property not allowed`);
      } else if (!isSafeSiteAnimationValue(value)) {
        errors.push(`keyframes[${i}].style.${prop}: unsafe or empty value`);
      }
    }
  });
  if (!seen.has(0) || !seen.has(100)) errors.push("keyframes: must include stops at 0 and 100");
  return errors;
}

/** MCP / editor friendly errors. Same rules as `sanitizeSiteAnimations`. `[]` = valid. */
export function validateSiteAnimation(a: unknown): string[] {
  if (!isRecord(a)) return ["animation: must be an object"];
  const errors: string[] = [];
  if (typeof a.key !== "string" || !SITE_ANIMATION_KEY_RE.test(a.key)) {
    errors.push(`key: must match ${SITE_ANIMATION_KEY_RE}`);
  }
  if (typeof a.label !== "string" || !a.label.trim() || a.label.length > MAX_LABEL_LENGTH) {
    errors.push(`label: must be a non-empty string of at most ${MAX_LABEL_LENGTH} characters`);
  }
  if (!SITE_ANIMATION_TRIGGERS.includes(a.trigger as never)) {
    errors.push(`trigger: must be one of ${SITE_ANIMATION_TRIGGERS.join(", ")}`);
  }
  const d = a.duration;
  if (
    typeof d !== "number" ||
    !Number.isFinite(d) ||
    d < SITE_ANIMATION_MIN_DURATION ||
    d > SITE_ANIMATION_MAX_DURATION
  ) {
    errors.push(
      `duration: must be ${SITE_ANIMATION_MIN_DURATION}–${SITE_ANIMATION_MAX_DURATION} seconds`
    );
  }
  if (!isValidSiteAnimationEasing(a.easing)) {
    errors.push(
      `easing: must be one of ${Object.keys(EASING_MAP).join(", ")}, a CSS easing keyword, cubic-bezier(...) or steps(...)`
    );
  }
  const it = a.iterations;
  if (
    it !== "infinite" &&
    !(Number.isInteger(it) && (it as number) >= 1 && (it as number) <= SITE_ANIMATION_MAX_ITERATIONS)
  ) {
    errors.push(`iterations: must be an integer 1–${SITE_ANIMATION_MAX_ITERATIONS} or "infinite"`);
  }
  if (a.direction !== undefined && !SITE_ANIMATION_DIRECTIONS.includes(a.direction as never)) {
    errors.push(`direction: must be one of ${SITE_ANIMATION_DIRECTIONS.join(", ")}`);
  }
  return errors.concat(keyframeErrors(a.keyframes));
}

/** Fresh copy holding only known fields, keyframes sorted by `at`. Input must be valid. */
function normalize(a: SiteAnimation): SiteAnimation {
  const keyframes: SiteAnimationKeyframe[] = a.keyframes
    .map(f => ({
      at: f.at,
      style: Object.fromEntries(Object.entries(f.style).map(([p, v]) => [p, v.trim()])),
    }))
    .sort((x, y) => x.at - y.at);
  return {
    key: a.key,
    label: a.label.trim(),
    trigger: a.trigger,
    duration: a.duration,
    easing: a.easing,
    iterations: a.iterations,
    ...(a.direction ? { direction: a.direction } : {}),
    keyframes,
  };
}

/**
 * Drops (never throws) invalid entries, duplicate keys and anything past
 * SITE_ANIMATION_LIMIT. Runs at EMIT time — the tree can be written by any
 * client, so the emitter, not the writer, is the boundary.
 */
export function sanitizeSiteAnimations(input: unknown): SiteAnimation[] {
  if (!Array.isArray(input)) return [];
  const out: SiteAnimation[] = [];
  const keys = new Set<string>();
  for (const entry of input) {
    if (out.length >= SITE_ANIMATION_LIMIT) break;
    if (validateSiteAnimation(entry).length) continue;
    const a = entry as SiteAnimation;
    if (keys.has(a.key)) continue;
    keys.add(a.key);
    out.push(normalize(a));
  }
  return out;
}

/**
 * `@keyframes ph-a-<key>` + `.ph-a-<key>` rule per animation, plus one
 * reduced-motion rule. Unscoped: keyframe names and classes are global.
 *
 * The class rule uses `animation-*` longhands, not the shorthand: the
 * shorthand resets `animation-play-state`, and depending on stylesheet order
 * would override the `.ph-anim-scroll` pause that holds scroll-triggered
 * animations until `.ph-in-view`.
 */
export function generateSiteAnimationCSS(input: unknown): string {
  const list = sanitizeSiteAnimations(input);
  if (!list.length) return "";
  const out: string[] = [];
  for (const a of list) {
    const name = siteAnimationClass(a.key);
    const frames = a.keyframes
      .map(f => `${f.at}%{${Object.entries(f.style).map(([p, v]) => `${p}:${v}`).join(";")}}`)
      .join("");
    out.push(`@keyframes ${name}{${frames}}`);
    const iterations = a.iterations === "infinite" ? "infinite" : String(a.iterations);
    out.push(
      `.${name}{animation-name:${name};animation-duration:${a.duration}s;` +
        `animation-timing-function:${toTimingFunction(a.easing)};` +
        `animation-iteration-count:${iterations};animation-direction:${a.direction ?? "normal"};` +
        `animation-fill-mode:both}`
    );
    // Default trigger lives in CSS, so render paths need no theme access.
    if (a.trigger !== "scroll") out.push(`.${name}.ph-anim-scroll{animation-play-state:running}`);
  }
  out.push(`@media (prefers-reduced-motion: reduce){[class*="ph-a-"]{animation:none!important}}`);
  return out.join("\n");
}
