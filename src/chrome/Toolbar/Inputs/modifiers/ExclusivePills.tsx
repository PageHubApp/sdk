import { twMerge } from "tailwind-merge";
import { PH_TOOLBAR_DASHED_BTN_ACTIVE } from "../../phToolbarDashedSelection";
import type { ResolvedModifier } from "./useModifiers";

export function ExclusivePills({
  mods,
  isActive,
  onToggle,
}: {
  mods: ResolvedModifier[];
  isActive: (mod: ResolvedModifier) => boolean;
  onToggle: (mod: ResolvedModifier) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {mods.map((mod) => {
        const active = isActive(mod);
        return (
          <button
            key={mod.name}
            type="button"
            onClick={() => onToggle(mod)}
            className={twMerge(
              "ph-toolbar-dashed-btn w-fit text-xs font-medium",
              active && PH_TOOLBAR_DASHED_BTN_ACTIVE,
            )}
            title={mod.classes || mod.name}
          >
            {mod.label}
          </button>
        );
      })}
    </div>
  );
}
