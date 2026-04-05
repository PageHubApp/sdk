// @ts-nocheck
import { ComponentType, ReactNode } from "react";

/**
 * Toolbar config — lives on each component's .craft.toolbar.
 * Everything is ON by default. Only declare what to disable or override.
 */

export type DisableKey =
  // Appearance granular
  | "textColor" | "bgColor" | "placeholderColor" | "font" | "background" | "pattern"
  | "border" | "shadow" | "radius" | "opacity" | "cursor" | "ringOutline"
  // Whole-tab disables
  | "hoverClick" | "animations" | "effectsClass" | "accessibility"
  // Style granular
  | "typeInput" | "importExport";

export interface ToolbarConfig {
  /** Icon name string — resolved to a component in UnifiedSettings */
  icon?: string;
  /** Component-specific first-tab content */
  mainTab: ComponentType;
  /** Component-specific advanced-tab content (Icon, Anchor, etc.) */
  mainTabAdvanced?: ComponentType;
  /** Keys to disable — everything ON by default */
  disable?: DisableKey[];
  /** Swap custom JSX for any accordion section by title */
  override?: Record<string, ReactNode>;
  /** HoverClick variant (default "container") */
  hoverClickVariant?: "text" | "container" | "button" | "link";
  /** Custom layout JSX (default is <LayoutInput />) */
  layout?: ReactNode | "spacing" | "hidden";
  /** Extra JSX appended to Style tab */
  styleExtra?: ReactNode;
}

// ─── Head Item (tab bar) ─────────────────────────────────────────────

export interface HeadItem {
  title: string;
  icon: ReactNode;
}

// ─── Section Item (scrollable body) ──────────────────────────────────

export interface SectionItem {
  title: string;
  children: ReactNode;
}
