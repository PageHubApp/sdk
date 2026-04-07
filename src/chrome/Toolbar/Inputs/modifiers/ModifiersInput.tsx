import { useState } from "react";
import { TbStack2 } from "react-icons/tb";
import { ToolbarSection } from "../../ToolbarSection";
import { useModifiers, type ResolvedModifier } from "./useModifiers";

function ModifierChip({
  mod,
  active,
  onToggle,
}: {
  mod: ResolvedModifier;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs transition-colors ${
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border bg-transparent text-muted-foreground hover:bg-muted"
      }`}
      title={mod.name}
    >
      {mod.label}
      {mod.origin === "site" && (
        <span className="text-[9px] opacity-50">custom</span>
      )}
    </button>
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
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-muted/50 p-2.5">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Component Type</label>
        <input
          type="text"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
          placeholder="e.g. Button, Container"
          className="h-7 w-full rounded border border-border bg-background px-2 text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Modifier Name</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. my-card-style"
          className="h-7 w-full rounded border border-border bg-background px-2 text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") { setLabel(""); setOpen(false); }
          }}
        />
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={submit} className="h-7 rounded bg-primary px-3 text-xs text-primary-foreground">
          Save
        </button>
        <button type="button" onClick={() => { setLabel(""); setOpen(false); }} className="h-7 rounded border border-border px-3 text-xs">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ModifiersInput() {
  const { grouped, isActive, toggleModifier, saveAsModifier, nodeTypeName, hasModifiers } =
    useModifiers();

  return (
    <ToolbarSection
      title="Modifiers"
      icon={<TbStack2 />}
      help={hasModifiers ? "Toggle composable style modifiers for this component." : "No modifiers available for this component."}
      defaultOpen={true}
      disabled={!hasModifiers}
    >
      <div className="flex flex-col gap-2">
        {[...grouped.entries()].map(([category, mods]) => (
          <div key={category}>
            {grouped.size > 1 && (
              <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">
                {category}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {mods.map((mod) => (
                <ModifierChip
                  key={mod.name}
                  mod={mod}
                  active={isActive(mod.name)}
                  onToggle={() => toggleModifier(mod)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <SaveAsModifier onSave={saveAsModifier} defaultType={nodeTypeName} />
    </ToolbarSection>
  );
}
