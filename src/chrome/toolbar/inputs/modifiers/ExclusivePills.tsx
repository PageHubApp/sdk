import { twMerge } from "tailwind-merge";
import { PH_TOOLBAR_DASHED_BTN_ACTIVE } from "../../phToolbarDashedSelection";
import type { ResolvedModifier } from "./useModifiers";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";

export function ExclusivePills({
  mods,
  isActive,
  onToggle,
  onHoverPreview,
}: {
  mods: ResolvedModifier[];
  isActive: (mod: ResolvedModifier) => boolean;
  onToggle: (mod: ResolvedModifier) => void;
  onHoverPreview?: (mod: ResolvedModifier) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {mods.map(mod => {
        const active = isActive(mod);
        return (
          <button
            key={mod.name}
            type="button"
            onClick={() => onToggle(mod)}
            onMouseEnter={onHoverPreview ? () => onHoverPreview(mod) : undefined}
            className={twMerge(
              "ph-toolbar-dashed-btn w-fit text-xs font-medium",
              active && PH_TOOLBAR_DASHED_BTN_ACTIVE
            )}
            title={mod.description ? undefined : mod.classes || mod.name}
            {...(mod.description
              ? {
                  "data-tooltip-id": PAGEHUB_RTT_GLOBAL_ID,
                  "data-tooltip-content": mod.description,
                  "data-tooltip-place": "top",
                  "data-tooltip-delay-show": 400,
                  "data-tooltip-offset": 10,
                }
              : {})}
          >
            {mod.label}
          </button>
        );
      })}
    </div>
  );
}
