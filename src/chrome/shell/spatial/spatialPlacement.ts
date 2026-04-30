/**
 * Placement main axis for findPosition2D: PageHub schema (registry) + table display + flex fallback.
 */

import type { Node } from "@craftjs/core";
import {
  getSpatialMainAxisForComponentName,
  getSuppressCrossAxisAlignForComponentName,
} from "../../../core/builtinDefsLookup";

function resolverName(parent: Node): string | undefined {
  return parent.data?.name as string | undefined;
}

/**
 * When non-null, overrides flex for table CSS layout (main axis for sibling order).
 * `true` = horizontal (X), `false` = vertical (Y).
 */
function inferMainAxisIsRowFromDisplay(dom: HTMLElement | null): boolean | null {
  if (!dom) return null;
  const d = window.getComputedStyle(dom).display;
  if (d === "table-row") return true;
  if (
    d === "table" ||
    d === "table-header-group" ||
    d === "table-footer-group" ||
    d === "table-row-group" ||
    d === "table-cell" ||
    d === "table-caption" ||
    d === "table-column-group" ||
    d === "table-column"
  ) {
    return false;
  }
  return null;
}

export function isTableLayoutDisplay(dom: HTMLElement | null): boolean {
  if (!dom) return false;
  const d = window.getComputedStyle(dom).display;
  return (
    d === "table" ||
    d === "table-row" ||
    d === "table-cell" ||
    d === "table-header-group" ||
    d === "table-footer-group" ||
    d === "table-row-group" ||
    d === "table-column-group" ||
    d === "table-column" ||
    d === "table-caption"
  );
}

/**
 * Main axis for reorder / beside / zone math. Matches flex "row" vs "col" semantics used by reorderMainAxis.
 */
export function getPlacementMainAxis(
  parent: Node,
  parentDom: HTMLElement | null
): { isRow: boolean; reversed: boolean } {
  const mode = getSpatialMainAxisForComponentName(resolverName(parent));

  if (mode === "row") {
    return { isRow: true, reversed: false };
  }
  if (mode === "column") {
    return { isRow: false, reversed: false };
  }

  const fromDisplay = inferMainAxisIsRowFromDisplay(parentDom);
  if (fromDisplay !== null) {
    return { isRow: fromDisplay, reversed: false };
  }

  if (!parentDom) {
    return { isRow: false, reversed: false };
  }
  const dir = window.getComputedStyle(parentDom).flexDirection;
  const isRow = dir === "row" || dir === "row-reverse";
  const reversed = dir === "row-reverse" || dir === "column-reverse";
  return { isRow, reversed };
}

/**
 * Cross-axis flex alignment is meaningless on table hosts and when the component def opts out.
 * Schema (`suppressCrossAxisAlign`) first; then CSS table `display` for unknown / auto defs (e.g. cells).
 */
export function shouldSkipCrossAxisAlignForParent(
  parent: Node,
  parentDom: HTMLElement | null
): boolean {
  if (getSuppressCrossAxisAlignForComponentName(resolverName(parent))) {
    return true;
  }
  return isTableLayoutDisplay(parentDom);
}

/**
 * Beside (flex-col edge bands) does not apply to CSS table layout or the Table component root.
 * The Table node’s DOM is a block scroll wrapper, not `display: table`, so we also key off `name`.
 */
export function shouldSkipBesideInColumnForParent(
  parent: Node,
  parentDom: HTMLElement | null
): boolean {
  if (resolverName(parent) === "Table") {
    return true;
  }
  return isTableLayoutDisplay(parentDom);
}
