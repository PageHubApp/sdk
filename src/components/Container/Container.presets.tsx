/**
 * Container — toolbox preset catalog.
 *
 * Concatenates the per-family arrays from `presets/catalog/*` and registers them
 * once under the "Container" component. The spread order below is the toolbox
 * render order (categories render in first-appearance order; items within a
 * category in array order) — keep it stable to preserve the +Blocks panel layout.
 *
 * Child-building logic lives in `presets/*` (builders); the catalog metadata
 * lives in `presets/catalog/*` (arrays). Registration stays HERE — a single
 * `registerPresets("Container", ...)` call. Do NOT self-register from the
 * catalog files.
 */
import type { ComponentPreset } from "../../define/types";
import {
  basePresets,
  componentPresets,
  overlayPresets,
  listPresets,
  tablePresets,
  dividerPresets,
  navigationPresets,
  buttonPresets,
  imagePresets,
  gridPresets,
} from "./presets/catalog";
import { registerPresets } from "../../define/catalogRegistry";

export const containerPresets: ComponentPreset[] = [
  ...basePresets,
  ...componentPresets,
  ...overlayPresets,
  ...listPresets,
  ...tablePresets,
  ...dividerPresets,
  ...navigationPresets,
  ...buttonPresets,
  ...imagePresets,
  ...gridPresets,
];

registerPresets("Container", containerPresets);
