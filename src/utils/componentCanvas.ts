import { ROOT_NODE } from "@craftjs/utils";

export type CanvasPos = { x: number; y: number };

/** Width is always set; height is optional — when undefined the slot
 *  auto-fits the component's natural rendered height (default behavior).
 *  Once the user drags the bottom edge, height is locked. */
export type CanvasSize = { w: number; h?: number };

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
const AUTO_LAYOUT_COLS = 4;

export function snapToGrid(v: number, step: number = CANVAS_GRID_STEP): number {
  return Math.round(v / step) * step;
}

/** Read canvasPos from a component container's props.custom, or compute a deterministic 4-col auto-layout slot. */
export function getComponentCanvasPos(
  containerId: string,
  query: any,
  index: number
): CanvasPos {
  try {
    const node = query.node(containerId).get();
    const saved = node?.data?.props?.custom?.canvasPos;
    if (
      saved &&
      typeof saved.x === "number" &&
      typeof saved.y === "number"
    ) {
      return { x: saved.x, y: saved.y };
    }
  } catch {
    // fall through to auto-layout
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
export function getComponentCanvasSize(
  containerId: string,
  query: any
): CanvasSize {
  try {
    const node = query.node(containerId).get();
    const saved = node?.data?.props?.custom?.canvasSize;
    const w =
      saved && typeof saved.w === "number" && saved.w >= CANVAS_MIN_W
        ? saved.w
        : CANVAS_SLOT_W;
    const h =
      saved && typeof saved.h === "number" && saved.h >= CANVAS_MIN_H
        ? saved.h
        : undefined;
    return { w, h };
  } catch {
    return { w: CANVAS_SLOT_W };
  }
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
export function getCanvasAnnotations(
  canvasId: string,
  query: any
): CanvasAnnotation[] {
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
