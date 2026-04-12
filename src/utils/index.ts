/**
 * @pagehub/sdk — Utility barrel export
 *
 * Re-exports all extracted utilities so components can import from
 * a single location: `import { TailwindStyles, motionIt } from "../utils";`
 */

// Tailwind class generation
export {
  CSStoObj,
  TailwindStyles,
  applyAnimation,
  fontWeightToNumber,
  fonts,
} from "./tailwind/tailwind";

// Component utility functions
export {
  applyBackgroundImage,
  applyPattern,
  collectFont,
  getBackgroundUrl,
  getFontFromComp,
  loadCombinedFonts,
  motionIt,
  replaceVariables,
  resolvePageRef,
  variants,
} from "./lib";

// Clone helpers
export { getClonedState, setClonedProps } from "./cloneHelper";

// Palette context
export { PaletteProvider, usePalette } from "./design/PaletteContext";

// Action system
export { addActionHandlers, addClickControls, initAccordionGroups } from "./clickControls";
export type { ClickControl } from "./clickControls";
export {
  migrateAction,
  actionToHref,
  actionTarget,
  isLinkAction,
  isHandlerAction,
  ACTION_TYPE_OPTIONS,
} from "./action";
export type { NodeAction, ActionType, LinkTarget } from "./action";

// Design system
export {
  generateDesignSystemCSSVariables,
  injectDesignSystemVars,
  toCSSVarName,
  toPaletteCSSVarName,
  toStyleCSSVarName,
} from "./design/designSystemVars";

// Accessibility
export { getAccessibilityProps, mergeAccessibilityProps } from "./accessibility";
