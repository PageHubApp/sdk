/**
 * Render-time props for the Header slot (ROOT's `<header>` landmark).
 *
 * The slot is a wrapper exactly as tall as the header block inside it. A
 * `sticky top-0` header block is boxed in by that wrapper — sticky can only
 * travel inside its parent — so it never pins. An unstyled slot renders
 * `display: contents`: the `<header>` keeps its landmark role, and the block
 * inside lays out (and sticks) against `<main>`.
 *
 * Only when the author gave the slot no classes or inline style of its own; a
 * styled slot keeps its box. Viewer + static renderers only — the editor
 * needs the box to select and drop into.
 */
export function headerSlotProps<P extends { className?: string; root?: Record<string, any> }>(
  props: P
): P {
  if ((props.className || "").trim() || props.root?.style) return props;
  return { ...props, root: { ...(props.root || {}), style: "display: contents" } };
}
