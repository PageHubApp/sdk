import type { NodeAction, ToggleThemeAction } from "../../action";
import { phStorage } from "../../phStorage";
import { actionGatePasses } from "../gates";
import { chain, hideElement } from "../internal";

export function attachTheme(prop: any, action: NodeAction, enabled: boolean) {
  if (action.type !== "toggle-theme") return;
  chain(prop, "onClick", (e, run) => {
    run(e);
    if (enabled) return;
    if (!actionGatePasses(action)) return;
    e.preventDefault();
    const ta = action as ToggleThemeAction;
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.add("theme-transition");
    if (next) {
      document.documentElement.classList.add("dark");
      phStorage.set("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      phStorage.set("theme", "light");
    }
    requestAnimationFrame(() => {
      document.documentElement.classList.remove("theme-transition");
    });
    if (ta.dismissTarget) {
      const el = document.getElementById(ta.dismissTarget);
      if (el) hideElement(el as HTMLElement, ta.dismissMethod || "style");
    }
  });
}
