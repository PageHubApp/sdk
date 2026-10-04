import { useEffect } from "react";

const DRAFT_STYLE_ID = "ph-site-anim-draft";

/**
 * Keeps `css` in a dedicated `<style id="ph-site-anim-draft">` while mounted,
 * so a preview can play an unsaved site animation before the theme CSS has it.
 * Removed on unmount.
 */
export function useDraftPreviewCSS(css: string) {
  useEffect(() => {
    let el = document.getElementById(DRAFT_STYLE_ID) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = DRAFT_STYLE_ID;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }, [css]);
  useEffect(() => () => document.getElementById(DRAFT_STYLE_ID)?.remove(), []);
}
