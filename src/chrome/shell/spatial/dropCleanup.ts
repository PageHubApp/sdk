/**
 * Empty beside-wrapper cleanup after drag moves a node away.
 */

import type { NodeId } from "@craftjs/core";
import { isBesideWrapper } from "../layoutInference";
import { sdkLog } from "../../../utils/logger";

const isDev = process.env.NODE_ENV === "development";
const log = isDev
  ? (label: string, data?: Record<string, any>) => sdkLog.log(`[drag] ${label}`, data ?? "")
  : () => {};

export function cleanupOldParentWrapper(actions: any, query: any, oldParentId: NodeId | undefined) {
  if (!oldParentId) return;

  const oldParent = query.node(oldParentId).get();
  if (!oldParent?.data) return;
  const children = oldParent.data.nodes || [];
  if (children.length > 0) return;
  if (!isBesideWrapper(oldParent)) return;

  const grandparentId = oldParent.data.parent;
  log("cleanup-empty-wrapper", {
    wrapperId: oldParentId,
    displayName: oldParent.data.custom?.displayName,
  });
  actions.delete(oldParentId);

  if (grandparentId) {
    const grandparent = query.node(grandparentId).get();
    if (!grandparent?.data) return;
    const gpDisplayName = grandparent.data.custom?.displayName;
    const gpChildren = grandparent.data.nodes || [];

    if (gpDisplayName === "Row" && gpChildren.length === 1) {
      const remainingWrapperId = gpChildren[0];
      const remainingWrapper = query.node(remainingWrapperId).get();
      if (!remainingWrapper?.data) return;

      const innerChildren = [...(remainingWrapper.data.nodes || [])];
      const rowParentId = grandparent.data.parent;
      if (!rowParentId) return;

      const rowParent = query.node(rowParentId).get();
      const rowIndex = (rowParent?.data?.nodes || []).indexOf(grandparentId);
      if (rowIndex < 0) return;

      log("unwrap-single-child-row", { rowId: grandparentId, remainingWrapperId, innerChildren });
      const merged = actions.history.merge();
      actions.move(innerChildren, rowParentId, rowIndex);
      merged.delete(remainingWrapperId);
      merged.delete(grandparentId);
    }
  }
}
