/**
 * ModifiersPickerBody — content of the Modifiers FloatingPanel.
 *
 * Single chip style for both the Pattern category (with descriptions) and the
 * free-chip categories (DaisyUI etc.) — full-width card, label + optional
 * description on the left, dashed-border preview eye on the right. Hover the
 * eye to apply the canvas preview; click anywhere on the body to toggle.
 * Splitting hover-to-preview from chip body click means the user can scroll
 * through the list without thrashing the canvas, and previews are
 * intent-driven instead of accidental.
 *
 * Exclusive groups (Surface / DaisyUI Color etc.) still render as the soft
 * segmented control or dropdown — those are picker UIs, not browseable
 * lists, so the chip-with-preview affordance doesn't apply.
 *
 * Footer hosts the "Save as modifier" form.
 */
import { useMemo, useState } from "react";
import { TbEye } from "react-icons/tb";
import { twMerge } from "tailwind-merge";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { SearchInput } from "@/chrome/primitives/SearchInput";
import { ToolbarDropdown } from "../../ToolbarDropdown";
import {
  ToolbarSegmentedControl,
  type ToolbarSegmentedOption,
} from "../../helpers/ToolbarSegmentedControl";
import { useModifiers, type CategoryMeta, type ResolvedModifier } from "./useModifiers";

function CategoryLabel({ name }: { name: string }) {
  return (
    <div className="text-neutral-content/80 mt-1 mb-1.5 px-0.5 text-[10px] font-semibold tracking-wide uppercase">
      {name}
    </div>
  );
}

function ModifierChip({
  mod,
  active,
  onToggle,
  onHoverPreview,
}: {
  mod: ResolvedModifier;
  active: boolean;
  onToggle: () => void;
  onHoverPreview: () => void;
}) {
  const classCount = mod.classes ? mod.classes.split(/\s+/).filter(Boolean).length : 0;
  return (
    <div
      className={twMerge(
        "border-base-300 hover:border-base-content/40 group flex items-stretch overflow-hidden rounded-md border bg-transparent transition-colors",
        active && "border-primary bg-primary/5 hover:border-primary"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="hover:bg-base-200 flex min-w-0 flex-1 flex-col items-start gap-0.5 px-2 py-1.5 text-left transition-colors"
      >
        <div className="flex w-full items-baseline justify-between gap-1.5">
          <span
            className={twMerge(
              "truncate text-xs font-medium",
              active ? "text-primary" : "text-base-content"
            )}
          >
            {mod.label}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {classCount > 0 && (
              <span className={twMerge("text-[9px]", active ? "text-primary/60" : "opacity-50")}>
                ×{classCount}
              </span>
            )}
            {mod.origin === "site" && <span className="text-[9px] opacity-40">custom</span>}
          </span>
        </div>
        {mod.description && (
          <p className="line-clamp-2 text-[10px] leading-snug opacity-70">{mod.description}</p>
        )}
      </button>
      <button
        type="button"
        onMouseEnter={onHoverPreview}
        aria-label={`Preview ${mod.label}`}
        data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
        data-tooltip-content="Hold to preview"
        data-tooltip-place="left"
        data-tooltip-delay-show={400}
        className="border-base-300/70 text-neutral-content hover:bg-primary/10 hover:text-primary flex shrink-0 items-center justify-center border-l border-dashed px-2 opacity-50 transition-[color,background-color,opacity] group-hover:opacity-100"
      >
        <TbEye className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}

function ModifierChipColumn({
  mods,
  isActive,
  onToggle,
  onHoverPreview,
}: {
  mods: ResolvedModifier[];
  isActive: (mod: ResolvedModifier) => boolean;
  onToggle: (mod: ResolvedModifier) => void;
  onHoverPreview: (mod: ResolvedModifier) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {mods.map(mod => (
        <ModifierChip
          key={mod.name}
          mod={mod}
          active={isActive(mod)}
          onToggle={() => onToggle(mod)}
          onHoverPreview={() => onHoverPreview(mod)}
        />
      ))}
    </div>
  );
}

function ExclusiveSegmented({
  mods,
  isActive,
  onToggle,
}: {
  mods: ResolvedModifier[];
  isActive: (mod: ResolvedModifier) => boolean;
  onToggle: (mod: ResolvedModifier) => void;
}) {
  const activeMod = mods.find(m => isActive(m));
  const value = activeMod?.name ?? "";

  const options: ToolbarSegmentedOption[] = [
    { value: "", label: "—", tooltip: "None", widthClass: "flex-none w-7" },
    ...mods.map(mod => ({
      value: mod.name,
      label: mod.label,
      tooltip: mod.description || mod.classes || mod.name,
    })),
  ];

  const handleChange = (next: string) => {
    if (!next) {
      if (activeMod) onToggle(activeMod);
      return;
    }
    const mod = mods.find(m => m.name === next);
    if (mod) onToggle(mod);
  };

  return (
    <ToolbarSegmentedControl
      value={value}
      onChange={handleChange}
      options={options}
      tooltipId={PAGEHUB_RTT_GLOBAL_ID}
    />
  );
}

function ExclusiveDropdownGroup({
  mods,
  isActive,
  onToggle,
}: {
  mods: ResolvedModifier[];
  isActive: (mod: ResolvedModifier) => boolean;
  onToggle: (mod: ResolvedModifier) => void;
}) {
  const activeMod = mods.find(m => isActive(m));
  const value = activeMod?.name ?? "";

  const handleChange = (newValue: string) => {
    if (!newValue && activeMod) {
      onToggle(activeMod);
      return;
    }
    const mod = mods.find(m => m.name === newValue);
    if (mod) onToggle(mod);
  };

  return (
    <>
      <ToolbarDropdown value={value} onChange={handleChange} placeholder="None">
        <option value="">None</option>
        {mods.map(mod => (
          <option key={mod.name} value={mod.name}>
            {mod.label}
          </option>
        ))}
      </ToolbarDropdown>
      {activeMod?.description && (
        <p className="text-neutral-content/70 mt-1 text-[10px] leading-snug">
          {activeMod.description}
        </p>
      )}
    </>
  );
}

function CategoryBlock({
  cat,
  isActive,
  onToggle,
  onHoverPreview,
}: {
  cat: CategoryMeta;
  isActive: (mod: ResolvedModifier) => boolean;
  onToggle: (mod: ResolvedModifier) => void;
  onHoverPreview: (mod: ResolvedModifier) => void;
}) {
  return (
    <div className="flex flex-col">
      <CategoryLabel name={cat.name} />
      {cat.renderAs === "patterns" || cat.renderAs === "chips" ? (
        <ModifierChipColumn
          mods={cat.mods}
          isActive={isActive}
          onToggle={onToggle}
          onHoverPreview={onHoverPreview}
        />
      ) : cat.renderAs === "dropdown" ? (
        <ExclusiveDropdownGroup mods={cat.mods} isActive={isActive} onToggle={onToggle} />
      ) : (
        <ExclusiveSegmented mods={cat.mods} isActive={isActive} onToggle={onToggle} />
      )}
    </div>
  );
}

function matchesQuery(mod: ResolvedModifier, q: string): boolean {
  const haystack = [
    mod.label,
    mod.name,
    mod.category ?? "",
    mod.description ?? "",
    mod.classes ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function ModifiersPickerBody() {
  const {
    categorized,
    isActive,
    previewModifier,
    commitModifier,
    toggleModifier,
    endPreview,
    hasModifiers,
  } = useModifiers();

  const [search, setSearch] = useState("");
  const trimmed = search.trim().toLowerCase();

  // When searching, filter mods within each category and drop empty
  // categories. Force renderAs="chips" so matches across all categories show
  // as a uniform card list — segmented controls with 1 of 5 options visible
  // would look broken.
  const filtered: CategoryMeta[] = useMemo(() => {
    if (!trimmed) return categorized;
    const result: CategoryMeta[] = [];
    for (const cat of categorized) {
      const mods = cat.mods.filter(m => matchesQuery(m, trimmed));
      if (mods.length === 0) continue;
      result.push({ ...cat, mods, renderAs: "chips" });
    }
    return result;
  }, [categorized, trimmed]);

  if (!hasModifiers) {
    return (
      <div className="text-neutral-content py-6 text-center text-xs">
        No modifiers available for this component.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1" onMouseLeave={endPreview}>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search modifiers"
        className="mb-1"
        size="slim"
      />

      {filtered.length === 0 ? (
        <div className="text-neutral-content py-6 text-center text-xs">
          No modifiers match &ldquo;{search}&rdquo;
        </div>
      ) : (
        filtered.map(cat => (
          <CategoryBlock
            key={cat.name}
            cat={cat}
            isActive={isActive}
            // Chip body click commits when a hover-preview is active (preview
            // already applied desired state); falls back to toggle for the
            // dropdown path which has no preview hook.
            onToggle={cat.renderAs === "dropdown" ? toggleModifier : commitModifier}
            onHoverPreview={previewModifier}
          />
        ))
      )}
    </div>
  );
}
