import { useEffect, useState } from "react";
import { phStorage } from "../../../utils/phStorage";

/**
 * Site light/dark mode for the editor preview. Stored in `phStorage["theme"]`.
 * Mount effect picks saved preference (or `prefers-color-scheme`); the toggle
 * suppresses transitions during the switch to avoid oklch interpolation
 * artifacts on the chrome.
 */
export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = phStorage.get("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    setIsDarkMode(shouldBeDark);

    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);

    document.documentElement.classList.add("theme-transition");

    if (newTheme) {
      document.documentElement.classList.add("dark");
      phStorage.set("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      phStorage.set("theme", "light");
    }

    requestAnimationFrame(() => document.documentElement.classList.remove("theme-transition"));
  };

  return { isDarkMode, toggleTheme };
}
