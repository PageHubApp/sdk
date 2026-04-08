import { atom } from "@zedux/react";

/** Current search query for settings filter */
export const SettingsSearchAtom = atom("settingsSearch", "");

/** Whether the search input is open/visible */
export const SettingsSearchOpenAtom = atom("settingsSearchOpen", false);
