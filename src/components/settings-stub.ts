/**
 * @pagehub/sdk — Settings panel stubs
 *
 * Legacy settings panels have been removed. This file retains shared
 * exports that are still referenced by editor chrome components.
 */

// Additional exports used by editor chrome
export const textPresets = [];
import { atom } from "@zedux/react";
export const SelectedButtonAtom = atom("selectedButton", null);
/** @deprecated Kept for chrome APIs; styling keys live in className reverse index (tailwind-styles). */
export const RootClassGenProps = [];
