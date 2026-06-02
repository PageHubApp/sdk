import { ROOT_NODE } from "../rootNode";

export type CanvasPos = { x: number; y: number };

/** Both dims optional — when undefined the slot auto-fits the component's
 *  natural rendered size in that dimension. Drag the corresponding edge to
 *  commit a fixed value. */
export type CanvasSize = { w?: number; h?: number };

export const CANVAS_MIN_W = 200;
export const CANVAS_MIN_H = 80;

export type CanvasAnnotation = {
  id: string;
  x: number;
  y: number;
  text: string;
  kind: "label" | "title";
};

export const COMPONENT_CANVAS_TYPE = "componentCanvas";
export const CANVAS_GRID_STEP = 20;
export const CANVAS_SLOT_W = 480;
export const CANVAS_SLOT_H = 360;
export const CANVAS_SLOT_GAP = 96;
/** Gap between the master card and its state cards in canvas isolation mode. */
export const CANVAS_STATE_GAP = 12;
const AUTO_LAYOUT_COLS = 4;
const CANVAS_CARD_PAD = 12;

export function snapToGrid(v: number, step: number = CANVAS_GRID_STEP): number {
  return Math.round(v / step) * step;
}

/** Prop key on `props.custom` that stores per-card position. The list canvas
 *  and the isolation canvas track positions independently — moving the master
 *  card in isolation must NOT shift its slot in the list view, and vice versa. */
export type CanvasPosKey = "canvasPos" | "canvasIsolatePos";

/** Read canvasPos from a component container's props.custom, or compute a deterministic 4-col auto-layout slot. */
export function getComponentCanvasPos(
  containerId: string,
  query: any,
  index: number,
  posKey: CanvasPosKey = "canvasPos"
): CanvasPos {
  try {
    const node = query.node(containerId).get();
    const saved = node?.data?.props?.custom?.[posKey];
    if (saved && typeof saved.x === "number" && typeof saved.y === "number") {
      return { x: saved.x, y: saved.y };
    }
  } catch {
    // fall through to auto-layout
  }
  // Isolation canvas defaults the master to the origin so state cards lay out
  // predictably relative to (0, 0). The list canvas uses the 4-col grid.
  if (posKey === "canvasIsolatePos") {
    return { x: 0, y: 0 };
  }
  const col = index % AUTO_LAYOUT_COLS;
  const row = Math.floor(index / AUTO_LAYOUT_COLS);
  return {
    x: col * (CANVAS_SLOT_W + CANVAS_SLOT_GAP),
    y: row * (CANVAS_SLOT_H + CANVAS_SLOT_GAP),
  };
}

/** Read canvasSize from a component container's props.custom. Width defaults to
 *  CANVAS_SLOT_W; height is left undefined when never set so the slot auto-fits. */
export function getComponentCanvasSize(containerId: string, query: any): CanvasSize {
  try {
    const node = query.node(containerId).get();
    const saved = node?.data?.props?.custom?.canvasSize;
    const w = saved && typeof saved.w === "number" && saved.w >= CANVAS_MIN_W ? saved.w : undefined;
    const h = saved && typeof saved.h === "number" && saved.h >= CANVAS_MIN_H ? saved.h : undefined;
    return { w, h };
  } catch {
    return {};
  }
}

/** Default position for a state card in canvas isolation mode: stacked
 *  vertically to the right of the master card. Master width is read from its
 *  saved canvasSize (defaults to CANVAS_SLOT_W). State cards persist their
 *  own canvasPos on first render via ComponentCanvasItem's auto-write effect,
 *  so this only governs the initial layout — moving the master later does
 *  NOT reposition already-placed state cards. */
export function getStateNodeDefaultPos(
  masterId: string,
  stateIndex: number,
  query: any
): CanvasPos {
  let masterX = 0;
  let masterY = 0;
  let masterW = CANVAS_SLOT_W;
  try {
    const node = query.node(masterId).get();
    // State cards only render in isolation, so they anchor off the master's
    // isolation-canvas position, not its list-canvas position.
    const pos = node?.data?.props?.custom?.canvasIsolatePos;
    if (pos && typeof pos.x === "number" && typeof pos.y === "number") {
      masterX = pos.x;
      masterY = pos.y;
    }
    const size = node?.data?.props?.custom?.canvasSize;
    if (size && typeof size.w === "number" && size.w > 0) {
      masterW = size.w;
    }
    // Otherwise fall back to the auto-fit default (CANVAS_SLOT_W) — best
    // guess until the live DOM is measured.
  } catch {
    // fall through with defaults
  }
  return {
    x: masterX + masterW + CANVAS_CARD_PAD * 2 + CANVAS_STATE_GAP,
    y: masterY + stateIndex * (CANVAS_SLOT_H + CANVAS_STATE_GAP),
  };
}

/** Find the singleton ComponentCanvas container under ROOT, or return null if not present. */
export function findComponentCanvasNode(query: any): string | null {
  try {
    const root = query.node(ROOT_NODE).get();
    for (const nodeId of root.data.nodes) {
      const node = query.node(nodeId).get();
      if (node?.data?.props?.type === COMPONENT_CANVAS_TYPE) {
        return nodeId;
      }
    }
  } catch {
    // no-op
  }
  return null;
}

/** Get annotations array from canvas node's props (always returns an array). */
export function getCanvasAnnotations(canvasId: string, query: any): CanvasAnnotation[] {
  try {
    const node = query.node(canvasId).get();
    const arr = node?.data?.props?.annotations;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/** List in-site component containers (ROOT children with props.type === "component"). Skips hidden by default. */
export function listComponentContainers(query: any, includeHidden = false): string[] {
  try {
    const root = query.node(ROOT_NODE).get();
    return root.data.nodes.filter((nodeId: string) => {
      const node = query.node(nodeId).get();
      if (node?.data?.props?.type !== "component") return false;
      if (!includeHidden && node?.data?.hidden) return false;
      return true;
    });
  } catch {
    return [];
  }
}
