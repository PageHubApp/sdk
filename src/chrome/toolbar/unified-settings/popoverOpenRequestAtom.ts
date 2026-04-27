/**
 * PopoverOpenRequest — bus for "open this property's popover NOW".
 *
 * AccordionAddMenu's single-option `+` (and PropertySection's empty-state
 * title click) dispatch into this atom. The matching popover trigger watches
 * its own key and opens itself whenever the version counter increments.
 *
 * Why a counter and not a boolean: the same trigger may need to be re-opened
 * many times in a session. A simple "is open" set would only fire once per
 * key. The counter lets every dispatch fire even if the value is unchanged.
 */
import { atom } from "@zedux/react";

export const PopoverOpenRequestAtom = atom<Map<string, number>>(
  "settingsPopoverOpenRequest",
  () => new Map<string, number>(),
);

export const popoverRequestKey = (nodeId: string, defId: string) => `${nodeId}:${defId}`;

export function requestOpenPopover(
  current: Map<string, number>,
  setRequests: (next: Map<string, number>) => void,
  nodeId: string,
  defId: string,
) {
  const key = popoverRequestKey(nodeId, defId);
  const next = new Map(current);
  next.set(key, (current.get(key) || 0) + 1);
  setRequests(next);
}
