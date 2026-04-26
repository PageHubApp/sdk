import type { ComponentType, ReactNode } from "react";
import type { HideKey, ToolbarConfig } from "../types";

/** Which top-level tab group a section belongs to */
export type SettingsTab = "component" | "layout" | "design" | "interactions" | "advanced";

/** Props passed to every section component by the registry renderer */
export interface SectionProps {
  /** The resolved ToolbarConfig for the selected node */
  toolbar: ToolbarConfig | undefined;
  /** Convenience: Set<HideKey> from toolbar.hide[] */
  hidden: Set<HideKey>;
}

/** A single registry entry — one accordion section in the settings panel */
export interface SettingsSectionEntry {
  /** Unique ID, e.g. "typography", "background", "border" */
  id: string;
  /** Display title shown in the accordion header */
  title: string;
  /** Which tab this section lives under */
  tab: SettingsTab;
  /** Icon element for the accordion header */
  icon?: ReactNode;
  /** Searchable keywords (lowercase). Searched alongside title. */
  keywords: string[];
  /** The React component that renders the section body */
  component: ComponentType<SectionProps>;
  /** If set, this section is hidden when the HideKey is in toolbar.hide[] */
  hideKey?: HideKey;
  /** Whether the accordion starts open (default: false) */
  defaultOpen?: boolean;
  /** Sort order within its tab (lower = higher). Default 100. */
  sortOrder?: number;
  /** Help tooltip text */
  help?: string;
  /** If true, this section only appears in search results — not in the normal tab view.
   *  Used for sub-sections of monolithic components (e.g. Spacing inside Layout). */
  searchOnly?: boolean;
  /** When true, this section is hidden in Content mode (only shown in Design mode). */
  advanced?: boolean;
}
