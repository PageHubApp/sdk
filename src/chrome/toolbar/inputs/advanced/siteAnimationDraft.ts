/**
 * Editable draft of a site animation. Keyframe styles are row arrays (not
 * records) so a property can be swapped without reordering, and every stop /
 * row carries a stable id for React keys. `fromDraft` turns it back into the
 * stored `SiteAnimation` shape that `validateSiteAnimation` checks.
 */
import type { SiteAnimation } from "@/utils/animations/siteAnimations";

export interface DraftRow {
  id: number;
  prop: string;
  value: string;
}

export interface DraftStop {
  id: number;
  at: number;
  rows: DraftRow[];
}

export interface SiteAnimationDraft extends Omit<SiteAnimation, "keyframes"> {
  keyframes: DraftStop[];
}

let nextId = 1;
export const draftId = () => nextId++;

export const draftRow = (prop = "opacity", value = ""): DraftRow => ({ id: draftId(), prop, value });

export function toDraft(a: SiteAnimation): SiteAnimationDraft {
  return {
    ...a,
    keyframes: a.keyframes.map(f => ({
      id: draftId(),
      at: f.at,
      rows: Object.entries(f.style).map(([prop, value]) => draftRow(prop, value)),
    })),
  };
}

export function fromDraft(d: SiteAnimationDraft): SiteAnimation {
  const { keyframes, ...rest } = d;
  return {
    ...rest,
    label: d.label.trim(),
    keyframes: keyframes.map(f => ({
      at: f.at,
      style: Object.fromEntries(f.rows.map(r => [r.prop, r.value.trim()])),
    })),
  };
}

export function emptyDraft(): SiteAnimationDraft {
  return {
    key: "",
    label: "",
    trigger: "scroll",
    duration: 0.6,
    easing: "easeOut",
    iterations: 1,
    keyframes: [
      { id: draftId(), at: 0, rows: [draftRow("opacity", "0")] },
      { id: draftId(), at: 100, rows: [draftRow("opacity", "1")] },
    ],
  };
}

/** Label → unique key slug matching SITE_ANIMATION_KEY_RE (`^[a-z][a-z0-9-]{0,39}$`). */
export function slugifyAnimationKey(label: string, taken: string[]): string {
  let base = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[^a-z]+/, "")
    .replace(/-+$/, "")
    .slice(0, 36);
  if (!base) base = "animation";
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let i = 2;
  while (used.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/** Validator message → wording for the editor ("keyframes[1].style.opacity: …" → "Stop 2, opacity: …"). */
export function friendlyAnimationError(message: string): string {
  return message
    .replace(/\.style: must be a non-empty object$/, ": add at least one property")
    .replace(/: unsafe or empty value$/, ": enter a value without < > { } ; or url()")
    .replace(/^keyframes\[(\d+)\]\.at:/, (_, i) => `Stop ${Number(i) + 1} position:`)
    .replace(/^keyframes\[(\d+)\]\.style\./, (_, i) => `Stop ${Number(i) + 1}, `)
    .replace(/^keyframes\[(\d+)\]/, (_, i) => `Stop ${Number(i) + 1}`)
    .replace(/^keyframes:/, "Stops:")
    .replace(/^label: .*/, "Name: enter a name of up to 60 characters")
    .replace(/^(\w)(\w*):/, (_, a: string, b: string) => `${a.toUpperCase()}${b}:`);
}
