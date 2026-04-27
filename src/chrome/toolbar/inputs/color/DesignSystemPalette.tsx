/**
 * DesignSystemPalette — Framer-style searchable list of palette tokens.
 *
 * Encapsulates the full palette CRUD UX so the parent picker stays clean:
 *  - reads `theme.palette` from ROOT
 *  - search filter
 *  - row = swatch · name · hover-revealed Edit button
 *  - "+ New Token" button at the bottom
 *  - opens CreateTokenDialog for both create and edit (rename/recolor/delete)
 *
 * Palette ref values are emitted as `palette:<Name>` to match TokenPicker / ColorInput
 * conventions. Selected row is the one whose name appears in the parent's `selectedColor`.
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { TbCheck, TbMoon, TbPencil, TbPlus, TbSearch, TbSun } from "react-icons/tb";
import { resolveTheme } from "@/utils/design/resolveTheme";
import { resolvePaletteHex } from "@/chrome/toolbar/dialogs/colorPickerSections";
import { CreateTokenDialog } from "./CreateTokenDialog";

export interface PaletteEntry {
  name: string;
  color: string;
}

interface Props {
  /** Stored value used to highlight the active token. Either `palette:<Name>` or
   *  any string containing the palette name (e.g. `bg-[var(--primary)]`). */
  selectedColor: string;
  /** Fired when a user clicks a row. Passes the canonical palette ref `palette:<Name>`. */
  onSelect: (paletteValue: string) => void;
  /** Optional anchor element used to position the create/edit dialog beside the list. */
  anchorEl?: HTMLElement | null;
}

type Mode = "light" | "dark";

export function DesignSystemPalette({ selectedColor, onSelect, anchorEl }: Props) {
  const { query, actions } = useEditor();
  const [mode, setMode] = useState<Mode>("light");
  const [palette, setPalette] = useState<PaletteEntry[]>([]);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<
    | { mode: "create"; pos: { left: number; top: number } }
    | { mode: "edit"; pos: { left: number; top: number }; existing: PaletteEntry }
    | null
  >(null);

  const paletteKey = mode === "dark" ? "darkPalette" : "palette";

  const refresh = () => {
    try {
      const node = query.node(ROOT_NODE).get();
      const theme = resolveTheme(node?.data?.props || {});
      const next = (mode === "dark" ? theme.darkPalette : theme.palette) as PaletteEntry[] | undefined;
      setPalette(next || []);
    } catch (e) {
      console.error("DesignSystemPalette: failed to load palette", e);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, mode]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return palette;
    return palette.filter(p => p.name.toLowerCase().includes(q));
  }, [palette, search]);

  const computeDialogPos = (trigger: HTMLElement) => {
    const anchor = (anchorEl ?? trigger.closest('[role="dialog"]') ?? trigger) as HTMLElement;
    const rect = anchor.getBoundingClientRect();
    const DIALOG_WIDTH = 256;
    const GAP = 8;
    const rawLeft = rect.right + GAP;
    const left =
      rawLeft + DIALOG_WIDTH > window.innerWidth - 8
        ? Math.max(8, rect.left - DIALOG_WIDTH - GAP)
        : rawLeft;
    return { left, top: Math.max(8, rect.top) };
  };

  const handleNew = (e: React.MouseEvent<HTMLElement>) => {
    setDialog({ mode: "create", pos: computeDialogPos(e.currentTarget) });
  };

  const handleEdit = (e: React.MouseEvent<HTMLElement>, entry: PaletteEntry) => {
    e.stopPropagation();
    setDialog({ mode: "edit", pos: computeDialogPos(e.currentTarget), existing: entry });
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-base-content text-xs font-medium">Design System</span>
        <div className="border-base-300 bg-base-200 flex items-center rounded-md border p-0.5">
          <button
            type="button"
            onClick={() => setMode("light")}
            aria-pressed={mode === "light"}
            aria-label="Light palette"
            className={`flex size-5 items-center justify-center rounded transition-colors ${
              mode === "light"
                ? "bg-base-100 text-base-content"
                : "text-neutral-content hover:text-base-content"
            }`}
          >
            <TbSun className="size-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setMode("dark")}
            aria-pressed={mode === "dark"}
            aria-label="Dark palette"
            className={`flex size-5 items-center justify-center rounded transition-colors ${
              mode === "dark"
                ? "bg-base-100 text-base-content"
                : "text-neutral-content hover:text-base-content"
            }`}
          >
            <TbMoon className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>

      {/* Search */}
      {palette.length > 4 && (
        <div className="border-base-300 bg-base-200 mb-1.5 flex items-center gap-1.5 rounded-md border px-2 py-1.5">
          <TbSearch className="text-neutral-content size-3.5 shrink-0" aria-hidden />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="text-base-content placeholder:text-neutral-content min-w-0 flex-1 bg-transparent text-xs outline-none"
          />
        </div>
      )}

      {/* List */}
      <div className="flex flex-col">
        {filtered.length === 0 ? (
          <div className="text-neutral-content px-2 py-3 text-center text-xs italic">
            {palette.length === 0 ? "No tokens yet" : `No matches for "${search}"`}
          </div>
        ) : (
          filtered.map(entry => {
            const hex = resolvePaletteHex(entry.color || "", palette);
            const paletteValue = `palette:${entry.name}`;
            const isSelected =
              selectedColor === paletteValue || selectedColor.includes(entry.name);
            return (
              <div
                key={entry.name}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(paletteValue)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(paletteValue);
                  }
                }}
                className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
                  isSelected ? "bg-base-200" : "hover:bg-base-200/60"
                }`}
              >
                <span
                  className="border-base-300 size-4 shrink-0 rounded-full border"
                  style={{ backgroundColor: hex }}
                  aria-hidden
                />
                <span
                  className={`min-w-0 flex-1 truncate text-xs ${
                    isSelected ? "font-medium" : ""
                  } text-base-content`}
                >
                  {entry.name}
                </span>
                {isSelected && <TbCheck className="text-base-content size-3.5 shrink-0" aria-hidden />}
                <button
                  type="button"
                  onClick={e => handleEdit(e, entry)}
                  className="bg-base-300 text-base-content hover:bg-base-content hover:text-base-100 hidden shrink-0 items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors group-hover:flex"
                  aria-label={`Edit ${entry.name}`}
                >
                  <TbPencil className="mr-0.5 size-3" aria-hidden />
                  Edit
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* New token */}
      <button
        type="button"
        onClick={handleNew}
        className="border-base-300 text-neutral-content hover:border-foreground hover:text-base-content mt-1.5 flex h-8 w-full items-center justify-center gap-1.5 rounded-md border border-dashed text-xs transition-colors"
      >
        <TbPlus className="size-3.5" />
        New Token
      </button>

      {/* Shared create/edit dialog */}
      {dialog &&
        createPortal(
          <div
            className="pagehub-sdk-root fixed"
            style={{ left: dialog.pos.left, top: dialog.pos.top, zIndex: 1200 }}
            data-floating-allow
          >
            <CreateTokenDialog
              paletteKey={paletteKey}
              {...(dialog.mode === "edit"
                ? {
                    existing: {
                      originalName: dialog.existing.name,
                      color: resolvePaletteHex(dialog.existing.color || "", palette),
                    },
                  }
                : {})}
              onCreated={name => {
                setDialog(null);
                refresh();
                onSelect(`palette:${name}`);
              }}
              onDeleted={() => {
                setDialog(null);
                refresh();
              }}
              onClose={() => setDialog(null)}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
