/**
 * Global z-index scale for all portaled / fixed-position editor chrome.
 * Everything lives here — no scattered magic numbers.
 *
 * Scale (all under 100, matches Tailwind's z-0…z-50 spirit):
 *   10  canvas badges / lint dots
 *   15  canvas drag handles (resize, padding, gap, rotate)
 *   20  floating canvas widgets
 *   30  inline editing tools (variable suggestion, inline toolbar panels)
 *   60  anchored popovers (Modifiers, theme chips, etc.)
 *   65  context insert panel
 *   67  context component flyout
 *   70  dialogs & modals (page settings, layers, font picker, design vars)
 *   75  media manager
 *   80  toolbar dropdowns
 *   85  unified dropdown / type selector
 *   90  assistant menu
 *   91  assistant submenu
 *   95  drag preview & drop indicators (above everything during drag)
 *   98  critical modals (confirm, image crop, media preview/edit)
 *   99  tooltips
 */

export const OVERLAY_Z_LINT_BADGE = 10;
export const OVERLAY_Z_CANVAS_CONTROLS = 15;
export const OVERLAY_Z_FLOATING_WIDGET = 20;
export const OVERLAY_Z_INLINE_TOOLS = 30;
export const OVERLAY_Z_ANCHORED = 60;
export const OVERLAY_Z_CONTEXT_INSERT_PANEL = 65;
export const OVERLAY_Z_CONTEXT_COMPONENT_FLYOUT = 67;
export const OVERLAY_Z_MODAL = 70;
export const OVERLAY_Z_MEDIA_MANAGER = 75;
export const OVERLAY_Z_TOOLBAR_DROPDOWN = 80;
export const OVERLAY_Z_UNIFIED_DROPDOWN = 85;
export const OVERLAY_Z_TYPE_SELECTOR = 85;
export const OVERLAY_Z_ASSISTANT_MENU = 90;
export const OVERLAY_Z_ASSISTANT_SUBMENU = 91;
export const OVERLAY_Z_DRAG = 95;
export const OVERLAY_Z_CRITICAL_MODAL = 98;
export const OVERLAY_Z_TOOLTIP = 99;
