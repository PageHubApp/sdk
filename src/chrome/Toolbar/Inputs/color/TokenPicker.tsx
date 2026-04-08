import { ROOT_NODE, useEditor } from "@craftjs/core";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { TbCheck, TbChevronDown, TbPlus } from "react-icons/tb";
import {
  isPaletteColorSelected,
  resolveColorForDisplay,
  type PaletteColor,
} from "../../../../utils/design/colorSystem";
import { toCSSVarName } from "../../../../utils/design/designSystemVars";
import { Tooltip } from "components/layout/Tooltip";
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

  const isInline = variant === "inline";
  const swatchSize = isInline ? "size-6" : "size-8";
  /** Max swatches in the top row so the panel (~240px) / toolbar (~360px) does not overflow. */
  const maxCompactRow = isInline ? 8 : 4;
  const compactPool = recentPalette.length > 0 ? recentPalette : palette;
  const compactSwatches = compactPool.slice(0, maxCompactRow);
  const hasMoreToShow =
    palette.length > compactSwatches.length || compactPool.length > maxCompactRow;

  return (
    <div
      ref={containerRef}
      className={isInline
        ? "relative flex w-[360px] max-w-[min(360px,100vw-2rem)] flex-col gap-2 p-2"
        : "relative flex w-[240px] max-w-[min(240px,100vw-2rem)] flex-col gap-3 p-3"
      }
    >
      {/* Swatch row: capped recents (or first N palette) + new token + optional expand */}
      <div className="flex min-w-0 items-center gap-1">
        {compactSwatches.map(pc => (
          <Tooltip key={pc.name} content={pc.name} placement="bottom" arrow={false}>
            <Swatch
              color={pc}
              palette={palette}
              selected={isPaletteColorSelected(value as any, pc)}
              onPick={handlePick}
              size={swatchSize}
            />
          </Tooltip>
        ))}
        <button type="button" onClick={() => setShowCreateDialog(true)} className={`${swatchSize} flex shrink-0 items-center justify-center rounded-md border-2 border-dashed border-base-300 text-neutral-content transition-colors hover:border-foreground hover:text-base-content`} title="New token">
          <TbPlus className="size-3" />
        </button>
        {hasMoreToShow && (
          <button type="button" onClick={() => setShowAll(prev => !prev)} className="ml-auto flex shrink-0 items-center text-neutral-content hover:text-base-content" title={showAll ? "Less" : "All tokens"}>
            <TbChevronDown className={`size-3.5 transition-transform ${showAll ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {/* Expanded: all tokens */}
      {showAll && (
        <div className="flex flex-wrap gap-1 border-t border-base-300 pt-2">
          {palette.map(pc => (
            <Tooltip key={pc.name} content={pc.name} placement="bottom" arrow={false}>
              <Swatch
                color={pc}
                palette={palette}
                selected={isPaletteColorSelected(value as any, pc)}
                onPick={handlePick}
                size={swatchSize}
              />
            </Tooltip>
          ))}
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

/** True when `color` field is already a CSS color (hex, functions, keywords) — not a bare token slug. */
function isLiteralCssColorField(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (t.startsWith("#")) return true;
  if (/^(rgb|rgba|hsl|hsla|oklch|lab|lch|color|hwb|var)\(/i.test(t)) return true;
  const named = new Set(["transparent", "currentcolor", "black", "white", "inherit"]);
  return named.has(t.toLowerCase());
}

/** Utility tail like `base-100`, `primary-content/50`, `blue-500/[40%]` (no spaces). */
const TOKEN_TAIL_RE = /^[a-z][a-z0-9-]*(\/(\d{1,3}|\[[^\]]+\]))?$/i;

/** Build `text-*` class and resolve to a concrete fill (includes opacity modifiers + palette). */
function swatchResolvedFill(pc: NamedColor, palette: NamedColor[]): string {
  const c = pc.color.trim();
  if (!c) {
    const vn = `--${toCSSVarName(pc.name)}`;
    return resolveColorForDisplay(`text-[var(${vn})]`, "text", palette as PaletteColor[]).backgroundColor;
  }
  if (isLiteralCssColorField(c)) {
    return resolveColorForDisplay(`text-${c}`, "text", palette as PaletteColor[]).backgroundColor;
  }
  if (TOKEN_TAIL_RE.test(c)) {
    return resolveColorForDisplay(`text-${c}`, "text", palette as PaletteColor[]).backgroundColor;
  }
  const vn = `--${toCSSVarName(pc.name)}`;
  return resolveColorForDisplay(`text-[var(${vn})]`, "text", palette as PaletteColor[]).backgroundColor;
}

const CHECKER_BG: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, var(--color-base-300, #d4d4d8) 25%, transparent 25%, transparent 75%, var(--color-base-300, #d4d4d8) 75%), linear-gradient(45deg, var(--color-base-300, #d4d4d8) 25%, transparent 25%, transparent 75%, var(--color-base-300, #d4d4d8) 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 4px 4px",
};

function cssFillShowsTransparency(css: string): boolean {
  const t = css.trim().toLowerCase();
  if (t === "transparent") return true;
  const rgba = t.match(
    /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)/i
  );
  if (rgba && parseFloat(rgba[4]) < 1 - 1e-5) return true;
  return false;
}

function Swatch({
  color,
  palette,
  selected,
  onPick,
  size = "size-6",
}: {
  color: NamedColor;
  palette: NamedColor[];
  selected: boolean;
  onPick: (name: string) => void;
  size?: string;
}) {
  const fill = swatchResolvedFill(color, palette);
  const showChecker = cssFillShowsTransparency(fill);

  return (
    <button
      type="button"
      onClick={() => onPick(color.name)}
      className="group relative"
    >
      <div
        className={`relative overflow-hidden ${size} flex items-center justify-center rounded-md border-2 transition-transform hover:scale-110 ${selected ? "border-primary ring-1 ring-primary/30" : "border-base-300"}`}
      >
        {showChecker && (
          <span className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]" style={CHECKER_BG} aria-hidden />
        )}
        <span
          className="absolute inset-0 z-1 rounded-[inherit]"
          style={{ backgroundColor: fill }}
          aria-hidden
        />
        {selected && (
          <TbCheck className="relative z-2 size-3 text-white drop-shadow-md" />
        )}
      </div>
    </button>
  );
}
