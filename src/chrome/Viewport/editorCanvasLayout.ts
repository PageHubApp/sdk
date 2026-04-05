// @ts-nocheck
/**
 * Editor canvas chrome by preview mode:
 * - mobile: phone frame (deviceClasses in Viewport — not defined here)
 * - sm: tablet-style bezel (rounded slab, not a phone)
 * - md–2xl: full-height column; width capped to breakpoint only (no device metaphor)
 */

/** Horizontal padding on tablet outer shell (each side), px — added to content width for max-w. */
const TABLET_SHELL_PAD_X = 12;

/**
 * Tablet preview: dark slab + inner rounded canvas at `sm` width (640px default).
 * Returns [outerWrapperClasses, innerViewportClasses].
 */
export function getEditorTabletCanvasClasses(
  enabled: boolean,
  contentWidthPx: number,
): [string, string] {
  const outerMax = contentWidthPx + TABLET_SHELL_PAD_X * 2;
  const outer = [
    "mx-auto flex z-2 shrink-0 flex-col transition overflow-hidden",
    "h-full max-h-full w-full",
    `max-w-[min(100%,${outerMax}px)]`,
    "rounded-[22px] p-3",
    "bg-[#242424] border border-[#3d3d3d]",
    "shadow-[0_18px_50px_-14px_rgba(0,0,0,0.55)]",
  ].join(" ");

  const inner = enabled
    ? [
        "flex-1 min-h-0 min-w-0 w-full mx-auto relative",
        "scrollbar-light bg-background overflow-y-auto overflow-x-hidden",
        "rounded-2xl border border-border",
        `max-w-[${contentWidthPx}px]`,
      ].join(" ")
    : [
        "w-full h-full min-h-0 overflow-auto relative mx-auto",
        "rounded-2xl border border-border",
        `max-w-[${contentWidthPx}px]`,
      ].join(" ");

  return [outer, inner];
}

/**
 * Desktop-style breakpoint preview: full height, width only; subtle frame (not a phone).
 */
export function getEditorWidthOnlyCanvasClasses(
  enabled: boolean,
  desktopOuter: string,
  desktopInner: string,
  widthPx: number,
): [string, string] {
  const inner = enabled
    ? `${desktopInner} max-w-[${widthPx}px] mx-auto w-full h-full min-h-0 rounded-lg border border-border bg-background shadow-sm`
    : `${desktopInner} max-w-[${widthPx}px] mx-auto w-full h-full min-h-0 rounded-lg border border-border shadow-sm`;

  return [desktopOuter, inner];
}
