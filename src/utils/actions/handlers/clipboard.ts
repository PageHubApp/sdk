import type { CopyToClipboardAction, NodeAction } from "../../action";
import { actionGatePasses } from "../gates";
import { ActionContext, chain, interpolateItem } from "../internal";

export function attachCopyToClipboard(
  prop: any,
  action: NodeAction,
  enabled: boolean,
  context?: ActionContext
) {
  if (action.type !== "copy-to-clipboard") return;
  const cc = action as CopyToClipboardAction;
  chain(prop, "onClick", async (e, run) => {
    run(e);
    if (enabled) return;
    if (!actionGatePasses(action)) return;
    const text = interpolateItem(cc.text, context?.itemContext);
    if (!text) return;
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch (err) {
      console.warn("[PageHub] copy-to-clipboard async API failed, falling back", err);
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.opacity = "0";
      ta.style.pointerEvents = "none";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    } catch (err) {
      console.warn("[PageHub] copy-to-clipboard fallback failed", err);
    }
  });
}
