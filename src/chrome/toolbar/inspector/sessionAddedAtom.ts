/**
 * Session-only "added but no value yet" set.
 *
 * When user clicks `+ Add` on a property whose input has no clean default
 * (universal/color/etc.), we add `${nodeId}:${propId}` here so PropertyRow
 * renders the row immediately, even before any value is set. Once the user
 * actually sets a value, hasValue takes over and this entry becomes redundant.
 *
 * Cleared on full editor reload — intentional. If the user adds a row and
 * navigates away without setting a value, the row disappears next session.
 */
import { atom } from "@zedux/react";

export const SessionAddedAtom = atom<Set<string>>("settingsSessionAdded", new Set<string>());

export const sessionKey = (nodeId: string, propId: string) => `${nodeId}:${propId}`;
