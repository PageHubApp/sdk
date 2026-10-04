// ─── Site animation shape + constants ───────────────────────────────────────
//
// Kept apart from `siteAnimations.ts` so `animations.ts` can resolve `site:`
// keys without importing the sanitizer/emitter (which itself imports the
// easing map from `animations.ts`).

export type SiteAnimationTrigger = "scroll" | "load" | "continuous";

export type SiteAnimationDirection = "normal" | "reverse" | "alternate" | "alternate-reverse";

export interface SiteAnimationKeyframe {
  /** 0–100 (percent). Must include 0 and 100 after sorting. */
  at: number;
  /** CSS property → value. Property must be in SITE_ANIMATION_PROPERTIES. */
  style: Record<string, string>;
}

export interface SiteAnimation {
  /** Slug, unique per site: /^[a-z][a-z0-9-]{0,39}$/. Node key is `site:<key>`. */
  key: string;
  label: string;
  trigger: SiteAnimationTrigger;
  /** Seconds, 0.05–30. */
  duration: number;
  /** EASING_MAP key ("easeOut" …), a CSS easing keyword, or cubic-bezier(...)/steps(...). */
  easing: string;
  /** 1–20 or "infinite". */
  iterations: number | "infinite";
  direction?: SiteAnimationDirection;
  /** 2–12 stops. */
  keyframes: SiteAnimationKeyframe[];
}

export const SITE_ANIMATION_PREFIX = "site:";
export const SITE_ANIMATION_LIMIT = 50;
export const SITE_ANIMATION_KEY_RE = /^[a-z][a-z0-9-]{0,39}$/;
export const SITE_ANIMATION_TRIGGERS: readonly SiteAnimationTrigger[] = [
  "scroll",
  "load",
  "continuous",
];
export const SITE_ANIMATION_DIRECTIONS: readonly SiteAnimationDirection[] = [
  "normal",
  "reverse",
  "alternate",
  "alternate-reverse",
];
export const SITE_ANIMATION_MIN_KEYFRAMES = 2;
export const SITE_ANIMATION_MAX_KEYFRAMES = 12;
export const SITE_ANIMATION_MIN_DURATION = 0.05;
export const SITE_ANIMATION_MAX_DURATION = 30;
export const SITE_ANIMATION_MAX_ITERATIONS = 20;

/** Class (and `@keyframes` name) emitted for a site animation slug. */
export const siteAnimationClass = (key: string) => `ph-a-${key}`;
