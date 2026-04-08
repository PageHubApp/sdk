import { useState } from "react";
import { TbStack2 } from "react-icons/tb";
import { ToolbarSection } from "../../ToolbarSection";
import { useModifiers, type ResolvedModifier, type CategoryMeta } from "./useModifiers";
import { PatternCards } from "./PatternCards";
import { ExclusiveDropdown } from "./ExclusiveDropdown";
import { ExclusivePills } from "./ExclusivePills";

function ModifierChip({
  mod,
  active,
  onToggle,
}: {
  mod: ResolvedModifier;
  active: boolean;
  onToggle: () => void;
}) {
  const classCount = mod.classes ? mod.classes.split(/\s+/).filter(Boolean).length : 0;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors ${
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-base-300 bg-transparent text-neutral-content hover:bg-neutral"
      }`}
      title={mod.classes || mod.name}
    >
      {mod.label}
      {classCount > 0 && (
        <span className="text-[9px] opacity-60">&times;{classCount}</span>
      )}
      {mod.origin === "site" && (
        <span className="text-[9px] opacity-50">custom</span>
      )}
    </button>
  );
}

function ChipGroup({
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
      {mods.map((mod) => (
        <ModifierChip
          key={mod.name}
          mod={mod}
          active={isActive(mod)}
          onToggle={() => onToggle(mod)}
        />
      ))}
    </div>
  );
}

/** Returns a comma-separated summary of active modifiers in a category. */
function useActiveSummary(
  cat: CategoryMeta,
  isActive: (mod: ResolvedModifier) => boolean,
): string {
  const labels = cat.mods.filter((m) => isActive(m)).map((m) => m.label);
  return labels.join(", ");
}

function CategorySection({
  cat,
  isActive,
  onToggle,
}: {
  cat: CategoryMeta;
  isActive: (mod: ResolvedModifier) => boolean;
  onToggle: (mod: ResolvedModifier) => void;
}) {
  const summary = useActiveSummary(cat, isActive);

  return (
    <ToolbarSection
      title={cat.name}
      nested
      collapsible
      defaultOpen={cat.defaultOpen}
      accordionPassive
      header={
        summary ? (
          <span className="ml-auto truncate text-[10px] text-primary">{summary}</span>
        ) : undefined
      }
    >
      {cat.renderAs === "patterns" && (
        <PatternCards mods={cat.mods} isActive={isActive} onToggle={onToggle} />
      )}
      {cat.renderAs === "dropdown" && (
        <ExclusiveDropdown mods={cat.mods} isActive={isActive} onToggle={onToggle} />
      )}
      {cat.renderAs === "pills" && (
        <ExclusivePills mods={cat.mods} isActive={isActive} onToggle={onToggle} />
      )}
      {cat.renderAs === "chips" && (
        <ChipGroup mods={cat.mods} isActive={isActive} onToggle={onToggle} />
      )}
    </ToolbarSection>
  );
}

function SaveAsModifier({
  onSave,
  defaultType,
}: {
  onSave: (label: string, targetType?: string) => void;
  defaultType: string;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [targetType, setTargetType] = useState(defaultType);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setTargetType(defaultType); }}
        className="text-xxs mx-auto flex w-full items-center justify-center gap-1 rounded-lg px-2 text-center hover:underline"
      >
        + Save as {defaultType} modifier
      </button>
    );
  }

  const submit = () => {
    if (label.trim()) {
      onSave(label, targetType);
      setLabel("");
      setOpen(false);
    }
  };

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-base-300 bg-neutral/50 p-2.5">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-neutral-content">Component Type</label>
        <input
          type="text"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          placeholder="e.g. Button, Container"
          className="h-7 w-full rounded border border-base-300 bg-base-100 px-2 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-neutral-content">Modifier Name</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. my-card-style"
          className="h-7 w-full rounded border border-base-300 bg-base-100 px-2 text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") { setLabel(""); setOpen(false); }
          }}
        />
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={submit} className="h-7 rounded bg-primary px-3 text-xs text-primary-content">
          Save
        </button>
        <button type="button" onClick={() => { setLabel(""); setOpen(false); }} className="h-7 rounded border border-base-300 px-3 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ModifiersInput() {
  const { categorized, isActive, toggleModifier, saveAsModifier, nodeTypeName, hasModifiers } =
    useModifiers();

  return (
    <ToolbarSection
      title="Modifiers"
      icon={<TbStack2 />}
      help={hasModifiers ? "Toggle composable style modifiers for this component." : "No modifiers available for this component."}
      defaultOpen={true}
      disabled={!hasModifiers}
    >
      <div className="flex flex-col gap-0.5">
        {categorized.map((cat) => (
          <CategorySection
            key={cat.name}
            cat={cat}
            isActive={isActive}
            onToggle={toggleModifier}
          />
        ))}
      </div>
      <SaveAsModifier onSave={saveAsModifier} defaultType={nodeTypeName} />
    </ToolbarSection>
  );
}
