/**
 * FilterPreviewTile — visual preview + sliders replacing the 7–8
 * number rows under Filter and Backdrop sub-sections. A live preview
 * shows the current filter stack applied to a representative swatch
 * (filter mode) or through a translucent overlay (backdrop mode).
 *
 * Class read/write bypasses the propKey system (same pattern as
 * BorderSidesPicker) — we manipulate className directly so all
 * breakpoint variants round-trip cleanly.
 */
import { useNode } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useMemo } from "react";
import { ViewAtom } from "../../../viewport/atoms";

type Mode = "filter" | "backdrop";

interface DimDef {
  /** Slider label (short — the sub-section header already says Filter/Backdrop) */
  label: string;
  /** Ordered class values from least → most. Identity value must be present. */
  values: string[];
  /** Index into values representing "no effect" (omitted from className). */
  identity: number;
  /** Unit suffix for value readout (e.g. "%", "°"). */
  unit?: string;
  /** If set, show readout as the raw numeric suffix of the class; else show class index. */
  showSuffix?: boolean;
  /** How to contribute to the inline CSS filter string preview. */
  css: (v: string) => string | null;
}

const FILTER_DIMS: DimDef[] = [
  {
    label: "Brightness",
    values: [
      "brightness-0",
      "brightness-50",
      "brightness-75",
      "brightness-90",
      "brightness-95",
      "brightness-100",
      "brightness-105",
      "brightness-110",
      "brightness-125",
      "brightness-150",
      "brightness-200",
    ],
    identity: 5,
    unit: "%",
    showSuffix: true,
    css: v => `brightness(${numericSuffix(v) / 100})`,
  },
  {
    label: "Contrast",
    values: [
      "contrast-0",
      "contrast-50",
      "contrast-75",
      "contrast-100",
      "contrast-125",
      "contrast-150",
      "contrast-200",
    ],
    identity: 3,
    unit: "%",
    showSuffix: true,
    css: v => `contrast(${numericSuffix(v) / 100})`,
  },
  {
    label: "Saturate",
    values: ["saturate-0", "saturate-50", "saturate-100", "saturate-150", "saturate-200"],
    identity: 2,
    unit: "%",
    showSuffix: true,
    css: v => `saturate(${numericSuffix(v) / 100})`,
  },
  {
    label: "Hue",
    values: [
      "hue-rotate-0",
      "hue-rotate-15",
      "hue-rotate-30",
      "hue-rotate-60",
      "hue-rotate-90",
      "hue-rotate-180",
    ],
    identity: 0,
    unit: "°",
    showSuffix: true,
    css: v => `hue-rotate(${numericSuffix(v)}deg)`,
  },
  {
    label: "Grayscale",
    values: ["grayscale-0", "grayscale"],
    identity: 0,
    css: v => (v === "grayscale" ? "grayscale(1)" : null),
  },
  {
    label: "Sepia",
    values: ["sepia-0", "sepia"],
    identity: 0,
    css: v => (v === "sepia" ? "sepia(1)" : null),
  },
  {
    label: "Invert",
    values: ["invert-0", "invert"],
    identity: 0,
    css: v => (v === "invert" ? "invert(1)" : null),
  },
];

const BACKDROP_DIMS: DimDef[] = [
  {
    label: "Opacity",
    values: [
      "backdrop-opacity-0",
      "backdrop-opacity-10",
      "backdrop-opacity-20",
      "backdrop-opacity-30",
      "backdrop-opacity-40",
      "backdrop-opacity-50",
      "backdrop-opacity-60",
      "backdrop-opacity-70",
      "backdrop-opacity-80",
      "backdrop-opacity-90",
      "backdrop-opacity-100",
    ],
    identity: 10,
    unit: "%",
    showSuffix: true,
    css: v => `opacity(${numericSuffix(v) / 100})`,
  },
  {
    label: "Brightness",
    values: [
      "backdrop-brightness-0",
      "backdrop-brightness-50",
      "backdrop-brightness-75",
      "backdrop-brightness-90",
      "backdrop-brightness-95",
      "backdrop-brightness-100",
      "backdrop-brightness-105",
      "backdrop-brightness-110",
      "backdrop-brightness-125",
      "backdrop-brightness-150",
      "backdrop-brightness-200",
    ],
    identity: 5,
    unit: "%",
    showSuffix: true,
    css: v => `brightness(${numericSuffix(v) / 100})`,
  },
  {
    label: "Contrast",
    values: [
      "backdrop-contrast-0",
      "backdrop-contrast-50",
      "backdrop-contrast-75",
      "backdrop-contrast-100",
      "backdrop-contrast-125",
      "backdrop-contrast-150",
      "backdrop-contrast-200",
    ],
    identity: 3,
    unit: "%",
    showSuffix: true,
    css: v => `contrast(${numericSuffix(v) / 100})`,
  },
  {
    label: "Saturate",
    values: [
      "backdrop-saturate-0",
      "backdrop-saturate-50",
      "backdrop-saturate-100",
      "backdrop-saturate-150",
      "backdrop-saturate-200",
    ],
    identity: 2,
    unit: "%",
    showSuffix: true,
    css: v => `saturate(${numericSuffix(v) / 100})`,
  },
  {
    label: "Hue",
    values: [
      "backdrop-hue-rotate-0",
      "backdrop-hue-rotate-15",
      "backdrop-hue-rotate-30",
      "backdrop-hue-rotate-60",
      "backdrop-hue-rotate-90",
      "backdrop-hue-rotate-180",
    ],
    identity: 0,
    unit: "°",
    showSuffix: true,
    css: v => `hue-rotate(${numericSuffix(v)}deg)`,
  },
  {
    label: "Grayscale",
    values: ["backdrop-grayscale-0", "backdrop-grayscale"],
    identity: 0,
    css: v => (v === "backdrop-grayscale" ? "grayscale(1)" : null),
  },
  {
    label: "Sepia",
    values: ["backdrop-sepia-0", "backdrop-sepia"],
    identity: 0,
    css: v => (v === "backdrop-sepia" ? "sepia(1)" : null),
  },
  {
    label: "Invert",
    values: ["backdrop-invert-0", "backdrop-invert"],
    identity: 0,
    css: v => (v === "backdrop-invert" ? "invert(1)" : null),
  },
];

function numericSuffix(cls: string): number {
  const m = cls.match(/-(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

function prefixForView(view: string): string {
  if (view === "mobile") return "";
  if (view === "desktop") return "md:";
  return `${view}:`;
}

function possiblePrefixes(view: string): string[] {
  if (view === "desktop") return ["md:", ""];
  return [prefixForView(view)];
}

const ALL_PREFIXES = ["", "sm:", "md:", "lg:", "xl:", "2xl:"];

interface Props {
  mode: Mode;
}

export function FilterPreviewTile({ mode }: Props) {
  const view = useAtomValue(ViewAtom);
  const dims = mode === "filter" ? FILTER_DIMS : BACKDROP_DIMS;

  const {
    actions: { setProp },
    classNameStr,
  } = useNode(node => ({
    classNameStr: typeof node.data?.props?.className === "string" ? node.data.props.className : "",
  }));

  const currentIndices = useMemo(() => {
    const tokens = classNameStr.split(/\s+/).filter(Boolean);
    const prefixes = possiblePrefixes(view);
    return dims.map(dim => {
      for (let i = 0; i < dim.values.length; i++) {
        const val = dim.values[i];
        for (const p of prefixes) {
          if (tokens.includes(p + val)) return i;
        }
      }
      return dim.identity;
    });
  }, [classNameStr, view, dims]);

  const write = (dimIdx: number, newIdx: number) => {
    const dim = dims[dimIdx];
    const nextVal = dim.values[newIdx];
    const isIdentity = newIdx === dim.identity;
    const target = prefixForView(view) + nextVal;

    setProp((p: any) => {
      const tokens = (typeof p.className === "string" ? p.className : "")
        .split(/\s+/)
        .filter(Boolean);
      const forbidden = new Set<string>();
      for (const pre of ALL_PREFIXES) {
        for (const v of dim.values) forbidden.add(pre + v);
      }
      const cleaned = tokens.filter((t: string) => !forbidden.has(t));
      if (!isIdentity) cleaned.push(target);
      p.className = cleaned.join(" ");
    });
  };

  const reset = () => {
    setProp((p: any) => {
      const tokens = (typeof p.className === "string" ? p.className : "")
        .split(/\s+/)
        .filter(Boolean);
      const forbidden = new Set<string>();
      for (const pre of ALL_PREFIXES) {
        for (const dim of dims) for (const v of dim.values) forbidden.add(pre + v);
      }
      p.className = tokens.filter((t: string) => !forbidden.has(t)).join(" ");
    });
  };

  const anyActive = currentIndices.some((idx, i) => idx !== dims[i].identity);

  // Build inline CSS for the preview based on current values
  const cssFilter = useMemo(() => {
    const parts: string[] = [];
    currentIndices.forEach((idx, i) => {
      const dim = dims[i];
      const val = dim.values[idx];
      const piece = dim.css(val);
      if (piece) parts.push(piece);
    });
    return parts.join(" ");
  }, [currentIndices, dims]);

  return (
    <div className="flex w-full flex-col gap-space-xs py-2">
      {/* Preview tile */}
      <div className="relative h-20 w-full overflow-hidden rounded-md border border-base-content/10">
        {/* Colorful ground layer — stays visible so hue/grayscale/sepia register */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #ef4444 0%, #f59e0b 20%, #eab308 40%, #10b981 60%, #3b82f6 80%, #8b5cf6 100%)",
          }}
        />
        {/* Dummy detail so contrast/brightness are visible */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 2px, transparent 2px, transparent 20px)",
          }}
        />
        {mode === "filter" ? (
          // Filter mode: apply filter directly to a top layer
          <div
            className="absolute inset-0"
            style={{
              filter: cssFilter || undefined,
              background:
                "linear-gradient(135deg, #ef4444 0%, #f59e0b 20%, #eab308 40%, #10b981 60%, #3b82f6 80%, #8b5cf6 100%)",
            }}
          />
        ) : (
          // Backdrop mode: translucent overlay with backdrop-filter
          <div
            className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold uppercase tracking-wide text-base-content"
            style={{
              backdropFilter: cssFilter || undefined,
              WebkitBackdropFilter: cssFilter || undefined,
              background: "rgba(255, 255, 255, 0.12)",
            }}
          >
            backdrop
          </div>
        )}
      </div>

      {/* Sliders */}
      <div className="flex flex-col gap-1.5">
        {dims.map((dim, i) => {
          const idx = currentIndices[i];
          const val = dim.values[idx];
          const isIdentity = idx === dim.identity;
          const readout = dim.showSuffix
            ? `${numericSuffix(val)}${dim.unit ?? ""}`
            : isIdentity
              ? "off"
              : "on";
          return (
            <div key={dim.label} className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[11px] text-neutral-content">{dim.label}</span>
              <input
                type="range"
                min={0}
                max={dim.values.length - 1}
                step={1}
                value={idx}
                onChange={e => write(i, parseInt(e.target.value, 10))}
                aria-label={dim.label}
                className="slider bg-neutral text-neutral-content h-2 flex-1 cursor-pointer appearance-none rounded-lg"
              />
              <span
                className={`w-10 shrink-0 text-right text-[11px] tabular-nums ${
                  isIdentity ? "text-neutral-content" : "text-base-content"
                }`}
              >
                {readout}
              </span>
            </div>
          );
        })}
      </div>

      {anyActive && (
        <button
          type="button"
          onClick={reset}
          className="self-end text-[10px] text-neutral-content uppercase tracking-wide hover:text-base-content"
        >
          Reset
        </button>
      )}
    </div>
  );
}

export const FilterPreviewTileFilter = () => <FilterPreviewTile mode="filter" />;
export const FilterPreviewTileBackdrop = () => <FilterPreviewTile mode="backdrop" />;
