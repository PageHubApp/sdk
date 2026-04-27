import type { ReactNode } from "react";

/**
 * Canonical input-row frame for the toolbar. Owns the entire row shape:
 * `h-8` content + `1px` border (from `.input-wrapper` CSS) + `rounded-lg` +
 * `gap-1.5 px-1` + focus-within ring. Every bordered input row in the
 * toolbar goes through this primitive — no hand-rolled `<div class="input-wrapper ...">`.
 *
 * Leading control plugs in as `children` (use `h-full w-full` to fill the slot —
 * never set `h-8`/`min-h-8` on the leading control or it fights the frame).
 * Trailing chrome (`InlineClearButton`, `ChevronTrigger`) goes in `trailing`.
 *
 * Variants:
 *   - default — `gap-1.5 px-1`, leading control inset 4px from the left.
 *   - swatch  — for full-bleed visual leading controls (Color picker swatch).
 *               Drops left padding so the swatch hits the inner border, adds
 *               `overflow-hidden` so the swatch is clipped to the frame's
 *               rounded shape on the left and stays flat on the right (where
 *               the trailing X sits).
 *
 * Tiles (icon picker, media preview, popover-chip preview) are NOT rows —
 * they have their own primitives.
 */
export const ToolbarRowFrame = ({
  children,
  trailing,
  open = false,
  variant = "default",
  onClick,
}: {
  children: ReactNode;
  trailing?: ReactNode;
  /** When true, wrapper border highlights (used by popover triggers). */
  open?: boolean;
  variant?: "default" | "swatch";
  onClick?: (e: React.MouseEvent) => void;
}) => {
  // When no trailing chrome is supplied, drop the right gutter so the leading
  // control fills the full row — avoids a stranded empty strip on the right
  // (most visible on the swatch variant when the color is unset).
  const hasTrailing = trailing != null && trailing !== false;
  let variantClass: string;
  if (variant === "swatch") {
    variantClass = `gap-1.5 pl-0! overflow-hidden ${hasTrailing ? "pr-1" : "pr-0!"}`;
  } else {
    variantClass = `gap-1.5 ${hasTrailing ? "px-1" : "pl-1 pr-0"}`;
  }
  return (
    <div
      onClick={onClick}
      className={`input-wrapper text-base-content flex h-8 w-full items-center text-xs ${variantClass} ${
        open ? "border-primary ring-ring/45 ring-1" : ""
      }`}
    >
      {children}
      {trailing}
    </div>
  );
};
