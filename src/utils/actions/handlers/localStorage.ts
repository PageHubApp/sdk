import type { NodeAction } from "../../action";
import { actionGatePasses } from "../gates";
import { chain } from "../internal";
import { sdkLog } from "../../logger";

export function attachSetLocalStorage(prop: any, action: NodeAction, enabled: boolean) {
  if (action.type !== "set-local-storage") return;
  const sls = action as { type: "set-local-storage"; key: string; value: string };
  chain(prop, "onClick", (e, run) => {
    run(e);
    if (enabled) return;
    if (!actionGatePasses(action)) return;
    try {
      if (sls.key) window.localStorage.setItem(sls.key, sls.value ?? "");
    } catch (err) {
      sdkLog.warn("[PageHub] set-local-storage failed", err);
    }
  });
}

export function attachRemoveLocalStorage(prop: any, action: NodeAction, enabled: boolean) {
  if (action.type !== "remove-local-storage") return;
  const rls = action as { type: "remove-local-storage"; key: string };
  chain(prop, "onClick", (e, run) => {
    run(e);
    if (enabled) return;
    if (!actionGatePasses(action)) return;
    try {
      if (rls.key) window.localStorage.removeItem(rls.key);
    } catch (err) {
      sdkLog.warn("[PageHub] remove-local-storage failed", err);
    }
  });
}
