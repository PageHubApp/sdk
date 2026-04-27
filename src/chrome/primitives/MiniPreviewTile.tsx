import type { CSSProperties, ReactNode } from "react";

/**
 * MiniPreviewTile — small bordered preview surface used by media pickers,
 * pattern swatches, and selected-asset previews. Static visual container only;
 * not a button. Wrap in a `<button>` if you need click semantics.
 *
 * Two sizes today:
 *   - `swatch` — fixed `h-6 w-12`, used for pattern swatches.
 *   - `video`  — `aspect-video w-full`, used for media previews.
 *
 * The shared shape is: rounded corners + neutral fill + clipped content.
 * Bg / radius / border are tweakable via props since the three callsites use
 * slightly different combinations.
 */
type TileSize = "swatch" | "video";

type TileBg = "neutral" | "base-100" | "base-200";

interface Props {
  size: TileSize;
  bg?: TileBg;
  rounded?: "md" | "lg";
  bordered?: boolean;
  /** Inner padding (e.g. media preview keeps a gutter around the asset). */
  padded?: boolean;
  /** When true, sets `position: relative` so absolute children (e.g. floating clear button) anchor here. */
  relative?: boolean;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const SIZE_CLASS: Record<TileSize, string> = {
  swatch: "h-6 w-12 shrink-0",
  video: "aspect-video w-full",
};

const BG_CLASS: Record<TileBg, string> = {
  "neutral": "bg-neutral",
  "base-100": "bg-base-100",
  "base-200": "bg-base-200",
};

export const MiniPreviewTile = ({
  size,
  bg = "base-200",
  rounded = "lg",
  bordered = true,
  padded = false,
  relative = false,
  className = "",
  style,
  children,
}: Props) => {
  const sizeClass = SIZE_CLASS[size];
  const bgClass = BG_CLASS[bg];
  const radiusClass = rounded === "md" ? "rounded-md" : "rounded-lg";
  const borderClass = bordered ? "border-base-300 border" : "";
  const padClass = padded ? "p-2" : "";
  const relativeClass = relative ? "relative" : "";
  return (
    <div
      className={`${sizeClass} ${bgClass} ${radiusClass} ${borderClass} ${padClass} ${relativeClass} flex items-center justify-center overflow-hidden ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};
