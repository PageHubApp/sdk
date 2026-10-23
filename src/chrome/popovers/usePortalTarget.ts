/**
 * The portal target for an overlay primitive (`Modal`, `AnchoredPopover`):
 * the given element, else `document.body`.
 */
export function usePortalTarget(target?: HTMLElement | null): HTMLElement {
  if (target) return target;
  if (typeof document === "undefined") return null as unknown as HTMLElement;
  return document.body;
}
