import type { NodeAction } from "../../action";
import { actionGatePasses } from "../gates";
import { chain, toggleElement } from "../internal";

export function attachModal(prop: any, action: NodeAction, enabled: boolean) {
  if (action.type !== "open-modal") return;
  chain(prop, "onClick", (e, run) => {
    run(e);
    if (enabled) return;
    if (!actionGatePasses(action)) return;
    e.preventDefault();
    // Modal preset is plain Container + show-hide — route through the
    // registry's visibility primitives. `data-modal` legacy attribute is
    // ignored (was dead code; saw the audit).
    const el = document.getElementById(action.anchor);
    if (el) toggleElement(el, "class");
  });
}
