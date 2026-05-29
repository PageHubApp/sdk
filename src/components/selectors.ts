import type { BackgroundProps, DesignProps, RelationProps } from "./types";

export const RootClassGenProps = [];

export interface RootStyleProps {
  style?: string;
  animation?: string;
  animationDuration?: string;
  animationDelay?: string;
  animationEasing?: string;
  animationTrigger?: string;
  animationCSSName?: string;
  pattern?: any;
  patternVerticalPosition?: string;
  patternHorizontalPosition?: string;
  patternStroke?: string;
  patternZoom?: string;
  patternColorA?: string;
  patternAngle?: string;
  patternColorB?: string;
  patternSpacingX?: string;
  patternSpacingY?: string;
  preset?: string;
  presetPadding?: string;
  presetMaxWidth?: string;
  scrollTimeline?: {
    preset: string;
    startProgress: number;
    endProgress: number;
  };
}

export interface BaseSelectorProps {
  /** Relationship graph for linked component instances. See {@link RelationProps}. */
  relation?: RelationProps;
  className?: string;
  tools?: any;

  root?: RootStyleProps;
  activeTab?: number;
  children?: React.ReactNode;
  type?: string;
  custom?: object;
  displayName?: string;
  canDelete?: boolean;
  canEditName?: boolean;
  /** Background image configuration. See {@link BackgroundProps}. */
  background?: BackgroundProps;

  // Accessibility
  role?: string;
  "aria-label"?: string;
  "aria-hidden"?: string;
  "aria-describedby"?: string;
  "aria-live"?: "polite" | "assertive" | "off";

  /** Editor/AI only — design intent (notes + tags), merged with ROOT/ancestors in prompts. Not rendered. */
  design?: DesignProps;

  /**
   * State-bound modifier bindings. Each entry: `{ conditions, modifiers }`.
   * At render, conditions evaluate against the live registry/context — when
   * truthy, the named modifiers' classes are appended to className. The
   * generic primitive that drives "active when target shown" / "open when
   * paired modal visible" / etc. without per-component runtime code.
   * See packages/sdk/src/utils/conditions/stateModifiers.ts.
   */
  stateModifiers?: Array<{
    conditions: import("../utils/conditions/types").ConditionGroup[];
    modifiers: string[];
  }>;

  /**
   * Inline handler bodies keyed by React event prop names (`onClick`, …).
   * Values are small JS snippets compiled at runtime; see `addCustomHandlers`.
   */
  handlers?: Record<string, string>;
}

/**
 * Apply shared aria/accessibility attributes from BaseSelectorProps onto a rendered element's prop bag.
 */
export function applyAriaProps(prop: Record<string, any>, props: Partial<BaseSelectorProps>) {
  if (props.role) prop.role = props.role;
  if (props["aria-label"]) prop["aria-label"] = props["aria-label"];
  if (props["aria-hidden"]) prop["aria-hidden"] = props["aria-hidden"];
  if (props["aria-describedby"]) prop["aria-describedby"] = props["aria-describedby"];
  if (props["aria-live"]) prop["aria-live"] = props["aria-live"];
}

