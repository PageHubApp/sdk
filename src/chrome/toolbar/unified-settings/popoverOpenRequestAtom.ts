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
import { atom, useAtomValue } from "@zedux/react";
import { useEffect, useRef } from "react";

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

/**
 * Listen for popover-open requests targeting (nodeId, defId) and fire
 * `onOpen` exactly once per bump. Init to 0 (NOT current version) so a
 * dispatch fired while the trigger was unmounted still opens the panel on
 * its first mount — see editor-popover-pattern.md §4.
 *
 * Used by every section-header `+` picker (Action / Handlers / Conditions /
 * State / Modifiers) so PropertySection's empty-state title click —
 * dispatched via AccordionAddMenu.open() → requestOpenPopover — pops the
 * picker. Picker-side: pass `() => popoverRef.current?.open()` (or a
 * direct create-callback for menuless pickers like State).
 */
export function useSectionPopoverOpenRequest(
  nodeId: string,
  defId: string,
  onOpen: () => void,
) {
  const popoverRequests = useAtomValue(PopoverOpenRequestAtom);
  const version = popoverRequests.get(popoverRequestKey(nodeId, defId)) || 0;
  const lastVersionRef = useRef(0);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  useEffect(() => {
    if (version === 0 || version === lastVersionRef.current) return;
    lastVersionRef.current = version;
    onOpenRef.current();
  }, [version]);
}
