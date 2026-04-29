/**
 * Resolve the portal target for overlays.
 * Prefers `.pagehub-sdk-root` (editor container) to ensure all portaled
 * overlays render within the same stacking context.
 */
export function getPortalTarget(target?: HTMLElement | null): HTMLElement {
  if (target) return target;
  if (typeof document === "undefined") return null as unknown as HTMLElement;
  return (
    (document.querySelector(".pagehub-sdk-root") as HTMLElement | null) ?? document.body
  );
}
