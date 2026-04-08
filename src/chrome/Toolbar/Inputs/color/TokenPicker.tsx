import { ROOT_NODE, useEditor } from "@craftjs/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { TbCheck, TbChevronDown, TbPlus } from "react-icons/tb";
import { isPaletteColorSelected } from "../../../../utils/design/colorSystem";
import { toCSSVarName } from "../../../../utils/design/designSystemVars";
import { CreateTokenDialog } from "./CreateTokenDialog";
import { resolveTheme } from "../../../../utils/design/resolveTheme";
import { phStorage } from "../../../../utils/phStorage";

const MAX_RECENT = 8;

interface NamedColor {
  name: string;
  color: string;
}

interface TokenPickerProps {
  /** Current value — palette ref, hex, css var, etc. */
  value: unknown;
  /** Called with `{ type: "palette", value: "palette:Name" }` */
  onChange: (data: { type: "palette"; value: string }) => void;
  /** Optional: close the picker */
  onClose?: () => void;
  /** Layout variant: "inline" = wide/thin for toolbars, "panel" = taller grid for sidebars */
  variant?: "inline" | "panel";
}

function loadRecentTokens(): string[] {
  try {
    const stored = phStorage.get("recent-tokens");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentToken(name: string): string[] {
  const recent = loadRecentTokens();
  const updated = [name, ...recent.filter(n => n !== name)].slice(0, MAX_RECENT);
  phStorage.set("recent-tokens", updated);
  return updated;
}

export function TokenPicker({ value, onChange, onClose, variant = "inline" }: TokenPickerProps) {
  const { query } = useEditor();
  const [palette, setPalette] = useState<NamedColor[]>([]);
  const [recentTokens, setRecentTokens] = useState<string[]>(loadRecentTokens);
  const [showAll, setShowAll] = useState(false);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const node = query.node(ROOT_NODE).get();
      const themePalette = resolveTheme(node?.data?.props || {}).palette;
      setPalette(themePalette.filter((p: any) => p?.name && p?.color));
    } catch {}
  }, [query]);

  useEffect(() => {
    if (!onClose) return;
    const handle = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle, true);
    return () => document.removeEventListener("mousedown", handle, true);
  }, [onClose]);

  useEffect(() => {
    if (!onClose) return;
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  const handlePick = useCallback((name: string) => {
    onChange({ type: "palette", value: `palette:${name}` });
    setRecentTokens(saveRecentToken(name));
  }, [onChange]);

  const recentPalette = recentTokens
    .map(name => palette.find(p => p.name === name))
    .filter(Boolean) as NamedColor[];

  const defaultVisible = variant === "inline" ? 12 : 20;
  const visibleTokens = showAll ? palette : palette.slice(0, defaultVisible);

  const isInline = variant === "inline";
  const swatchSize = isInline ? "size-6" : "size-8";

  return (
    <div
      ref={containerRef}
      className={isInline
        ? "relative flex w-[360px] flex-col gap-2 p-2"
        : "relative flex w-[240px] flex-col gap-3 p-3"
      }
    >
      {/* Swatch row: recents (or first 8) + new token button + expand chevron */}
      <div className="flex items-center gap-1">
        {(recentPalette.length > 0 ? recentPalette : palette.slice(0, 8)).map(pc => (
          <Swatch key={pc.name} color={pc} selected={isPaletteColorSelected(value as any, pc)} onPick={handlePick} onHover={setHoveredName} size={swatchSize} />
        ))}
        <button onClick={() => setShowCreateDialog(true)} className={`${swatchSize} flex items-center justify-center rounded-md border-2 border-dashed border-base-300 text-neutral-content transition-colors hover:border-foreground hover:text-base-content`} title="New token">
          <TbPlus className="size-3" />
        </button>
        <button onClick={() => setShowAll(prev => !prev)} className="ml-auto flex shrink-0 items-center text-neutral-content hover:text-base-content" title={showAll ? "Less" : "All tokens"}>
          <TbChevronDown className={`size-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Expanded: all tokens */}
      {showAll && (
        <div className="flex flex-wrap gap-1 border-t border-base-300 pt-2">
          {palette.map(pc => (
            <Swatch key={pc.name} color={pc} selected={isPaletteColorSelected(value as any, pc)} onPick={handlePick} onHover={setHoveredName} size={swatchSize} />
          ))}
        </div>
      )}

      {/* Hover label — absolute, no layout shift */}
      {hoveredName && !showCreateDialog && (
        <div className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-[10px] text-background shadow-sm">
          {hoveredName}
        </div>
      )}

      {/* Create token dialog */}
      {showCreateDialog && (
        <div className="absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2">
          <CreateTokenDialog
            onCreated={(name) => {
              setShowCreateDialog(false);
              // Reload palette
              try {
                const node = query.node(ROOT_NODE).get();
                const refreshedPalette = resolveTheme(node?.data?.props || {}).palette;
                setPalette(refreshedPalette.filter((p: any) => p?.name && p?.color));
              } catch {}
              // Select the new token
              handlePick(name);
            }}
            onClose={() => setShowCreateDialog(false)}
          />
        </div>
      )}
    </div>
  );
}

function Swatch({ color, selected, onPick, onHover, size = "size-6" }: { color: NamedColor; selected: boolean; onPick: (name: string) => void; onHover?: (name: string | null) => void; size?: string }) {
  const isTailwindClass = !color.color.includes("rgba") && !color.color.startsWith("#");
  const cssVarName = `--${toCSSVarName(color.name)}`;

  return (
    <button
      onClick={() => onPick(color.name)}
      onMouseEnter={() => onHover?.(color.name)}
      onMouseLeave={() => onHover?.(null)}
      className="group relative"
    >
      <div
        className={`${size} flex items-center justify-center rounded-md border-2 transition-transform hover:scale-110 ${selected ? "border-primary ring-1 ring-primary/30" : "border-base-300"}`}
        style={{ backgroundColor: isTailwindClass ? `var(${cssVarName})` : color.color }}
      >
        {selected && <TbCheck className="size-3 text-white drop-shadow-md" />}
      </div>
    </button>
  );
}
