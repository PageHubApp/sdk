import { CANVAS_SLOT_H, CANVAS_SLOT_W, CanvasPos } from "../../../../utils/component/componentCanvas";
import { HANDLE_GAP, HANDLE_HEIGHT, SURFACE_SELECTOR } from "../constants";

const HANDLE_TOTAL = HANDLE_HEIGHT + HANDLE_GAP;

/**
 * Read a card wrapper's visible bbox in CANVAS coords.
 *
 * Brittle to render shape: assumes the wrapper has a (handle?, inner) child
 * pair, and the slot is `inner.firstElementChild`. Mirrors the JSX shape in
 * `ComponentCanvasItem/index.tsx` — keep in sync if that render changes.
 */
export function measureCardBox(
  wrapperEl: HTMLElement
): { x: number; y: number; w: number; h: number } | null {
  const wrapperX = parseFloat(wrapperEl.style.getPropertyValue("--ph-item-x")) || 0;
  const wrapperY = parseFloat(wrapperEl.style.getPropertyValue("--ph-item-y")) || 0;
  const inner = (wrapperEl.children[wrapperEl.children.length - 1] as HTMLElement) || null;
  const slot = (inner?.firstElementChild as HTMLElement) || null;
  const slotW = slot?.offsetWidth || CANVAS_SLOT_W;
  const slotH = slot?.offsetHeight || CANVAS_SLOT_H;
  // Handle is the first child only when there's more than one (i.e., not
  // isolated). When present it sits at top: -HANDLE_TOTAL relative to the
  // slot, so the visible card extends upward by that much.
  const hasHandle = wrapperEl.children.length > 1;
  const handleEl = hasHandle ? (wrapperEl.children[0] as HTMLElement) : null;
  const handleW = handleEl?.offsetWidth || 0;
  const topPad = hasHandle ? HANDLE_TOTAL : 0;
  return {
    x: wrapperX,
    y: wrapperY - topPad,
    w: Math.max(slotW, handleW),
    h: slotH + topPad,
  };
}

/**
 * After a drag finishes, slide our card off any sibling it landed on top of.
 * Operates in CANVAS coords using full visible bbox (handle + slot).
 */
export function resolveOverlap(wrapper: HTMLElement, pos: CanvasPos): CanvasPos {
  const ourMeasured = measureCardBox(wrapper);
  if (!ourMeasured) return pos;
  const hasHandle = wrapper.children.length > 1;
  const ourTopPad = hasHandle ? HANDLE_TOTAL : 0;
  const ourW = ourMeasured.w;
  const ourH = ourMeasured.h;

  const surface = wrapper.closest(SURFACE_SELECTOR) as HTMLElement | null;
  if (!surface) return pos;
  const others: Array<{ x: number; y: number; w: number; h: number }> = [];
  surface.querySelectorAll<HTMLElement>("[data-ph-canvas-card='true']").forEach(el => {
    if (el === wrapper) return;
    const box = measureCardBox(el);
    if (box) others.push(box);
  });

  const PAD = 4;
  let { x, y } = pos;
  for (let iter = 0; iter < 8; iter++) {
    let collided = false;
    const ax = x;
    const ay = y - ourTopPad;
    for (const o of others) {
      const overlapX = ax < o.x + o.w && ax + ourW > o.x;
      const overlapY = ay < o.y + o.h && ay + ourH > o.y;
      if (!overlapX || !overlapY) continue;
      collided = true;
      const pushRight = o.x + o.w + PAD - ax;
      const pushLeft = ax + ourW + PAD - o.x;
      const pushDown = o.y + o.h + PAD - ay;
      const pushUp = ay + ourH + PAD - o.y;
      const min = Math.min(pushRight, pushLeft, pushDown, pushUp);
      if (min === pushRight) x = o.x + o.w + PAD;
      else if (min === pushLeft) x = o.x - ourW - PAD;
      else if (min === pushDown) y = o.y + o.h + PAD + ourTopPad;
      else y = o.y - ourH - PAD + ourTopPad;
      break;
    }
    if (!collided) break;
  }
  return { x, y };
}
