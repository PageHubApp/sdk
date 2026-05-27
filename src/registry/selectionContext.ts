/**
 * Selection context derivation — single source of truth for `when` /
 * `enablement` predicate inputs that depend on the currently selected
 * Craft node.
 *
 * Phase 2 C2c lifts these out of `useToolboxMenuModel.tsx` so every
 * surface (right-click menu, palette, breadcrumb, future selection chip)
 * reads the same derived snapshot.
 *
 * The derivation is intentionally non-hook: it takes a live CraftJS
 * `query` plus the selected node id and computes a flat snapshot. The
 * surface that owns selection (`Viewport.tsx`) watches the editor's
 * selection event stream and pushes a fresh snapshot into the command
 * context after every change.
 */
import { ROOT_NODE } from "@craftjs/utils";
import type {
  CommandSelectionContext,
  CommandParentContext,
  CommandClipboardContext,
} from "./types";
import { checkIfAncestorLinked } from "../utils/component/componentUtils";
import { getSiblingMoveState } from "../chrome/toolbar/dialogs/Layers/siblingMoveOps";
import {
  hasCraftClipboardPaste,
  readClassClipboard,
} from "../chrome/viewport/ToolboxContextual/utils/clipboardChecks";

export interface DerivedSelectionContext {
  selection: CommandSelectionContext;
  parent: CommandParentContext;
  clipboard: CommandClipboardContext;
  /** Sibling-move enablement (matches `useToolboxMenuModel.canMoveUp/Down`). */
  "siblingMove.canMoveUp": boolean;
  "siblingMove.canMoveDown": boolean;
  /** True when no existing saved-component already wraps this node. */
  canMakeSavedComponent: boolean;
  /** Convenience flag carried for menu-time gates. */
  hasPageIsolation: boolean;
}

interface DeriveOptions {
  /** List of saved components — used to compute `canMakeSavedComponent`. */
  components?: Array<{ rootNodeId?: string }> | null;
  /** Value of IsolateAtom — null/empty when no page is isolated. */
  pageIsolation?: string | null;
}

const EMPTY_SELECTION: CommandSelectionContext = {
  id: null,
  type: null,
  isCanvas: false,
  isDeletable: false,
  isLinked: false,
  canDelete: false,
};

const EMPTY_PARENT: CommandParentContext = { id: null, displayName: null };

/**
 * Derive the selection-context snapshot for the currently selected node.
 * Pass `query=null` or `selectionId=null` for an empty snapshot.
 */
export function deriveSelectionContext(
  query: any,
  selectionId: string | null | undefined,
  opts: DeriveOptions = {}
): DerivedSelectionContext {
  const clipboardSnap: CommandClipboardContext = {
    hasNode: hasCraftClipboardPaste(),
    hasClasses: readClassClipboard()?.className != null,
  };

  const pageIsolation = Boolean(
    opts.pageIsolation && typeof opts.pageIsolation === "string"
  );

  if (!query || !selectionId) {
    return {
      selection: EMPTY_SELECTION,
      parent: EMPTY_PARENT,
      clipboard: clipboardSnap,
      "siblingMove.canMoveUp": false,
      "siblingMove.canMoveDown": false,
      // No id to match → safe default of true (parallels the live
      // `!components.some(c.rootNodeId === id)` check on a missing id).
      canMakeSavedComponent: true,
      hasPageIsolation: pageIsolation,
    };
  }

  let node: any = null;
  try {
    node = query.node(selectionId).get();
  } catch {
    node = null;
  }
  if (!node) {
    return {
      selection: EMPTY_SELECTION,
      parent: EMPTY_PARENT,
      clipboard: clipboardSnap,
      "siblingMove.canMoveUp": false,
      "siblingMove.canMoveDown": false,
      canMakeSavedComponent: true,
      hasPageIsolation: pageIsolation,
    };
  }

  const props = node.data?.props ?? {};
  const custom = node.data?.custom ?? {};
  const parentId = (node.data?.parent as string | undefined) ?? null;
  const type = (props.type as string | undefined) ?? null;
  const isCanvas = Boolean(node.data?.isCanvas);
  let isDeletable = false;
  try {
    isDeletable = Boolean(query.node(selectionId).isDeletable());
  } catch {
    isDeletable = false;
  }
  let isLinked = false;
  try {
    isLinked = Boolean(checkIfAncestorLinked(selectionId, query));
  } catch {
    isLinked = false;
  }
  const canDelete =
    selectionId !== ROOT_NODE &&
    Boolean(parentId) &&
    props.canDelete !== false &&
    custom?.permissions?.canDelete !== false;

  let parentDisplayName: string | null = null;
  if (parentId) {
    try {
      const pn = query.node(parentId).get();
      parentDisplayName =
        (pn?.data?.custom?.displayName as string | undefined) ||
        (pn?.data?.displayName as string | undefined) ||
        null;
    } catch {
      parentDisplayName = null;
    }
  }

  let canMoveUp = false;
  let canMoveDown = false;
  if (selectionId !== ROOT_NODE && parentId) {
    try {
      const sm = getSiblingMoveState(query, selectionId);
      canMoveUp = sm.canMoveUp;
      canMoveDown = sm.canMoveDown;
    } catch {
      // ignore
    }
  }

  const components = opts.components ?? [];
  const canMakeSavedComponent = !components.some(
    c => c?.rootNodeId === selectionId
  );

  return {
    selection: {
      id: selectionId,
      type,
      isCanvas,
      isDeletable,
      isLinked,
      canDelete,
    },
    parent: { id: parentId, displayName: parentDisplayName },
    clipboard: clipboardSnap,
    "siblingMove.canMoveUp": canMoveUp,
    "siblingMove.canMoveDown": canMoveDown,
    canMakeSavedComponent,
    hasPageIsolation: pageIsolation,
  };
}
