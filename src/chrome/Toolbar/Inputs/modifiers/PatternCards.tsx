import { twMerge } from "tailwind-merge";
import { PH_TOOLBAR_DASHED_BTN_ACTIVE } from "../../phToolbarDashedSelection";
import type { ResolvedModifier } from "./useModifiers";

export function PatternCards({
  mods,
  isActive,
  onToggle,
}: {
  mods: ResolvedModifier[];
  isActive: (mod: ResolvedModifier) => boolean;
  onToggle: (mod: ResolvedModifier) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {mods.map((mod) => {
        const active = isActive(mod);
        const classCount = mod.classes
          ? mod.classes.split(/\s+/).filter(Boolean).length
          : 0;
        return (
          <button
            key={mod.name}
            type="button"
            onClick={() => onToggle(mod)}
            className={twMerge(
              "ph-toolbar-dashed-btn justify-between text-left",
              active && PH_TOOLBAR_DASHED_BTN_ACTIVE,
            )}
            title={mod.classes || mod.name}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${active ? "text-primary" : "text-base-content"}`}>
                {mod.label}
              </span>
              <span className="flex items-center gap-1.5">
                {classCount > 0 && (
                  <span className={`text-[9px] ${active ? "text-primary/60" : "opacity-50"}`}>
                    {classCount} classes
                  </span>
                )}
                {mod.origin === "site" && (
                  <span className="text-[9px] opacity-40">custom</span>
                )}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
