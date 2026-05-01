import React from "react";
import {
  getLiveComponent,
  subscribeLive,
} from "../../../../utils/component/liveComponentRegistry";

/**
 * State-card pin: remove the `hidden` Tailwind token from the live DOM so
 * the natural display class (flex/grid/etc) takes over — without this, a
 * Dropdown panel with `hidden flex-col` would lose its flex layout.
 *
 * useLayoutEffect so the class change lands BEFORE the pin effect's first
 * apply() reads `offsetHeight`. Restore on unmount.
 */
export function useStateCardPin(containerId: string, isStatePin: boolean) {
  React.useLayoutEffect(() => {
    if (!isStatePin) return;
    const removed = new Set<HTMLElement>();
    // Reapply each tag run: parses className for the "open" display (e.g.
    // `group-focus-within:flex` → flex, `peer-checked:grid` → grid) so the
    // panel renders with its real layout, not block fallback.
    const detectOpenDisplay = (el: HTMLElement): string | null => {
      const tokens = el.className.split(/\s+/);
      for (const t of tokens) {
        const m = t.match(/:(inline-flex|inline-grid|inline-block|flex|grid|block)$/);
        if (m) return m[1];
      }
      return null;
    };
    const tag = () => {
      const el =
        getLiveComponent(containerId) ||
        (document.querySelector(`[node-id="${containerId}"]`) as HTMLElement | null);
      if (!el) return;
      el.setAttribute("data-canvas-state-pin", "true");
      if (el.classList.contains("hidden")) {
        el.classList.remove("hidden");
        removed.add(el);
      }
      const openDisplay = detectOpenDisplay(el);
      if (openDisplay) {
        el.style.setProperty("display", openDisplay, "important");
      }
    };
    tag();
    const unsub = subscribeLive(containerId, tag);
    return () => {
      unsub();
      const el =
        getLiveComponent(containerId) ||
        (document.querySelector(`[node-id="${containerId}"]`) as HTMLElement | null);
      if (el) {
        el.removeAttribute("data-canvas-state-pin");
        el.style.removeProperty("display");
      }
      for (const r of removed) r.classList.add("hidden");
    };
  }, [containerId, isStatePin]);
}
