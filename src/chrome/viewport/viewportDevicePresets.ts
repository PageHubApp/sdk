/**
 * Default responsive preview device frames (viewport chrome).
 *
 * Prefer `PageHubConfig.viewportDevicePresets` (see `PageHubProvider` / `PageHub.init`).
 * `setViewportDevicePresets` remains for tests or non-React embeds.
 */

export type ViewportDevicePreset = {
  name: string;
  width: number;
  height: number;
  dpr: number;
};

export const DEFAULT_VIEWPORT_DEVICE_PRESETS = [
  { name: "iPhone 12 Pro", width: 390, height: 844, dpr: 3 },
  { name: "iPhone 12 Pro Max", width: 428, height: 926, dpr: 3 },
  { name: "iPhone SE", width: 375, height: 667, dpr: 2 },
  { name: "iPhone 13 Mini", width: 375, height: 812, dpr: 3 },
  { name: "iPhone 14", width: 390, height: 844, dpr: 3 },
  { name: "iPhone 14 Pro", width: 393, height: 852, dpr: 3 },
  { name: "iPhone 14 Pro Max", width: 430, height: 932, dpr: 3 },
  { name: "Pixel 5", width: 393, height: 851, dpr: 2.75 },
  { name: "Pixel 7", width: 412, height: 915, dpr: 2.625 },
  { name: "Samsung Galaxy S21", width: 360, height: 800, dpr: 3 },
  { name: "Samsung Galaxy S22", width: 360, height: 780, dpr: 3 },
  { name: "iPad Mini", width: 744, height: 1133, dpr: 2 },
  { name: "iPad Air", width: 820, height: 1180, dpr: 2 },
  { name: 'iPad Pro 11"', width: 834, height: 1194, dpr: 2 },
  { name: "Custom", width: 375, height: 667, dpr: 2 },
] as const satisfies readonly ViewportDevicePreset[];

/** Stock list; same data as {@link DEFAULT_VIEWPORT_DEVICE_PRESETS}. */
export const VIEWPORT_DEVICE_PRESETS = DEFAULT_VIEWPORT_DEVICE_PRESETS;

let viewportDevicePresetsOverride: readonly ViewportDevicePreset[] | null = null;

function getActiveViewportDevicePresetsInternal(): readonly ViewportDevicePreset[] {
  return viewportDevicePresetsOverride ?? DEFAULT_VIEWPORT_DEVICE_PRESETS;
}

/** Active preset table (host override or default). */
export function getViewportDevicePresets(): readonly ViewportDevicePreset[] {
  return getActiveViewportDevicePresetsInternal();
}

/**
 * Imperative override. Prefer `PageHubConfig.viewportDevicePresets`.
 * Empty arrays are ignored (defaults kept).
 */
export function setViewportDevicePresets(next: readonly ViewportDevicePreset[]): void {
  if (!Array.isArray(next) || next.length === 0) {
    if (Array.isArray(next) && next.length === 0) {
      console.warn("[PageHub] viewportDevicePresets: empty array ignored; using defaults");
    }
    viewportDevicePresetsOverride = null;
    return;
  }
  viewportDevicePresetsOverride = next;
}

export function resetViewportDevicePresets(): void {
  viewportDevicePresetsOverride = null;
}
