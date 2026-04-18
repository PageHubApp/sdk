/**
 * Module state for one drag: origin, cross-axis align (preview + commit), last resolved intent snapshot.
 */

import type { NodeId } from "@craftjs/core";
import type { AlignmentIntent } from "../alignmentInference";
import type { SpatialIntent } from "./spatialIntent";

export type DragOriginState = {
  nodeId: NodeId;
  parentId: NodeId | undefined;
  startX: number;
  startY: number;
};

export type CommittedAlignmentState = {
  intent: AlignmentIntent;
  view: string;
  classDark: boolean;
};

let _dragOrigin: DragOriginState | null = null;

/** Preview (DOM + intent) — cleared independently when col has no drag origin (committed may remain). */
let _alignPreview: { intent: AlignmentIntent; dom: HTMLElement | null } | null = null;

/** Values passed to applyAlignmentOnDrop on drop. */
let _alignCommitted: CommittedAlignmentState | null = null;

let _lastResolvedIntent: SpatialIntent | null = null;

let _besideDropInProgress = false;

/** True while Shift is held during an active canvas drag (updated from dragstart + keydown/keyup). */
let _dragCopyIntent = false;

export function getDragCopyIntent(): boolean {
  return _dragCopyIntent;
}

export function setDragCopyIntent(value: boolean) {
  _dragCopyIntent = value;
}

export function getDragOrigin() {
  return _dragOrigin;
}

export function setDragOrigin(
  nodeId: NodeId,
  parentId: NodeId | undefined,
  startX?: number,
  startY?: number
) {
  _dragOrigin = { nodeId, parentId, startX: startX ?? 0, startY: startY ?? 0 };
}

export function getCommittedAlignment() {
  return _alignCommitted;
}

/**
 * Sets both preview and committed alignment (direction-based cross-axis path).
 */
export function setActiveCrossAxisAlign(
  intent: AlignmentIntent | null,
  previewDom: HTMLElement | null,
  view?: string,
  classDark?: boolean
) {
  if (!intent) {
    _alignPreview = null;
    _alignCommitted = null;
    return;
  }
  _alignPreview = { intent, dom: previewDom };
  _alignCommitted = {
    intent,
    view: view || "mobile",
    classDark: classDark ?? false,
  };
}

/** Clear preview only — keeps committed for drop (column no-origin edge case). */
export function clearCrossAxisPreviewOnly() {
  _alignPreview = null;
}

/** Effective intent for UI: preview first, else committed. */
export function getAlignmentIntent(): AlignmentIntent | null {
  return _alignPreview?.intent ?? _alignCommitted?.intent ?? null;
}

export function getAlignmentDom(): HTMLElement | null {
  return _alignPreview?.dom ?? null;
}

/** Intent for compound snapshot: prefer committed (drop truth), else preview. */
export function getCrossAxisIntentForSnapshot(): AlignmentIntent | null {
  return _alignCommitted?.intent ?? _alignPreview?.intent ?? null;
}

export function getLastResolvedIntent(): SpatialIntent | null {
  return _lastResolvedIntent;
}

export function setLastResolvedIntent(intent: SpatialIntent | null) {
  _lastResolvedIntent = intent;
}

export function clearAlignmentIntent() {
  _alignPreview = null;
  _alignCommitted = null;
}

export function setBesideDropInProgress(value: boolean) {
  _besideDropInProgress = value;
}

export function getBesideDropInProgress() {
  return _besideDropInProgress;
}

export function resetSpatialSession() {
  _dragOrigin = null;
  _alignPreview = null;
  _alignCommitted = null;
  _lastResolvedIntent = null;
  _besideDropInProgress = false;
  _dragCopyIntent = false;
}
