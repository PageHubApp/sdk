/** Shared control chrome for Site Settings / Page Settings modals (matches SettingsShell content pane). */
export const SETTINGS_INPUT_CLASS =
  "w-full rounded-lg border border-base-300 bg-base-200 px-4 py-2 text-sm text-base-content shadow-sm placeholder:text-neutral-content transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-primary hover:bg-base-300/25 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50";

export const SETTINGS_SELECT_CLASS =
  "w-full cursor-pointer rounded-lg border border-base-300 bg-base-200 px-2 py-2 text-xs text-base-content shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/50";

export function settingsMultilineInputClass(base: string) {
  return `${base} min-h-[4.5rem] resize-y leading-relaxed`;
}

/** Native `<select>` aligned with modal text fields (taller than compact toolbar selects). */
export function settingsModalSelectClass(selectBase: string) {
  return `${selectBase} min-h-10 px-3 py-2 text-sm`;
}
