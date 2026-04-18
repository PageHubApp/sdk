export type { SettingsSectionEntry, SectionProps, SettingsTab } from "./types";
export { registerSection, getSections, getSection } from "./settingsRegistry";
export { SettingsSearchAtom, HiddenKeysAtom } from "./atoms";

// Property registry — public API
export type {
  PropertyDef,
  PropertyInput,
  SectionDef,
  SectionId,
  PropertyInputProps,
} from "./propertyDefs";
export {
  registerProperties,
  overrideProperty,
  unregisterProperty,
  registerSectionDef,
  unregisterSectionDef,
  getSectionDefs,
  getSectionDef,
  getProperties,
  searchProperties,
} from "./propertyRegistry";

// Register all built-in property definitions
import "./properties";
