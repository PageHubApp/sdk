import { atom } from "@zedux/react";
import type { HideKey } from "../types";

/** Current search query for settings filter */
export const SettingsSearchAtom = atom("settingsSearch", "");

/** Whether the search input is open/visible */
export const SettingsSearchOpenAtom = atom("settingsSearchOpen", false);

/** Hidden keys for the currently selected node (from toolbar.hide[]) */
export const HiddenKeysAtom = atom("hiddenKeys", () => new Set<HideKey>());
