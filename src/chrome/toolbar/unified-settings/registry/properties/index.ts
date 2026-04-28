/**
 * Property definitions barrel — registers all built-in sections and properties.
 *
 * Import this module to ensure all definitions are registered.
 * Order doesn't matter — sections and properties are sorted by sortOrder.
 */
import { registerProperties, registerSectionDef } from "../propertyRegistry";
import { BUILT_IN_SECTIONS } from "./sectionDefs";
import { typographyProperties } from "./typography";
import { backgroundProperties } from "./background";
import { imageSettingsProperties } from "./imageSettings";
import { appearanceProperties } from "./appearance";
import { effectsProperties } from "./effects";
import { layoutProperties } from "./layout";
import { displayProperties } from "./display";
import { ariaProperties } from "./aria";
import { advancedProperties } from "./advanced";
import { alignmentProperties } from "./alignment";
import { interactionProperties } from "./interactions";
import { modifiersProperties } from "./modifiers";
import { presetProperties } from "./preset";

// Register all built-in sections
for (const section of BUILT_IN_SECTIONS) {
  registerSectionDef(section);
}

// Register all built-in properties
registerProperties([
  ...typographyProperties,
  ...backgroundProperties,
  ...imageSettingsProperties,
  ...appearanceProperties,
  ...effectsProperties,
  ...layoutProperties,
  ...displayProperties,
  ...ariaProperties,
  ...advancedProperties,
  ...alignmentProperties,
  ...interactionProperties,
  ...modifiersProperties,
  ...presetProperties,
]);

// Re-export for direct access
export { BUILT_IN_SECTIONS } from "./sectionDefs";
export { typographyProperties } from "./typography";
export { backgroundProperties } from "./background";
export { imageSettingsProperties } from "./imageSettings";
export { appearanceProperties } from "./appearance";
export { effectsProperties } from "./effects";
export { layoutProperties } from "./layout";
export { displayProperties } from "./display";
export { ariaProperties } from "./aria";
export { advancedProperties } from "./advanced";
export { alignmentProperties } from "./alignment";
export { interactionProperties } from "./interactions";
export { modifiersProperties } from "./modifiers";
