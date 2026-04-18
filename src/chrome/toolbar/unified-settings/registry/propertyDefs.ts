/**
 * Property definition types for the settings panel registry.
 *
 * Every controllable property in the sidebar is described by a PropertyDef.
 * Panels render declaratively from these definitions — no hand-coded JSX per panel.
 *
 * Public API: SDK consumers can register/override/remove properties and sections.
 */
import type { ComponentType, ReactNode } from "react";
import type { ValueType } from "../../inputs/universal-input/types";
import type { HideKey } from "../types";
import type { SettingsTab } from "./types";

// ─── Section Definition ────────────────────────────────────────────────────

/** All built-in section IDs. Extendable via string for custom sections. */
export type SectionId =
  | "component"
  | "modifiers"
  | "layout"
  | "alignment"
  | "spacing"
  | "size"
  | "typography"
  | "background"
  | "border"
  | "decoration"
  | "hover-click"
  | "conditions"
  | "animations"
  | "effects"
  | "scroll-effect"
  | "properties"
  | "aria"
  | "display"
  | "ai-context"
  | "import-export"
  | (string & {}); // allow custom IDs without losing autocomplete

/** Data-only section definition — no JSX, no component references. */
export interface SectionDef {
  /** Unique section ID */
  id: SectionId;
  /** Display title for accordion header */
  title: string;
  /** Which tab this section belongs to */
  tab: SettingsTab;
  /** Icon for accordion header */
  icon?: ReactNode;
  /** Search keywords (lowercase) */
  keywords: string[];
  /** If set, section is hidden when this key is in toolbar.hide[] */
  hideKey?: HideKey;
  /** Sort order within tab (lower = higher). Default 100. */
  sortOrder: number;
  /** Help tooltip text */
  help?: string;
  /** Only appears in search results, not normal tab view */
  searchOnly?: boolean;
  /** Accordion starts open */
  defaultOpen?: boolean;
  /** Column count for the "More X properties" advanced grid (default 1). Ignored when `advancedSubsections` is set. */
  advancedColumns?: number;
  /**
   * When set, advanced properties are split into nested sub-sections by their
   * `advancedGroup`. Each entry renders as its own collapsible nested ToolbarSection
   * (no card chrome, doesn't pollute the global toggleAll). Order follows the array.
   * Properties whose `advancedGroup` doesn't match any entry render as a final "Other".
   *
   * If this is set AND there is no main content (no main props), the "More X properties"
   * outer toggle is skipped — sub-sections render directly inside the section body.
   */
  advancedSubsections?: SectionAdvancedSubsection[];
  /** When true and `advancedSubsections` is set, skip the outer "More X properties" toggle. */
  skipAdvancedToggle?: boolean;
}

export interface SectionAdvancedSubsection {
  /** Matches `PropertyDef.advancedGroup` */
  id: string;
  /** Sub-section header label */
  title: string;
  /** Grid column count inside this sub-section (default 1) */
  columns?: number;
  /** Sub-section starts expanded (default true) */
  defaultOpen?: boolean;
}

// ─── Property Input Types ──────────────────────────────────────────────────

/** Option for radio/select inputs */
export interface InputOption {
  label: ReactNode;
  value: string;
}

/** Props passed to custom property input components */
export interface PropertyInputProps {
  def: PropertyDef;
  index?: string;
}

/** Discriminated union — how a property renders its control */
export type PropertyInput =
  | {
      type: "tailwind-select";
      /** Key in TailwindStyles object */
      tailwindKey: string;
      /** Optional prefix tag for class matching */
      propTag?: string;
      /** Show design var selector */
      showVarSelector?: boolean;
      /** Var selector prefix */
      varSelectorPrefix?: string;
    }
  | {
      type: "tailwind-radio";
      /** Key in TailwindStyles object */
      tailwindKey: string;
      /** Explicit options (overrides auto-generated from tailwindKey) */
      options?: InputOption[];
      /** Show as columns */
      cols?: boolean;
    }
  | {
      type: "universal";
      /** Prefix for Tailwind classes (e.g. "pt", "w", "gap") */
      propTag: string;
      /** Allowed value types */
      allowedTypes: ValueType[];
      /** Show design var selector */
      showVarSelector?: boolean;
      /** Label width class */
      labelWidth?: string;
      /** Key in TailwindStyles object for dropdown options */
      tailwindKey?: string;
      /** Explicit Tailwind options array (overrides tailwindKey) */
      tailwindOptions?: string[];
    }
  | {
      type: "color";
      /** Color class prefix (e.g. "bg", "text", "border", "divide") */
      prefix: string;
    }
  | {
      type: "checkbox";
      /** Class to apply when checked */
      on: string;
      /** Class to apply when unchecked (default: "") */
      off?: string;
    }
  | {
      type: "text";
      /** Placeholder text */
      placeholder?: string;
    }
  | {
      type: "select";
      /** Explicit options for the select dropdown */
      options: InputOption[];
    }
  | {
      type: "custom";
      /** React component that renders the control */
      component: ComponentType<PropertyInputProps>;
    };

// ─── Property Definition ───────────────────────────────────────────────────

export interface PropertyDef {
  /** Unique property ID. Matches TailwindStyles key where applicable. */
  id: string;
  /** Human-readable label shown in UI */
  label: string;
  /** Which section this property belongs to */
  section: SectionId;
  /** Search keywords beyond the label (lowercase) */
  keywords: string[];
  /** How to render the control */
  input: PropertyInput;
  /** propKey override — if different from id (e.g. for namespaced props) */
  propKey?: string;
  /** propType override (default: "class") */
  propType?: string;
  /** Responsive/state index (e.g. "hover", "sm", "md") */
  index?: string;
  /** HideKey — property hidden when this key is in toolbar.hide[] */
  hideKey?: HideKey;
  /** Sort order within section (lower = higher). Default 100. */
  sortOrder?: number;
  /** Only appears in search results, not in normal section view */
  searchOnly?: boolean;
  /** Render inline (label + input on same row) */
  inline?: boolean;
  /** Show only when condition is met */
  showWhen?: (className: string, props: Record<string, any>) => boolean;
  /** If set, property is hidden behind "More X properties" toggle */
  advancedGroup?: string;
  /** Help tooltip text */
  help?: string;
}
