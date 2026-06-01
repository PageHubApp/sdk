import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import { TbCheck, TbChevronDown, TbEraser, TbPlus } from "react-icons/tb";
import {
  cssColorShowsTransparency,
  isPaletteColorSelected,
  resolveColorForDisplay,
  TRANSPARENT_CHECKER_BG,
  type PaletteColor,
} from "@/utils/design/color";
import { toCSSVarName } from "@/utils/design/designSystemVars";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { CreateTokenDialog } from "./CreateTokenDialog";
import { resolveTheme } from "@/utils/design/resolveTheme";
import { useHorizontalDragScroll } from "@/utils/hooks/useHorizontalDragScroll";
import { phStorage } from "@/utils/phStorage";
import { useOverlay } from "../../../../registry/hooks/useOverlay";

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
  /** Optional: reset to default / remove color (shown disabled when `value` is empty) */
  onClear?: () => void;
  /** Layout variant: "inline" = wide/thin for toolbars, "panel" = taller grid for sidebars */
  variant?: "inline" | "panel";
}

function hasClearableValue(value: unknown): boolean {
  if (value == null) return false;
  return String(value).trim() !== "";
}

function loadRecentTokens(): string[] {
  try {
    const stored = phStorage.get("recent-tokens");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/** Append new picks only; re-picking does not reorder (stable compact row). */
function saveRecentToken(name: string): string[] {
  const recent = loadRecentTokens();
  if (recent.includes(name)) {
    return [...recent];
  }
  const updated = [...recent, name].slice(-MAX_RECENT);
  phStorage.set("recent-tokens", updated);
  return updated;
}

/** Recents first (stable order), then palette order, deduped by name — fills `max` slots. */
function mergeRecentAndPalette(
  recent: NamedColor[],
  fullPalette: NamedColor[],
  max: number
): NamedColor[] {
  const seen = new Set<string>();
  const out: NamedColor[] = [];
  const push = (pc: NamedColor) => {
    if (out.length >= max) return;
    if (seen.has(pc.name)) return;
    seen.add(pc.name);
    out.push(pc);
  };
  for (const pc of recent) push(pc);
  for (const pc of fullPalette) push(pc);
  return out;
}

export function TokenPicker({
  value,
  onChange,
  onClose,
  onClear,
  variant = "inline",
}: TokenPickerProps) {
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

  // Escape dismissal: registry overlay stack.
  useOverlay({
    id: "token-picker",
    isOpen: Boolean(onClose),
    onDismiss: onClose ?? (() => {}),
  });

  const handlePick = useCallback(
    (name: string) => {
      onChange({ type: "palette", value: `palette:${name}` });
      setRecentTokens(saveRecentToken(name));
    },
    [onChange]
  );

  const recentPalette = recentTokens
    .map(name => palette.find(p => p.name === name))
    .filter(Boolean) as NamedColor[];

  const isInline = variant === "inline";
  const swatchSize = isInline ? "size-6" : "size-8";
  /** Max swatches in the top row so the panel (~240px) / toolbar row does not overflow. */
  const maxCompactRow = isInline ? 11 : 4;
  const compactSwatches = mergeRecentAndPalette(recentPalette, palette, maxCompactRow);
  const compactNames = new Set(compactSwatches.map(s => s.name));
  const hasMoreToShow = palette.some(p => !compactNames.has(p.name));

  const { scrollRef, onDragPointerDown, dragMoved } = useHorizontalDragScroll({
    deps: [compactSwatches.length, palette.length],
  });

  return (
    <div
      ref={containerRef}
      className={
        isInline
          ? "relative flex w-full max-w-[min(280px,100vw-2rem)] flex-col gap-2 p-2"
          : "relative flex w-[240px] max-w-[min(240px,100vw-2rem)] flex-col gap-3 p-3"
      }
    >
      {/* Swatches scroll; + / clear / chevron stay pinned (ThemeReel-style drag + wheel). */}
      <div className="flex min-w-0 items-center gap-1">
        <div
          ref={scrollRef}
          onPointerDown={onDragPointerDown}
          className="scrollbar-hide no-scrollbar flex min-w-0 flex-1 cursor-grab flex-row gap-1 overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {compactSwatches.map(pc => (
            <Swatch
              key={pc.name}
              color={pc}
              palette={palette}
              selected={isPaletteColorSelected(value as any, pc)}
              onPick={handlePick}
              dragMovedRef={dragMoved}
              size={swatchSize}
              tooltip={pc.name}
            />
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setShowCreateDialog(true)}
            className={`${swatchSize} border-base-300 text-neutral-content hover:border-base-content hover:text-base-content flex shrink-0 items-center justify-center rounded-md border-2 border-dashed transition-colors`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="New token"
            data-tooltip-place="bottom"
            data-tooltip-offset={10}
          >
            <TbPlus className="size-3" />
          </button>
          {onClear != null && (
            <button
              type="button"
              disabled={!hasClearableValue(value)}
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }}
              className={`${swatchSize} border-base-300 text-neutral-content hover:border-primary hover:text-base-content flex shrink-0 items-center justify-center rounded-md border-2 transition-colors disabled:pointer-events-none disabled:opacity-40`}
              aria-label="Remove color"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Remove color"
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
            >
              <TbEraser className="size-3.5" />
            </button>
          )}
          {hasMoreToShow && (
            <button
              type="button"
              onClick={() => setShowAll(prev => !prev)}
              className="text-neutral-content hover:text-base-content flex shrink-0 items-center"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content={showAll ? "Less" : "All tokens"}
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
            >
              <TbChevronDown
                className={`size-3.5 transition-transform ${showAll ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Expanded: all tokens */}
      {showAll && (
        <div className="border-base-300 flex flex-wrap gap-1 border-t pt-2">
          {palette.map(pc => (
            <Swatch
              key={pc.name}
              color={pc}
              palette={palette}
              selected={isPaletteColorSelected(value as any, pc)}
              onPick={handlePick}
              size={swatchSize}
              tooltip={pc.name}
            />
          ))}
        </div>
      )}

      {/* Create token dialog */}
      {showCreateDialog && (
        <div className="absolute top-full left-1/2 z-50 mt-1 -translate-x-1/2">
          <CreateTokenDialog
            onCreated={name => {
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
    return resolveColorForDisplay(`text-[var(${vn})]`, "text", palette as PaletteColor[])
      .backgroundColor;
  }
  if (isLiteralCssColorField(c)) {
    return resolveColorForDisplay(`text-${c}`, "text", palette as PaletteColor[]).backgroundColor;
  }
  if (TOKEN_TAIL_RE.test(c)) {
    return resolveColorForDisplay(`text-${c}`, "text", palette as PaletteColor[]).backgroundColor;
  }
  const vn = `--${toCSSVarName(pc.name)}`;
  return resolveColorForDisplay(`text-[var(${vn})]`, "text", palette as PaletteColor[])
    .backgroundColor;
}

function Swatch({
  color,
  palette,
  selected,
  onPick,
  dragMovedRef,
  size = "size-6",
  tooltip,
}: {
  color: NamedColor;
  palette: NamedColor[];
  selected: boolean;
  onPick: (name: string) => void;
  /** When set, ignore click if user was drag-scrolling the strip (`useHorizontalDragScroll`). */
  dragMovedRef?: MutableRefObject<boolean>;
  size?: string;
  tooltip?: string;
}) {
  const fill = swatchResolvedFill(color, palette);
  const showChecker = cssColorShowsTransparency(fill);

  return (
    <button
      type="button"
      onClick={() => {
        if (dragMovedRef?.current) return;
        onPick(color.name);
      }}
      className="group relative shrink-0"
      {...(tooltip
        ? {
            "data-tooltip-id": PAGEHUB_RTT_GLOBAL_ID,
            "data-tooltip-content": tooltip,
            "data-tooltip-place": "bottom",
            "data-tooltip-offset": 10,
          }
        : {})}
    >
      <div
        className={`relative overflow-hidden ${size} flex items-center justify-center rounded-md border-2 transition-transform hover:scale-110 ${selected ? "border-primary ring-primary/30 ring-1" : "border-base-300"}`}
      >
        {showChecker && (
          <span
            className="pointer-events-none absolute inset-0 z-0 rounded-[inherit]"
            style={TRANSPARENT_CHECKER_BG}
            aria-hidden
          />
        )}
        <span
          className="absolute inset-0 z-1 rounded-[inherit]"
          style={{ backgroundColor: fill }}
          aria-hidden
        />
        {selected && <TbCheck className="relative z-2 size-3 text-white drop-shadow-md" />}
      </div>
    </button>
  );
}
