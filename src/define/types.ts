import React from "react";
import type { ToHTMLFn } from "../utils/staticHtml";

// ─── Public types ──────────────────────────────────────────────────────────

export interface PropSchema {
  /** Input type in the settings panel */
  type: "text" | "number" | "select" | "checkbox" | "slider" | "color" | "url" | "textarea";
  /** Human-readable label */
  label: string;
  /** Default value */
  default?: any;
  /** For select: the options list */
  options?: Array<{ label: string; value: string }>;
  /** For slider/number: min, max, step */
  min?: number;
  max?: number;
  step?: number;
  /** Help text shown below the input */
  description?: string;
  /** Group in settings panel. Default: "Content" */
  section?: string;
}

export interface PresetAddChildConfig {
  /** Button label, e.g. "Add Item" or "Add Tab". */
  label: string;
  /**
   * Returns a fresh `<Element>` tree (one new child) to append to the
   * preset wrapper. Each call MUST return a brand-new tree — the SDK
   * passes it through `query.parseReactElement().toNodeTree()` and
   * mutating shared trees breaks the editor.
   */
  template: () => React.ReactElement;
  /** Optional human-readable label for each existing child row in the editor list. */
  childLabel?: (childNode: any, index: number) => string;
}

export interface ComponentPreset {
  /** Label shown in the toolbox */
  label: string;
  /** Short description for the toolbox tooltip */
  description?: string;
  /** Override icon for this preset */
  icon?: string | React.ReactElement | React.ComponentType;
  /** Props applied when this preset is dropped */
  props?: Record<string, any>;
  /** Nested children for complex presets (nav menus, forms, etc.) */
  children?: React.ReactNode | (() => React.ReactNode);
  /**
   * Override the toolbox category for this specific preset. Defaults to
   * the host component's `category`. Use this when a preset variant
   * belongs in a different toolbox section than its component (e.g.
   * Container "Social Nav" lives under "Navigation").
   */
  category?: string;
  /**
   * When set, the dropped wrapper becomes editable as a list of children —
   * a Component-tab row with an Add Item / delete UI that mutates the
   * wrapper's children using the supplied factory. Functions don't survive
   * JSON, so this stays in module memory and is looked up by `preset.label`.
   */
  addChild?: PresetAddChildConfig;
}

export interface ComponentModifier {
  /** Modifier identifier. For single-class modifiers this IS the class (e.g. "btn-outline"). For composites it's a semantic name (e.g. "section-wrapper"). */
  name: string;
  /** Display label in the editor UI, e.g. "Outline" */
  label: string;
  /** Optional grouping for the UI, e.g. "Style", "Size", "Shape" */
  category?: string;
  /** When true, only one modifier in this category can be active at a time (radio behavior). */
  exclusive?: boolean;
  /** Base class that must be present for this modifier to work, e.g. "btn" for "btn-primary". Auto-added when toggling on. */
  requires?: string;
  /** Class patterns to remove when this modifier is toggled on. Supports exact matches and prefix patterns ending with * (e.g. "bg-*" removes all bg- classes). */
  removes?: string[];
  /** Multi-class composition. When set, toggling adds/removes ALL these classes instead of `name`. e.g. "flex flex-row gap-space-xs items-center w-full" */
  classes?: string;
  /** Extra utility classes applied when the modifier is toggled on (pattern presets). */
  expands?: string;
  /** Optional help text shown in the editor to explain what the modifier does. */
  description?: string;
  /**
   * Peer copy from sibling (e.g. new Button next to existing Buttons): `true` = participate when active on reference;
   * `false` = never (e.g. State modifiers). Omit = participate unless category is State (see applyPeerClassInherit).
   */
  peerInherit?: boolean;
  /**
   * Force a specific render type for the picker. By default the category
   * derives one from `exclusive`/length (≥5 → dropdown, ≥2 → pills, else
   * chips; Pattern always cards). Use this when long labels need card
   * rendering even though entries are exclusive radios.
   */
  renderAs?: "patterns" | "pills" | "dropdown" | "chips";
}

/** When set on a component def, new nodes can inherit className chrome from a sibling (schema-driven). */
export interface PeerInheritConfig {
  /** Parent `name` values that enable this behavior (e.g. `["Container"]`). */
  whenParentIs: string[];
  /** Pick reference sibling: left neighbor first, else right. */
  reference: "left-neighbor" | "right-neighbor";
}

export interface PageHubComponentDef<P extends Record<string, any> = Record<string, any>> {
  /** Unique component type name. Must be PascalCase. */
  name: string;

  /** Display name in the toolbox and settings. Defaults to spaced name. */
  displayName?: string;

  /** Short description for the toolbox tooltip (used when no presets define their own). */
  description?: string;

  /** The React component that renders this element. */
  component: React.ComponentType<P>;

  /** Static HTML renderer. Auto-generated fallback if omitted. */
  toHTML?: ToHTMLFn;

  /** Icon for the toolbox. react-icons name string, element, or component. */
  icon?: string | React.ReactElement | React.ComponentType;

  /** Toolbox category. Default: "Custom" */
  category?: string;

  /** Can hold child components? Default: false */
  canvas?: boolean;

  /** Main settings panel component. */
  settings?: React.ComponentType;

  /** Advanced settings tab (second tab). */
  advancedSettings?: React.ComponentType;

  /** Auto-generate settings panel from prop schema. Ignored if `settings` is provided. */
  props?: Record<string, PropSchema>;

  /** Sections of Inspector to hide. */
  disable?: string[];

  /** Special toolbar layout mode. */
  toolbarLayout?: "hidden" | string;

  /** Hover variant type for the interactions tab. */
  hoverClickVariant?: string;

  /** CraftJS rules. */
  rules?: {
    canDrag?: boolean | ((node?: any, helpers?: any) => boolean);
    canDelete?: boolean | ((node?: any) => boolean);
    canMoveIn?: (nodes: any[], into?: any) => boolean;
    canMoveOut?: boolean | ((node?: any) => boolean);
  };

  /** Inline editor tools (canvas overlays). Auto-generated if omitted. */
  tools?: React.ReactNode[] | ((props: any) => React.ReactNode[]);

  /** Optional JSX rendered next to toolbar chrome (e.g. header/footer toggles on Container). */
  toolbarExtra?: React.ReactNode;

  /** Group settings component (e.g. Image uses this). */
  groupSettings?: React.ComponentType<any>;

  /** Default props for new instances. */
  defaultProps?: Record<string, any>;

  /** Extra properties merged into .craft.props (for CraftJS default prop values). */
  craftProps?: Record<string, any>;

  /** Toolbox presets — each becomes a separate drag source in the sidebar. */
  presets?: ComponentPreset[];

  /** Modifiers — composable className toggles shown in the Design tab. */
  modifiers?: ComponentModifier[];

  /** Optional: inherit visual chrome from a same-name sibling when inserting into matching parent containers. */
  peerInherit?: PeerInheritConfig;
}

// ─── Resolved descriptor (internal) ────────────────────────────────────────

/** Brand symbol so we can distinguish descriptors from raw components */
export const COMPONENT_DEF_BRAND = Symbol.for("pagehub.componentDef");

export interface ResolvedComponentDef<P = any> {
  readonly [COMPONENT_DEF_BRAND]: true;
  readonly name: string;
  readonly displayName: string;
  readonly description: string | undefined;
  readonly component: React.ComponentType<P>;
  readonly toHTML: ToHTMLFn;
  readonly icon: string | React.ReactElement | React.ComponentType | undefined;
  readonly category: string;
  readonly canvas: boolean;
  readonly settings: React.ComponentType | undefined;
  readonly advancedSettings: React.ComponentType | undefined;
  readonly props: Record<string, PropSchema> | undefined;
  readonly disable: string[];
  readonly toolbarLayout: string | undefined;
  readonly hoverClickVariant: string | undefined;
  readonly rules: {
    canDrag: (node?: any, helpers?: any) => boolean;
    canDelete: (node?: any) => boolean;
    canMoveIn: (nodes: any[], into?: any) => boolean;
    canMoveOut?: (node?: any) => boolean;
  };
  readonly tools: React.ReactNode[] | ((props: any) => React.ReactNode[]) | undefined;
  readonly toolbarExtra: React.ReactNode | undefined;
  readonly groupSettings: React.ComponentType<any> | undefined;
  readonly defaultProps: Record<string, any>;
  readonly craftProps: Record<string, any>;
  readonly presets: ComponentPreset[];
  readonly modifiers: ComponentModifier[];
  readonly peerInherit: PeerInheritConfig | undefined;
}
