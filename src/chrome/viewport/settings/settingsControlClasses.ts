/**
 * Shared control chrome for Site Settings / Page Settings modals.
 * Uses DaisyUI's standard `input` / `select` / `textarea` classes — same
 * styling as every other input across the editor (Media Manager, etc.).
 * Density / padding / radius / focus ring all flow from
 * `daisyui-spatial`'s overrides, so themes stay consistent.
 */
export const SETTINGS_INPUT_CLASS = "input w-full placeholder:text-neutral-content";

export const SETTINGS_SELECT_CLASS = "select w-full";

export const SETTINGS_TEXTAREA_CLASS =
  "textarea w-full min-h-[4.5rem] resize-y placeholder:text-neutral-content";

/** Back-compat: returns the canonical textarea class regardless of `base`. */
export function settingsMultilineInputClass(_base: string) {
  return SETTINGS_TEXTAREA_CLASS;
}

/** Back-compat: select already gets the right sizing from `.select`. */
export function settingsModalSelectClass(selectBase: string) {
  return selectBase;
}
