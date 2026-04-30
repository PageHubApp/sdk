/**
 * TextStylePickerPanel — heavy lazy chunk: FloatingPanel containing the
 * Framer-style Text Styles picker. Search + scrollable list (each row =
 * tag chip + name + size meta + per-row Edit pencil) + "New Style" footer.
 *
 * Loaded on first open by `TextStylePicker.tsx`. Rendering decisions:
 *   - Click row body → apply preset, close panel.
 *   - Click row Edit → open editor for that preset (parent handles).
 *   - Click "New Style" → open editor with captured node typography.
 */
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { TbPencil, TbPlus, TbSearch } from "react-icons/tb";
import { FloatingPanel } from "@/chrome/floating/FloatingPanel";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import type { TypographyPresetRow } from "./TypographyPresetSelect";
import { OVERLAY_Z_FLOATING_PANEL } from "../../../overlays/overlayZIndex";

interface PanelProps {
  presets: TypographyPresetRow[];
  selectedName: string | null;
  initialPosition?: { x: number; y: number };
  onClose: () => void;
  onApply: (preset: TypographyPresetRow) => void;
  onEditPreset: (preset: TypographyPresetRow) => void;
  onCreateNew: () => void;
  defaultWidth: number;
  defaultHeight: number;
}

/** Heading short tag derived from the preset name, e.g. "Heading 3" → "H3". */
function styleTagShorthand(name: string): string {
  const m = /^\s*h(?:eading)?\s*([1-6])/i.exec(name);
  if (m) return `H${m[1]}`;
  return "P";
}

/** Compact "size / lh" right-aligned meta. */
function styleMeta(p: TypographyPresetRow): string {
  const size = (p.fontSize || "").trim();
  const lh = (p.lineHeight || "").trim();
  if (!size && !lh) return "";
  if (!lh) return size;
  return `${size} / ${lh}`;
}

const TagChip = ({ tag, active = false }: { tag: string; active?: boolean }) => (
  <span
    className={`border-base-300 flex h-5 min-w-[1.5rem] shrink-0 items-center justify-center rounded border px-1.5 text-[10px] font-bold ${
      active ? "bg-base-content text-base-100" : "bg-base-100 text-base-content"
    }`}
  >
    {tag}
  </span>
);

export default function TextStylePickerPanel({
  presets,
  selectedName,
  initialPosition,
  onClose,
  onApply,
  onEditPreset,
  onCreateNew,
  defaultWidth,
  defaultHeight,
}: PanelProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return presets;
    return presets.filter(p => p.name.toLowerCase().includes(q));
  }, [presets, query]);

  return (
    <FloatingPanel
      isOpen
      onClose={onClose}
      title="Text Styles"
      storageKey="text-style-picker"
      autoSize={false}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
      minWidth={260}
      maxWidth={420}
      minHeight={260}
      initialPosition={initialPosition}
      persistSize={false}
      zIndex={OVERLAY_Z_FLOATING_PANEL}
      scrollable={false}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-base-300/60 flex items-center gap-1.5 border-b px-3 py-2">
          <TbSearch className="text-neutral-content size-3.5 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search styles..."
            autoFocus
            className="text-base-content placeholder:text-neutral-content min-w-0 flex-1 bg-transparent text-xs outline-none"
          />
        </div>

        <div className="scrollbar min-h-0 flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="text-neutral-content px-3 py-6 text-center text-xs italic">
              {presets.length === 0 ? "No styles yet" : `No matches for "${query}"`}
            </div>
          ) : (
            filtered.map(preset => {
              const active = preset.name === selectedName;
              const tag = styleTagShorthand(preset.name);
              const meta = styleMeta(preset);
              const previewStyle: CSSProperties = {
                fontFamily: preset.fontFamily,
                fontWeight: preset.fontWeight,
                letterSpacing: preset.letterSpacing || "normal",
                textTransform: (preset.textTransform || "none") as CSSProperties["textTransform"],
              };
              return (
                <div
                  key={preset.name}
                  className={`group flex w-full items-center gap-2 px-2 py-1 text-xs transition-colors ${
                    active ? "bg-base-200" : "hover:bg-base-200/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onApply(preset)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    aria-label={`Apply style ${preset.name}`}
                  >
                    <TagChip tag={tag} active={active} />
                    <span
                      className="text-base-content min-w-0 flex-1 truncate font-medium"
                      style={previewStyle}
                    >
                      {preset.name}
                    </span>
                    {meta && (
                      <span className="text-neutral-content shrink-0 text-[10px] tabular-nums">
                        {meta}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditPreset(preset)}
                    aria-label={`Edit style ${preset.name}`}
                    data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                    data-tooltip-content="Edit style"
                    className="text-neutral-content hover:text-base-content hover:bg-base-300/60 flex size-6 shrink-0 items-center justify-center rounded opacity-0 transition-[color,background-color,opacity] group-hover:opacity-100"
                  >
                    <TbPencil className="size-3.5" aria-hidden />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="border-base-300/60 border-t p-2">
          <button
            type="button"
            onClick={onCreateNew}
            className="bg-base-200 text-base-content hover:bg-base-300 flex w-full items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <TbPlus className="size-3.5" aria-hidden />
            New Style
          </button>
        </div>
      </div>
    </FloatingPanel>
  );
}
