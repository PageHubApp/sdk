/**
 * Resolve `{{anchor.X}}` tokens in an action object's string fields. Pure —
 * returns a new action when any field changes, otherwise returns the input
 * unchanged so React reference equality stays cheap.
 *
 * Fields that may carry anchor tokens (mirrors the union in `./action.ts`):
 *  - `target`   on show-hide
 *  - `anchor`   on open-modal / scroll-to
 *  - `key`      on set-state / toggle-state / clear-state /
 *               increment-state / decrement-state / set-local-storage /
 *               remove-local-storage
 *  - `value`    on set-state (template strings can reference an anchor)
 *  - `field`    on agent-send (rare, but consistent)
 *  - `dismissTarget` on toggle-theme
 *
 * Token format intentionally narrow: `{{anchor.<name>}}` with `<name>` matching
 * `[a-zA-Z0-9_-]+`. Strings without `{{anchor.` are fast-pathed.
 */

import type { NodeAction } from "../action";
import { type AnchorMap, hasAnchorToken, resolveAnchors } from "./anchorContext";

const ANCHORED_FIELDS = [
  "target",
  "anchor",
  "key",
  "value",
  "field",
  "dismissTarget",
] as const;

export function resolveAnchorsInAction(
  action: NodeAction,
  anchors: AnchorMap
): NodeAction {
  if (!action || typeof action !== "object") return action;
  let next: any = null;
  for (const field of ANCHORED_FIELDS) {
    const raw = (action as any)[field];
    if (typeof raw !== "string") continue;
    if (!hasAnchorToken(raw)) continue;
    const resolved = resolveAnchors(raw, anchors);
    if (resolved === raw) continue;
    if (!next) next = { ...action };
    next[field] = resolved;
  }
  return (next as NodeAction) || action;
}

export function resolveAnchorsInActions(
  actions: NodeAction[] | NodeAction | null | undefined,
  anchors: AnchorMap
): NodeAction[] | NodeAction | null | undefined {
  if (!actions) return actions;
  if (!Array.isArray(actions)) return resolveAnchorsInAction(actions, anchors);
  let changed = false;
  const out = actions.map(a => {
    const r = resolveAnchorsInAction(a, anchors);
    if (r !== a) changed = true;
    return r;
  });
  return changed ? out : actions;
}
