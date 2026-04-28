/**
 * VarList — list stage of the VarPicker. Search field at top, scrollable list
 * of token rows in the middle (each clickable to select; hover-revealed Edit
 * pencil to switch to the editor stage), sticky "+ New Token" footer.
 */
import React, { useMemo, useState } from "react";
import { TbPencil, TbPlus } from "react-icons/tb";
import { AutoHideScrollbar } from "../../../../primitives/layout/AutoHideScrollbar";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../../primitives/layout/tooltipSurface";
import { toolbarInputNoAutocompleteProps } from "../../../toolbarInputAttrs";
import { DesignVar } from "../types";

export interface VarListProps {
  designVars: DesignVar[];
  /** Allowlist of categories to show. `null` → no filter. */
  relevantCategories: string[] | null;
  tailwindKey?: string;
  currentValue?: string;
  onSelect: (value: string) => void;
  onEdit: (token: DesignVar) => void;
  onCreate: () => void;
}

export function VarList({
  designVars,
  relevantCategories,
  tailwindKey,
  currentValue,
  onSelect,
  onEdit,
  onCreate,
}: VarListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredVars = useMemo(() => {
    return designVars.filter(v => {
      if (relevantCategories && !relevantCategories.includes(v.category)) return false;
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        v.label.toLowerCase().includes(search) ||
        v.varName.toLowerCase().includes(search) ||
        v.name.toLowerCase().includes(search)
      );
    });
  }, [designVars, relevantCategories, searchTerm]);

  const formatValue = (v: DesignVar) =>
    tailwindKey === "fontFamily" ? `font-(${v.varName})` : `var(${v.varName})`;

  return (
    <>
      <div
        role="presentation"
        className="border-base-300 bg-base-200 shrink-0 border-b p-2"
        onMouseDown={e => e.stopPropagation()}
      >
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search variables…"
          className="input-plain w-full cursor-text py-0 text-xs"
          autoFocus
          {...toolbarInputNoAutocompleteProps}
        />
      </div>

      <AutoHideScrollbar className="ph-select-item-host min-h-0 flex-1">
        {filteredVars.length === 0 ? (
          <div className="text-neutral-content px-3 py-6 text-center text-xs">
            No variables found
          </div>
        ) : (
          filteredVars.map(v => {
            const value = formatValue(v);
            const isSelected = currentValue === value;
            // Edit affordance is for styleGuide tokens only — palette + typography
            // have their own existing dedicated CRUD surfaces (DesignSystemPalette
            // / TextStyleEditorPanel). Palette / typography rows are select-only.
            const editable = v.source === "styleGuide";
            return (
              <div
                key={v.varName}
                className={`group ph-select-item gap-2 text-xs ${
                  isSelected ? "bg-primary text-primary-content font-semibold" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(value)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <div
                    className="border-base-300 size-3 shrink-0 rounded border"
                    style={{
                      backgroundColor: v.category === "palette" ? v.value : "transparent",
                    }}
                  />
                  <span className="flex-1 truncate font-medium">{v.label}</span>
                </button>
                <span
                  className={`text-neutral-content shrink-0 ${
                    editable ? "group-hover:hidden" : ""
                  }`}
                >
                  {v.varName}
                </span>
                {editable && (
                  <button
                    type="button"
                    onClick={() => onEdit(v)}
                    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                    data-tooltip-content="Edit token"
                    className="text-neutral-content hover:text-base-content hidden size-5 shrink-0 items-center justify-center rounded transition-colors group-hover:flex"
                    aria-label={`Edit ${v.label}`}
                  >
                    <TbPencil className="size-3.5" aria-hidden />
                  </button>
                )}
              </div>
            );
          })
        )}
      </AutoHideScrollbar>

      <div className="border-base-300 bg-base-200 shrink-0 border-t p-2">
        <button
          type="button"
          onClick={onCreate}
          className="bg-primary text-primary-content hover:bg-primary/90 flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
        >
          <TbPlus className="size-3.5" aria-hidden />
          New Token
        </button>
      </div>
    </>
  );
}
