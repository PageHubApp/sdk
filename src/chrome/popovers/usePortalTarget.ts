import { useSDKSafe } from "../../core/context";
import { getPortalTarget } from "./getPortalTarget";

/**
 * The portal target for an overlay primitive a host also renders outside the
 * editor (`Modal`, `AnchoredPopover`): the editor root when rendered inside
 * `<PageHubProvider>`, `document.body` otherwise.
 *
 * A host's own dialogs never land in the editor root: a host can keep the
 * editor mounted but hidden and `inert` (the dashboard does, between tabs),
 * and an overlay portalled in there would ignore every click.
 */
export function usePortalTarget(target?: HTMLElement | null): HTMLElement {
  const inEditor = !!useSDKSafe();
  if (target) return target;
  if (typeof document === "undefined") return null as unknown as HTMLElement;
  return inEditor ? getPortalTarget() : document.body;
}
