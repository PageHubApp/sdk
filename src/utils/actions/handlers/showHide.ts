import type { NodeAction } from "../../action";
import { actionGatePasses } from "../gates";
import { applyShowHide, chain, revertShowHide } from "../internal";

export function attachShowHide(prop: any, action: NodeAction, enabled: boolean) {
  if (action.type !== "show-hide") return;
  if (!action.target) return;

  const trigger = action.trigger || "click";

  if (trigger === "hover") {
    chain(prop, "onMouseEnter", (_e, run) => {
      run(_e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      applyShowHide(action);
    });
    chain(prop, "onMouseLeave", (_e, run) => {
      run(_e);
      if (enabled) return;
      if (!actionGatePasses(action)) return;
      revertShowHide(action);
    });
  }

  if (trigger === "click") {
    chain(prop, "onClick", (e, run) => {
      run(e);
      // Tab switching is presentation-only (no destructive state) — let it
      // run in editor mode so authors can preview/edit non-default panels
      // by clicking the tab button. All other show-hide directions stay
      // gated so a stray "hide nav" click can't disrupt editing.
      if (enabled && action.direction !== "tab") return;
      // Skip condition gating in editor mode — preview clicks shouldn't
      // depend on visitor state (auth/url-param/etc.) to demonstrate behavior.
      if (!enabled && !actionGatePasses(action)) return;
      applyShowHide(action, e);
    });
  }
}
