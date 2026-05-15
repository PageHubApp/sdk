import type { DownloadFileAction, NodeAction } from "../../action";
import { actionGatePasses } from "../gates";
import { ActionContext, chain, interpolateItem } from "../internal";

export function attachDownloadFile(
  prop: any,
  action: NodeAction,
  enabled: boolean,
  context?: ActionContext
) {
  if (action.type !== "download-file") return;
  const df = action as DownloadFileAction;
  chain(prop, "onClick", (e, run) => {
    run(e);
    if (enabled) return;
    if (!actionGatePasses(action)) return;
    const url = interpolateItem(df.url, context?.itemContext);
    if (!url) return;
    e.preventDefault();
    try {
      const a = document.createElement("a");
      a.href = url;
      const filename = interpolateItem(df.filename, context?.itemContext);
      if (filename) a.download = filename;
      else a.download = "";
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.warn("[PageHub] download-file failed", err);
    }
  });
}
