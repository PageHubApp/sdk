/**
 * @pagehub/sdk — Utility barrel export
 *
 * Re-exports all extracted utilities so components can import from
 * a single location: `import { TailwindStyles, motionIt } from "../utils";`
 */

// Tailwind class generation
export {
    CSStoObj, TailwindStyles, applyAnimation, fontWeightToNumber, fonts
} from "./tailwind/tailwind";

// Component utility functions
export {
    applyBackgroundImage,
    applyPattern, collectFont, getBackgroundUrl, getFontFromComp,
    loadCombinedFonts, motionIt, replaceVariables, resolveOverlayGradient, resolvePageRef, variants
} from "./lib";

// Clone helpers
export { getClonedState, setClonedProps } from "./cloneHelper";

// Palette context
export { PaletteProvider, usePalette } from "./design/PaletteContext";

// Click controls
export { addClickControls } from "./clickControls";
export type { ClickControl } from "./clickControls";

// Design system
export {
    generateDesignSystemCSSVariables,
    injectDesignSystemVars, toCSSVarName,
    toPaletteCSSVarName,
    toStyleCSSVarName
} from "./design/designSystemVars";

// Accessibility
export { getAccessibilityProps, mergeAccessibilityProps } from "./accessibility";
