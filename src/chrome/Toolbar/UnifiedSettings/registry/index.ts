export type { SettingsSectionEntry, SectionProps, SettingsTab } from "./types";
export { registerSection, getSections, getSection } from "./settingsRegistry";
export { SettingsSearchAtom } from "./atoms";

// Register all standard sections at import time
import "./standardSections";
