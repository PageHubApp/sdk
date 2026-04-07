import { ComponentType, ReactElement, ReactNode } from "react";
import type { ComponentModifier } from "../../../define";

/**
 * Toolbar config — lives on each component's .craft.toolbar.
 * Everything is ON by default. Only declare what to disable or override.
 */

export type DisableKey =
  // Appearance granular
  | "textColor" | "bgColor" | "placeholderColor" | "font" | "background" | "pattern"
  | "border" | "shadow" | "radius" | "opacity" | "cursor" | "ringOutline"
  // Whole-tab disables
  | "hoverClick" | "animations" | "effectsClass" | "accessibility" | "modifiers"
  // Style granular
  | "typeInput" | "importExport";

export interface ToolbarConfig {
  /** Icon component, element, or legacy string name */
  icon?: string | ReactElement | ComponentType;
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
  /** Composable className modifiers from defineComponent() */
  modifiers?: ComponentModifier[];
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
