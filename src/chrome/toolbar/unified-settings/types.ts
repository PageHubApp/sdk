import { ComponentType, ReactElement, ReactNode } from "react";
import type { ComponentModifier } from "../../../define";

/**
 * Toolbar config — lives on each component's .craft.toolbar.
 * Everything is ON by default. Only declare what to hide or override.
 */

export type HideKey =
  // Appearance granular
  | "textColor"
  | "bgColor"
  | "placeholderColor"
  | "font"
  | "background"
  | "pattern"
  | "border"
  | "shadow"
  | "radius"
  | "opacity"
  | "cursor"
  | "ringOutline"
  // Whole-tab hides
  | "hoverClick"
  | "animations"
  | "effectsClass"
  | "accessibility"
  | "modifiers"
  // Style granular
  | "typeInput"
  | "importExport";

export interface ToolbarConfig {
  /** Icon component, element, or legacy string name */
  icon?: string | ReactElement | ComponentType;
  /** Component-specific settings panel content */
  settings: ComponentType;
  /** Component-specific advanced settings content (e.g. Modal ID) */
  advancedSettings?: ComponentType;
  /** Keys to hide — everything ON by default */
  hide?: HideKey[];
  /** Swap custom JSX for any accordion section by title */
  override?: Record<string, ReactNode>;
  /** Hover variant (default "container") */
  hover?: "text" | "container" | "button" | "link";
  /** Custom layout JSX override (unified settings use the registry by default) */
  layout?: ReactNode | (() => ReactNode) | "spacing" | "hidden";
  /** Composable className modifiers from defineComponent() */
  modifiers?: ComponentModifier[];
  /** Extra toolbar chrome from defineComponent({ toolbarExtra }) */
  toolbarExtra?: ReactNode;
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
