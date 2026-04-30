/**
 * PeekTargetButton — eye toggle for class-based show-hide targets.
 *
 * Used both inside the show-hide editor sub-form (next to the target picker)
 * and on the show-hide chip-row (so authors can preview without opening the
 * editor). Reads the live state via `useShowHideVersion()` so the icon flips
 * the moment the target's class changes.
 *
 * Two visual sizes:
 *   - "lg" (default) — full-height button next to the picker input.
 *   - "sm" — compact 5×5 chip-row affordance, matches Chip's X size.
 */
import { useEditor } from "@craftjs/core";
import { TbEye, TbEyeOff } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { getShowHideState, toggleShowHideState, useShowHideVersion } from "@/utils/showHideStore";
import { resolveAnchorsForNode } from "@/utils/anchors/resolveAnchorsViaCraft";

interface Props {
  target: string | undefined;
  size?: "sm" | "lg";
  /** Owning node id — used to resolve `{{anchor.X}}` tokens via ancestor walk. */
  ownerNodeId?: string;
}

export function PeekTargetButton({ target, size = "lg", ownerNodeId }: Props) {
  useShowHideVersion();
  // Owner not always threaded down — fall back to the editor's current
  // selection, since the toolbar always belongs to the selected node.
  const { query, selectedId } = useEditor((state, q) => ({
    selectedId: q.getEvent("selected").first() as string | undefined,
  }));
  const ownerId = ownerNodeId ?? selectedId;
  const resolvedTarget = resolveAnchorsForNode(target, ownerId, query);
  const disabled = !resolvedTarget;
  // Treat unknown state as "hidden" — most show-hide targets ship with `hidden`
  // in their authored className (modal backdrops, drawers, accordion panels).
  const shown = resolvedTarget ? getShowHideState(resolvedTarget) === "shown" : false;
  const sizeClass =
    size === "sm" ? "size-5 rounded-md" : "px-2 rounded-md border border-base-300 bg-base-200/50";
  const Icon = shown ? TbEye : TbEyeOff;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => resolvedTarget && toggleShowHideState(resolvedTarget)}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={shown ? "Hide target in editor" : "Show target in editor"}
      className={`text-neutral-content hover:bg-base-200 hover:text-base-content inline-flex shrink-0 items-center justify-center transition-colors disabled:opacity-40 ${sizeClass}`}
      aria-label={shown ? "Hide target in editor" : "Show target in editor"}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
