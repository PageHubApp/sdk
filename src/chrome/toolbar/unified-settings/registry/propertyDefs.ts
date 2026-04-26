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
  | "size"
  | "typography"
  | "background"
  | "styles"
  | "border"
  | "decoration"
  | "hover-click"
  | "conditions"
  | "animations"
  | "effects"
  | "scroll-effect"
  | "overflow-scroll"
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
  /** When true, this section is hidden in Content mode (only shown in Design mode). */
  advanced?: boolean;
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
      /**
       * React component that renders the control. Accepts a direct component
       * reference or a string key into the customInputs registry.
       */
      component: ComponentType<PropertyInputProps> | string;
    }
  | {
      type: "bundle";
      /**
       * Compound property — renders a single chip in the section, opens a
       * popover with the inner properties when clicked. Removing the chip
       * clears every child tag. Used for Ring, Outline, Shadow stacks, etc.
       */
      properties: PropertyDef[];
      /** Optional leading icon shown on the chip + popover header. Omit when no semantically appropriate icon exists. */
      icon?: ReactNode;
    }
  | {
      type: "shorthand";
      /**
       * One or more modes. The toggle shows one icon per mode in array order.
       * Initial mode = the most-specific mode that has any value set;
       * else the first mode. Switching modes clears tags from the modes left behind.
       */
      modes: ShorthandMode[];
      /** TailwindStyles key applied to every input unless overridden per-mode/per-slot. */
      tailwindKey?: string;
      /** CSS-var picker prefix. Pass to enable the var selector on all inputs. */
      varSelectorPrefix?: string;
      /** Allowed value types for all inputs. */
      allowedTypes?: ValueType[];
    };

export interface ShorthandMode {
  /** Unique id within the property (e.g. "uniform", "axes", "sides", "corners"). */
  id: string;
  /** Icon shown in the mode toggle. */
  icon: ReactNode;
  /** Accessible label for the toggle button. */
  ariaLabel: string;
  /**
   * Tailwind prefixes this mode owns. One slot = one input.
   * Uniform modes typically have a single tag; split modes have 2-4.
   */
  tags: string[];
  /** Short labels per slot (e.g. [""], ["X","Y"], ["T","R","B","L"]). Length must match `tags`. */
  labels: string[];
  /** Per-slot TailwindStyles keys — defaults to outer `tailwindKey`. */
  tailwindKeys?: string[];
  /** Number of grid columns in the expanded row. Defaults to `tags.length`. */
  columns?: number;
}

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
  /**
   * Optional disambiguator shown on the right side of the +Add picker row.
   * Use when multiple properties in the same section share a `label`
   * (e.g. Ring "Width" vs Outline "Width" — set `groupLabel: "Ring"` / `"Outline"`).
   */
  groupLabel?: string;
  /** When true, this property is hidden in Content mode (only shown in Design mode). */
  advanced?: boolean;
  /**
   * Framer-style add/remove model: properties are hidden by default unless `pinned`
   * is true. Hidden properties become visible when (a) they have a value, (b) the
   * user adds them via the `+` menu, or (c) they're in `node.props.toolbarOrder`.
   */
  pinned?: boolean;
  /**
   * Default value written when the user adds this property via the `+` menu.
   * Format depends on `input.type`:
   *  - tailwind-select / tailwind-radio / select → exact class string or option value
   *  - universal → tailwind class with prefix (e.g. "blur-sm")
   *  - color → tailwind color class (e.g. "bg-base-200")
   *  - checkbox → automatically uses `input.on` (no defaultValue needed)
   *  - text → string
   *  - custom → owner decides; AccordionAddMenu calls input.onAdd if provided
   */
  defaultValue?: string;
  /** Help tooltip text */
  help?: string;
}
