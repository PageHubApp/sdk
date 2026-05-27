import { useEffect } from "react";
import { useAtomState } from "@zedux/react";
import { DarkModeAtom } from "../../../utils/atoms";
import { phStorage } from "../../../utils/phStorage";

/**
 * Site light/dark mode for the editor preview. Source of truth is
 * `DarkModeAtom` (Phase 2 C2b lift) so the `ph.ui.toggleDarkMode` command can
 * flip it from outside React. The hook hydrates the atom from
 * `phStorage["theme"]` + `prefers-color-scheme` on first mount, and a
 * separate effect mirrors the atom into the `<html>` class + phStorage on
 * every change. Transitions are suppressed during the switch to avoid oklch
 * interpolation artifacts on the chrome.
 */
export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useAtomState(DarkModeAtom);

  // Hydrate from phStorage + system preference once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = phStorage.get("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDarkMode(shouldBeDark);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror atom -> DOM + phStorage on every change (also covers external sets
  // from `ph.ui.toggleDarkMode` invoked outside React).
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.add("theme-transition");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      phStorage.set("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      phStorage.set("theme", "light");
    }
    const id = requestAnimationFrame(() =>
      document.documentElement.classList.remove("theme-transition")
    );
    return () => cancelAnimationFrame(id);
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  return { isDarkMode, toggleTheme };
}
