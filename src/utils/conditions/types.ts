/** Condition source categories */
export type ConditionType =
  | "url-param"
  | "form-field"
  | "connector"
  | "company"
  | "device"
  | "auth"
  | "item";

/** Comparison operators */
export type Operator =
  | "equals"
  | "not-equals"
  | "contains"
  | "not-contains"
  | "exists"
  | "not-exists"
  | "greater-than"
  | "less-than";

/** A single condition rule */
export interface Condition {
  type: ConditionType;
  /** Dot-path key — meaning depends on type:
   *  - url-param: param name (e.g. "ref")
   *  - form-field: field name
   *  - connector: dot-path like "stripe.products"
   *  - company: field name like "name", "email", "phone"
   *  - device: always "viewport"
   *  - auth: dot-path like "status", "customer.hasSubscription", "customer.orderCount"
   *  - item: dot-path into the current repeater item (e.g. "description", "metadata.sizes", "priceRange") */
  key: string;
  operator: Operator;
  /** Comparison value. For device: "mobile" | "desktop". Ignored for exists/not-exists. */
  value: string;
  /** For form-field: the element anchor/ID to watch */
  target?: string;
}

/** AND / OR logic for combining conditions within a group */
export type ConditionLogic = "all" | "any";

/** A group of conditions with shared logic (AND/OR).
 *  Multiple groups are OR'd together (Elementor-style). */
export interface ConditionGroup {
  conditions: Condition[];
  logic: ConditionLogic;
}

/** Runtime context for evaluating conditions */
export interface ConditionContext {
  urlParams: URLSearchParams | null;
  formFields: Record<string, string> | null;
  connectorData: Record<string, { bindings: Record<string, any[]> }> | null;
  company: Record<string, any> | null;
  viewportWidth: number | null;
  auth: import("../design/variables").AuthState | null;
  /** Current repeater item (populated inside ItemProvider). Null at top level. */
  item: Record<string, any> | null;
  /**
   * Pixel threshold below which `device: mobile` evaluates true. Defaults to 768
   * (Tailwind `md`) when not set. Per-site override via `theme.breakpoints.md`.
   */
  mobileBreakpoint?: number;
}

/** Branch definition for ConditionalContainer */
export interface ConditionBranch {
  label: string;
  conditions: Condition[];
  conditionLogic: ConditionLogic;
}

/** Operators that don't need a comparison value */
export const NO_VALUE_OPERATORS: Operator[] = ["exists", "not-exists"];

/** Operators available per condition type */
export const OPERATORS_BY_TYPE: Record<ConditionType, Operator[]> = {
  "url-param": ["equals", "not-equals", "contains", "not-contains", "exists", "not-exists"],
  "form-field": ["equals", "not-equals", "contains", "not-contains", "exists", "not-exists"],
  connector: ["exists", "not-exists", "greater-than", "less-than", "equals"],
  company: ["exists", "not-exists", "equals", "not-equals"],
  device: ["equals"],
  auth: ["equals", "not-equals", "exists", "not-exists", "greater-than", "less-than"],
  item: ["exists", "not-exists", "equals", "not-equals", "contains", "greater-than", "less-than"],
};

/** Human-readable labels for operators */
export const OPERATOR_LABELS: Record<Operator, string> = {
  equals: "Equals",
  "not-equals": "Not equals",
  contains: "Contains",
  "not-contains": "Doesn't contain",
  exists: "Exists",
  "not-exists": "Doesn't exist",
  "greater-than": "Greater than",
  "less-than": "Less than",
};
