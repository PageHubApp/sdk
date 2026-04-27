/**
 * Popover-mode registry — which custom-input component names render as a
 * trigger chip + FloatingPanel (vs inline). Used by AccordionAddMenu to
 * decide whether `+` should dispatch a popover open-request or fall back
 * to the legacy "add chip + auto-open" flow.
 */
const POPOVER_MODE = new Set<string>([
  "ActionInput",
  "AnimationsInput",
  "ConditionsInput",
  "GradientInput",
  "PatternInput",
]);

export function isPopoverModeComponent(component: string | unknown): boolean {
  return typeof component === "string" && POPOVER_MODE.has(component);
}
