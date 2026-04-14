/**
 * Returns true if any ancestor of `dom` (up to #viewport) has overflow clipping.
 * Used to decide when inline editor chrome must portal outside clipped subtrees.
 */
export function hasOverflowAncestor(dom: HTMLElement | null): boolean {
  if (!dom) return false;

  let el: HTMLElement | null = dom;
  while (el) {
    if (el.id === "viewport") break;

    const style = getComputedStyle(el);
    const overflowX = style.overflowX;
    const overflowY = style.overflowY;

    if (
      overflowX === "hidden" ||
      overflowX === "auto" ||
      overflowX === "scroll" ||
      overflowY === "hidden" ||
      overflowY === "auto" ||
      overflowY === "scroll"
    ) {
      return true;
    }

    el = el.parentElement;
  }

  return false;
}
