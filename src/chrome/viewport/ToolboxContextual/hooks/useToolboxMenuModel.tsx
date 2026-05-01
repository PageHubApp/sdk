import { Element, useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useAtomState } from "@zedux/react";
import { useCallback } from "react";
import {
  AiChatAttachedNodesAtom,
  AssistantOpenAtom,
  ComponentsAtom,
  SectionPickerDialogAtom,
  SideBarOpen,
  useSetAtomState,
} from "../../../../utils/atoms";
import { checkIfAncestorLinked } from "../../../../utils/component/componentUtils";
import { useAiEnabled } from "../../../../utils/hooks/useAiEnabled";
import { useSDK } from "../../../../core/context";
import { phStorage } from "../../../../utils/phStorage";
import { usePanelUrl } from "../../../../utils/usePanelUrl";
import { useUnifiedDelete } from "../../../hooks/useUnifiedDelete";
import { NodeType, resolveNodeTypeFromQuery } from "@/utils/hooks/useNodeType";
import { ToolboxMenu, toolboxMenuInitialState } from "../../../rendering/toolboxMenuAtom";
import {
  getSiblingMoveState,
  moveNodeDown,
  moveNodeUp,
} from "../../../toolbar/dialogs/Layers/siblingMoveOps";
import { ContextMenuInsertComponentFlyout } from "../../ContextMenuInsertComponentFlyout";
import { duplicateNodeById } from "../../duplicateNodeById";
import { useInsertFlyout } from "../../hooks/useInsertFlyout";
import { addHandler, buildClonedTree, saveHandler } from "../../viewportExports";
import { AddElement } from "../../toolbox/toolboxUtils";
import {
  CANVAS_CLASS_CLIPBOARD,
  hasCraftClipboardPaste,
  readClassClipboard,
} from "../utils/clipboardChecks";

/**
 * Models all gate booleans + handler callbacks for the canvas right-click menu.
 * Sections render off this model — they don't recompute gates or own state.
 *
 * Computing every gate up-front (rather than per-section) keeps the menu's
 * "shape" decisions in one readable block and avoids redundant `node` walks.
 */
export function useToolboxMenuModel() {
  const [menu, setMenu] = useAtomState(ToolboxMenu);
  const { actions, query } = useEditor();
  const { setProp } = actions;
  const setSectionPickerDialog = useSetAtomState(SectionPickerDialogAtom);
  const { open: openPanel } = usePanelUrl();

  const flyout = useInsertFlyout();
  const {
    insertPanelOpen,
    setInsertPanelOpen,
    componentFlyoutOpen,
    setComponentFlyoutOpen,
    insertPanelFloating,
    componentPanelFloating,
    cancelInsertLeaveTimer,
    closeBoth: closeInsertFlyouts,
    scheduleCloseInsertPanels,
    scheduleCloseComponentFlyoutOnly,
  } = flyout;

  const getCloneTree = useCallback(
    (tree: any) => buildClonedTree({ tree, query, setProp, createLinks: false }),
    [query, setProp]
  );

  const [, setAttachedNodes] = useAtomState(AiChatAttachedNodesAtom);
  const [components, setComponents] = useAtomState(ComponentsAtom);
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);
  const setSideBarOpen = useSetAtomState(SideBarOpen);
  const { config } = useSDK();
  const aiEnabled = useAiEnabled();
  const renderContext = config.editorChromeSlots?.renderNodeAiContextButton;
  const { deleteSelectedNode } = useUnifiedDelete();

  const id = menu.id || "";

  const closeMenu = useCallback(() => {
    closeInsertFlyouts();
    setMenu({ ...toolboxMenuInitialState });
  }, [closeInsertFlyouts, setMenu]);

  // ─── Gates ─────────────────────────────────────────────────────────
  const node = menu.enabled && id ? query.node(id).get() : null;
  const parentId = node?.data?.parent as string | undefined;
  const parentNode = parentId ? query.node(parentId).get() : null;
  const parentDisplayName =
    (parentNode?.data?.custom?.displayName as string | undefined) ||
    (parentNode?.data?.displayName as string | undefined) ||
    null;
  const showSelectParent = Boolean(
    id && id !== ROOT_NODE && parentId && parentDisplayName !== "Background"
  );
  const nodeType = node?.data?.props?.type as string | undefined;
  const isPageOrBackground = nodeType === "page" || nodeType === "background";

  const nodeDeletable = Boolean(id && query.node(id).isDeletable());
  const isLinked = Boolean(id && checkIfAncestorLinked(id, query));
  /** Same gate as legacy toolbar footer: clipboard + duplicate + convert */
  const mutateClipboardAllowed = nodeDeletable && !isLinked;
  const canMake = !((components || []) as { rootNodeId?: string }[]).find(c => c.rootNodeId === id);

  const canDelete =
    Boolean(node) &&
    id !== ROOT_NODE &&
    Boolean(node?.data.parent) &&
    node?.data.props?.canDelete !== false &&
    node?.data.custom?.permissions?.canDelete !== false;
  const canDeleteVisible = Boolean(canDelete && nodeDeletable);
  const canDuplicate = Boolean(
    node && id !== ROOT_NODE && !isPageOrBackground && mutateClipboardAllowed
  );
  const displayName =
    (node?.data?.custom?.displayName as string | undefined) ||
    (node?.data?.displayName as string | undefined) ||
    String(node?.data?.name || "Element");
  const canPinAi = Boolean(id && id !== ROOT_NODE && aiEnabled && renderContext);

  const isCanvas = Boolean(node?.data?.isCanvas);
  const canCopy = Boolean(id && id !== ROOT_NODE && !isPageOrBackground && mutateClipboardAllowed);
  const canPasteHere = Boolean(
    id && id !== ROOT_NODE && !isPageOrBackground && mutateClipboardAllowed
  );
  const showPaste = canPasteHere && hasCraftClipboardPaste();

  const resolvedCraftType = menu.enabled && id ? resolveNodeTypeFromQuery(query, id) : null;
  const showAddSection = Boolean(isCanvas && nodeType === "page");
  const showAddContainer = Boolean(isCanvas && nodeType !== "page" && nodeType !== "background");
  const showBlockInsert = resolvedCraftType === NodeType.Section;
  const showInsertComponentRow =
    resolvedCraftType === NodeType.Section ||
    resolvedCraftType === NodeType.Container ||
    resolvedCraftType === NodeType.Page;

  const hasInsertSubmenu = Boolean(
    showAddSection || showAddContainer || showBlockInsert || showInsertComponentRow
  );

  const siblingMove = id && id !== ROOT_NODE && parentId ? getSiblingMoveState(query, id) : null;
  const canMoveSiblings = Boolean(
    id &&
      id !== ROOT_NODE &&
      parentId &&
      !isPageOrBackground &&
      node?.data.props?.canDelete !== false &&
      node?.data.custom?.permissions?.canDelete !== false
  );
  const canMoveUp = Boolean(canMoveSiblings && siblingMove?.canMoveUp);
  const canMoveDown = Boolean(canMoveSiblings && siblingMove?.canMoveDown);

  const classClipboard = readClassClipboard();
  const canPasteClasses = Boolean(
    id && !isPageOrBackground && mutateClipboardAllowed && classClipboard?.className != null
  );

  const showCopyBtn = canCopy;
  const showMoveUpBtn = canMoveUp;
  const showMoveDownBtn = canMoveDown;
  const showMoveSection = showMoveUpBtn || showMoveDownBtn;
  const showNavSection = showSelectParent || showMoveSection;
  const showCopyClassesBtn = canCopy;
  const showPasteClassesBtn = canPasteClasses;
  /** Convert row visible when footer would have shown the control (not page/bg, not root). */
  const showConvertRow = Boolean(
    id && id !== ROOT_NODE && !isPageOrBackground && mutateClipboardAllowed
  );
  /** Clipboard + class clipboard in one visual group (Copy next to Copy classes). */
  const showCopyPasteSection =
    showCopyBtn || showPaste || showCopyClassesBtn || showPasteClassesBtn;
  const showDuplicateBtn = canDuplicate;
  const showDeleteBtn = canDeleteVisible;
  const showDupDelSection = showDuplicateBtn || showDeleteBtn || showConvertRow;
  const showDeselect = Boolean(menu.enabled && id);
  const showAi = Boolean(canPinAi && renderContext);

  const hasAnyMenuItems = Boolean(
    showDeselect ||
      showCopyPasteSection ||
      showNavSection ||
      hasInsertSubmenu ||
      showDupDelSection ||
      showConvertRow ||
      showAi
  );

  // ─── Handlers ──────────────────────────────────────────────────────
  const handleDelete = () => {
    if (!canDeleteVisible || !id) return;
    closeMenu();
    actions.selectNode(id);
    setTimeout(() => {
      void deleteSelectedNode(false);
    }, 10);
  };

  const handleDeselect = () => {
    if (!showDeselect) return;
    closeMenu();
    actions.selectNode(null);
    setSideBarOpen(false);
  };

  const handleConvertToComponent = async () => {
    if (!showConvertRow || !id || !canMake) return;
    closeMenu();
    try {
      const comp = await saveHandler({ query, id, component: "component", actions });
      setComponents((prev: unknown[]) => [...prev, comp]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = async () => {
    if (!canCopy || !id) return;
    closeMenu();
    try {
      await saveHandler({ query, id, component: null, actions });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePaste = () => {
    if (!showPaste || !id) return;
    closeMenu();
    actions.selectNode(id);
    requestAnimationFrame(() => {
      addHandler({
        actions,
        query,
        getCloneTree,
        id,
        setProp,
      });
    });
  };

  const handleCopyClasses = () => {
    if (!canCopy || !id || !node) return;
    const props = node.data.props || {};
    const cn = typeof props.className === "string" ? props.className : "";
    const active = (props.root?.activeModifiers as string[]) || [];
    phStorage.set(CANVAS_CLASS_CLIPBOARD, { className: cn, activeModifiers: active });
  };

  const handlePasteClasses = () => {
    if (!canPasteClasses || !id || !classClipboard) return;
    closeMenu();
    actions.setProp(id, (props: any) => {
      props.className = classClipboard.className || "";
      if (!props.root) props.root = {};
      props.root.activeModifiers = [...(classClipboard.activeModifiers || [])];
    });
  };

  const handleSelectParent = () => {
    if (!showSelectParent || !parentId) return;
    closeMenu();
    actions.selectNode(parentId);
  };

  const handleMoveUp = () => {
    if (!canMoveUp || !id) return;
    moveNodeUp(query, actions, id);
  };

  const handleMoveDown = () => {
    if (!canMoveDown || !id) return;
    moveNodeDown(query, actions, id);
  };

  const handleAddSection = async () => {
    if (!showAddSection || !id) return;
    closeMenu();
    const liveResolver = query.getOptions().resolver;
    const ContainerComp = liveResolver?.["Container"];
    if (!ContainerComp) return;
    const n = query.node(id).get();
    const index = n.data.nodes.length;
    AddElement({
      element: (
        <Element
          canvas
          is={ContainerComp}
          canDelete={true}
          className="gap-section flex w-full flex-col"
          custom={{ displayName: "Section" }}
        />
      ),
      actions,
      query,
      addTo: id,
      index,
    });
  };

  const handleAddNestedContainer = async () => {
    if (!showAddContainer || !id) return;
    closeMenu();
    const liveResolver = query.getOptions().resolver;
    const ContainerComp = liveResolver?.["Container"];
    if (!ContainerComp) return;
    const n = query.node(id).get();
    const index = n.data.nodes.length;
    AddElement({
      element: (
        <Element
          canvas
          is={ContainerComp}
          canDelete={true}
          className="gap-section flex w-full flex-col"
          custom={{ displayName: "Container" }}
        />
      ),
      actions,
      query,
      addTo: id,
      index,
    });
  };

  const handleBlocksAt = (position: "top" | "bottom") => {
    if (!showBlockInsert || !id || !parentId) return;
    closeMenu();
    setSectionPickerDialog({
      isOpen: false,
      nodeId: id,
      parent: parentId,
      position,
    });
    openPanel("blocks");
  };

  const handleDuplicate = async () => {
    if (!canDuplicate || !id) return;
    closeMenu();
    try {
      await duplicateNodeById({ query, actions, setProp, id });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddToAi = () => {
    if (!canPinAi || !id) return;
    closeMenu();
    setAttachedNodes(prev => {
      if (prev.some(n => n.id === id)) return prev;
      return [...prev, { id, displayName }];
    });
    setAssistantOpen({ nodeId: id, revealPanel: true });
  };

  return {
    // raw menu state
    menu,
    id,
    closeMenu,

    // gates
    showDeselect,
    showCopyPasteSection,
    showCopyBtn,
    showCopyClassesBtn,
    showPaste,
    showPasteClassesBtn,
    showNavSection,
    showSelectParent,
    showMoveUpBtn,
    showMoveDownBtn,
    hasInsertSubmenu,
    showAddSection,
    showAddContainer,
    showBlockInsert,
    showInsertComponentRow,
    showDupDelSection,
    showDuplicateBtn,
    showDeleteBtn,
    showConvertRow,
    canMake,
    showAi,
    canPinAi,
    renderContext,
    hasAnyMenuItems,

    // handlers
    handleDelete,
    handleDeselect,
    handleConvertToComponent,
    handleCopy,
    handlePaste,
    handleCopyClasses,
    handlePasteClasses,
    handleSelectParent,
    handleMoveUp,
    handleMoveDown,
    handleAddSection,
    handleAddNestedContainer,
    handleBlocksAt,
    handleDuplicate,
    handleAddToAi,

    // flyout
    insertPanelOpen,
    setInsertPanelOpen,
    componentFlyoutOpen,
    setComponentFlyoutOpen,
    insertPanelFloating,
    componentPanelFloating,
    cancelInsertLeaveTimer,
    scheduleCloseInsertPanels,
    scheduleCloseComponentFlyoutOnly,

    // shared mount-effect for resetting flyouts when menu re-opens
  };
}

export type ToolboxMenuModel = ReturnType<typeof useToolboxMenuModel>;
