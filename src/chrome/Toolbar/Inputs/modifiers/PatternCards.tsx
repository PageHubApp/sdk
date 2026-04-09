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
            className={`rounded-lg border px-3 py-2 text-left ${
              active
                ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                : "border-base-300 bg-base-100 hover:border-primary/40 hover:bg-neutral"
            }`}
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
