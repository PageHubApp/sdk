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
import { TbEye, TbEyeOff } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { getShowHideState, toggleShowHideState, useShowHideVersion } from "@/utils/showHideStore";

interface Props {
  target: string | undefined;
  size?: "sm" | "lg";
}

export function PeekTargetButton({ target, size = "lg" }: Props) {
  useShowHideVersion();
  const disabled = !target;
  // Treat unknown state as "hidden" — most show-hide targets ship with `hidden`
  // in their authored className (modal backdrops, drawers, accordion panels).
  const shown = target ? getShowHideState(target) === "shown" : false;
  const sizeClass =
    size === "sm" ? "size-5 rounded-md" : "px-2 rounded-md border border-base-300 bg-base-200/50";
  const Icon = shown ? TbEye : TbEyeOff;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => target && toggleShowHideState(target)}
      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
      data-tooltip-content={shown ? "Hide target in editor" : "Show target in editor"}
      className={`text-neutral-content hover:bg-base-200 hover:text-base-content inline-flex shrink-0 items-center justify-center transition-colors disabled:opacity-40 ${sizeClass}`}
      aria-label={shown ? "Hide target in editor" : "Show target in editor"}
    >
      <Icon className="size-3.5" />
    </button>
  );
}
