/**
 * Editor canvas chrome by preview mode:
 * - mobile: phone frame (deviceClasses in Viewport — not defined here)
 * - sm–2xl: canvas narrows to the breakpoint width; no device metaphor
 *
 * Width is applied inline at the render site (so it can be drag-overridden);
 * this helper only returns the layout/scroll classes.
 */

export function getEditorWidthOnlyCanvasClasses(enabled: boolean): [string, string] {
  const outer = [
    "mx-auto flex z-2 shrink-0 flex-col transition-none overflow-hidden",
    "h-full max-h-full w-full",
  ].join(" ");

  const inner = enabled
    ? [
        "flex-1 min-h-0 min-w-0 w-full relative",
        "scrollbar-light bg-base-100 overflow-y-auto overflow-x-hidden",
      ].join(" ")
    : "w-full h-full min-h-0 overflow-auto relative";

  return [outer, inner];
}
