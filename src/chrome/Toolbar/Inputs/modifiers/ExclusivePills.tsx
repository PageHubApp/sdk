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
    <div className="flex flex-wrap gap-1">
      {mods.map((mod) => {
        const active = isActive(mod);
        return (
          <button
            key={mod.name}
            type="button"
            onClick={() => onToggle(mod)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-base-300 bg-base-100 text-neutral-content hover:bg-neutral hover:text-base-content"
            }`}
            title={mod.classes || mod.name}
          >
            {mod.label}
          </button>
        );
      })}
    </div>
  );
}
