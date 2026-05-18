/** Anchor + non-anchor link navigation (covers `scroll-to` legacy + unified `link`). */
import type { NodeAction } from "../../action";
import { fireConversion } from "../conversion";
import { actionGatePasses } from "../gates";
import { ActionContext, chain } from "../internal";

export function attachLink(
  prop: any,
  action: NodeAction,
  enabled: boolean,
  context?: ActionContext
): boolean {
  // Anchor link — `scroll-to` or unified `link` with `href: "#…"`. Special
  // anchor keywords: `"top"` scrolls the window to the page top (used by
  // pagination + back-to-top buttons without needing a real DOM element).
  const anchor =
    action.type === "scroll-to"
      ? action.anchor
      : action.type === "link" && typeof action.href === "string" && action.href.startsWith("#")
        ? action.href.slice(1)
        : null;
  if (anchor) {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      e.preventDefault();
      if (anchor === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      // Anchor scroll happens immediately; fire-and-forget conversion.
      fireConversion(action.conversion);
    });
    return true;
  }

  // Link (non-anchor) — programmatic navigation. Caller passes the resolved
  // href on `context.resolvedLinkHref` so ref:/page interpolation is honored.
  if (action.type === "link") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      const href = context?.resolvedLinkHref || action.href;
      if (!href) return;
      e.preventDefault();
      if (action.target === "_blank") {
        // Popup must open synchronously within the user-gesture handler —
        // do NOT defer through event_callback (popup blockers will kill it).
        window.open(href, "_blank", "noopener,noreferrer");
        fireConversion(action.conversion);
      } else {
        // Same-tab navigation — defer through event_callback (+1 s safety
        // timer inside fireConversion) so the gtag beacon flushes first.
        fireConversion(action.conversion, { navigate: () => window.location.assign(href) });
        // When no conversion is set, fireConversion navigates synchronously.
      }
    });
    return true;
  }

  return false;
}
