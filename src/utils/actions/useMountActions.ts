/**
 * Mount-time half of the action dispatcher: fires `trigger: "load"` actions
 * once and starts `trigger: "interval"` actions, for any component that takes
 * `props.action` (Container, Button, Link, Text, Image). Click / hover
 * triggers go through `addActionHandlers`, which skips these two.
 *
 * Editor mode (`enabled`) fires nothing. Runs once per mount; intervals are
 * cleared on unmount.
 */
import { useEffect } from "react";
import { actionTrigger, type NodeAction } from "../action";
import { fireIntervalActions } from "./interval";
import { fireLoadAction } from "./load";

export function useMountActions(actions: NodeAction[], enabled: boolean): void {
  useEffect(() => {
    if (enabled) return;
    actions.filter(a => actionTrigger(a) === "load").forEach(fireLoadAction);
    return fireIntervalActions(actions);
    // Mount-time only — a re-render must not re-fire load actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
