import { ToolbarDropdown } from "../../ToolbarDropdown";
import type { ResolvedModifier } from "./useModifiers";

export function ExclusiveDropdown({
  mods,
  isActive,
  onToggle,
}: {
  mods: ResolvedModifier[];
  isActive: (mod: ResolvedModifier) => boolean;
  onToggle: (mod: ResolvedModifier) => void;
}) {
  const activeMod = mods.find((m) => isActive(m));
  const value = activeMod?.name ?? "";

  const handleChange = (newValue: string) => {
    if (!newValue && activeMod) {
      // Selected "None" — toggle off current
      onToggle(activeMod);
    } else {
      const mod = mods.find((m) => m.name === newValue);
      if (mod) onToggle(mod);
    }
  };

  return (
    <>
      <ToolbarDropdown value={value} onChange={handleChange} placeholder="None">
        <option value="">None</option>
        {mods.map((mod) => (
          <option key={mod.name} value={mod.name}>
            {mod.label}
          </option>
        ))}
      </ToolbarDropdown>
      {activeMod?.description && (
        <p className="mt-1 text-[10px] leading-snug text-neutral-content/70">{activeMod.description}</p>
      )}
    </>
  );
}
