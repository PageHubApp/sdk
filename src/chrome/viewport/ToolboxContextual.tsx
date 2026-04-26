import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useAtomState } from "@zedux/react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Placement } from "@floating-ui/react-dom";
import {
  TbBrush,
  TbCaretUp,
  TbChevronDown,
  TbChevronRight,
  TbChevronUp,
  TbClipboard,
  TbClipboardCheck,
  TbComponents,
  TbComponentsOff,
  TbCopy,
  TbLayoutGridAdd,
  TbPlus,
  TbTrash,
  TbX,
} from "react-icons/tb";
import {
  AiChatAttachedNodesAtom,
  AssistantOpenAtom,
  SectionPickerDialogAtom,
} from "../../utils/atoms";
import { checkIfAncestorLinked } from "../../utils/componentUtils";
import { useAiEnabled } from "../../utils/hooks/useAiEnabled";
import { useSDK } from "../../core/context";
import { useSetAtomState } from "../../utils/atoms";
import { ComponentsAtom, SideBarOpen } from "../../utils/lib";
import { phStorage } from "../../utils/phStorage";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { useUnifiedDelete } from "../hooks/useUnifiedDelete";
import { NodeType, resolveNodeTypeFromQuery } from "../canvas/hooks/useNodeType";
import { ToolboxMenu, toolboxMenuInitialState } from "../rendering/toolboxMenuAtom";
import {
  getSiblingMoveState,
  moveNodeDown,
  moveNodeUp,
} from "../toolbar/dialogs/Layers/siblingMoveOps";
import {
  OVERLAY_Z_CONTEXT_COMPONENT_FLYOUT,
  OVERLAY_Z_CONTEXT_INSERT_PANEL,
} from "../overlays/overlayZIndex";
import { useAnchoredPopover } from "../overlays/useAnchoredPopover";
import { ContextMenuInsertComponentFlyout } from "./ContextMenuInsertComponentFlyout";
import { duplicateNodeById } from "./duplicateNodeById";
import { addHandler, buildClonedTree, saveHandler } from "./viewportExports";
import { AddElement } from "./toolbox/toolboxUtils";

/** Fallback width before the menu node is measured (matches min-w ~12rem). */
const MENU_W = 220;
const CANVAS_CLASS_CLIPBOARD = "canvas-class-clipboard";

/** Same interaction as `.ph-select-item` (dropdowns.css): accent fill reads on base-100 menus. */
const CTX_MENU_HOVER =
  "outline-none transition-[color,background-color] duration-150 ease-out hover:bg-accent hover:text-accent-content focus-visible:bg-accent focus-visible:text-accent-content active:bg-accent/90";
const CTX_MENU_ITEM = `flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${CTX_MENU_HOVER}`;
const CTX_MENU_SUBMENU_TRIGGER = `flex w-full cursor-default select-none items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm ${CTX_MENU_HOVER}`;

const CONTEXT_SUBMENU_FALLBACKS: Placement[] = [
  "left-start",
  "right-end",
  "left-end",
  "top-start",
  "bottom-start",
  "top-end",
  "bottom-end",
];

const CONTEXT_SUBMENU_FLIP = {
  crossAxis: true,
  fallbackPlacements: CONTEXT_SUBMENU_FALLBACKS,
};

function hasCraftClipboardPaste(): boolean {
  const raw = phStorage.get("clipboard");
  if (!raw || raw === "{}") return false;
  try {
    const o = JSON.parse(raw) as { nodes?: string; rootNodeId?: string };
    return Boolean(o?.nodes && o?.rootNodeId && o.nodes !== "{}");
  } catch {
    return false;
  }
}

function readClassClipboard(): { className: string; activeModifiers: string[] } | null {
  return phStorage.getJSON(CANVAS_CLASS_CLIPBOARD, null);
}

/**
 * Canvas right-click menu: Deselect; copy/paste (node + classes); structure; Insert; duplicate;
 * convert to component; delete; AI. Mutate/clipboard actions match legacy toolbar footer gates
 * (isDeletable, not linked).
 */
export const ToolboxContexual = () => {
  const [menu, setMenu] = useAtomState(ToolboxMenu);
  const ref = useRef<HTMLDivElement>(null);
  const insertLeaveTimer = useRef<number | null>(null);
  const componentFlyoutLeaveTimer = useRef<number | null>(null);

  const { actions, query } = useEditor();
  const { setProp } = actions;
  const setSectionPickerDialog = useSetAtomState(SectionPickerDialogAtom);
  const { open: openPanel } = usePanelUrl();

  const [insertPanelOpen, setInsertPanelOpen] = useState(false);
  const [componentFlyoutOpen, setComponentFlyoutOpen] = useState(false);

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

  const cancelInsertLeaveTimer = () => {
    if (insertLeaveTimer.current) {
      window.clearTimeout(insertLeaveTimer.current);
      insertLeaveTimer.current = null;
    }
    if (componentFlyoutLeaveTimer.current) {
      window.clearTimeout(componentFlyoutLeaveTimer.current);
      componentFlyoutLeaveTimer.current = null;
    }
  };

  const close = useCallback(() => {
    cancelInsertLeaveTimer();
    setInsertPanelOpen(false);
    setComponentFlyoutOpen(false);
    setMenu({ ...toolboxMenuInitialState });
  }, [setMenu]);

  const scheduleCloseInsertPanels = () => {
    cancelInsertLeaveTimer();
    insertLeaveTimer.current = window.setTimeout(() => {
      setInsertPanelOpen(false);
      setComponentFlyoutOpen(false);
      insertLeaveTimer.current = null;
    }, 160);
  };

  /** Closing the nested component flyout only — not the whole Insert panel (sibling items like Add empty section). */
  const scheduleCloseComponentFlyoutOnly = () => {
    if (componentFlyoutLeaveTimer.current) {
      window.clearTimeout(componentFlyoutLeaveTimer.current);
      componentFlyoutLeaveTimer.current = null;
    }
    componentFlyoutLeaveTimer.current = window.setTimeout(() => {
      setComponentFlyoutOpen(false);
      componentFlyoutLeaveTimer.current = null;
    }, 160);
  };

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
  const canPasteHere = Boolean(id && id !== ROOT_NODE && !isPageOrBackground && mutateClipboardAllowed);
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
    id &&
    !isPageOrBackground &&
    mutateClipboardAllowed &&
    classClipboard?.className != null
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

  const hasAnyMenuItems = Boolean(
    showDeselect ||
    showCopyPasteSection ||
    showNavSection ||
    hasInsertSubmenu ||
    showDupDelSection ||
    showConvertRow ||
    (canPinAi && renderContext)
  );

  const [style, setStyle] = useState<CSSProperties>({});

  const insertPanelFloating = useAnchoredPopover({
    open: insertPanelOpen,
    placement: "right-start",
    strategy: "fixed",
    mainAxisOffset: -6,
    crossAxisOffset: 0,
    flipOptions: CONTEXT_SUBMENU_FLIP,
    shiftPadding: 8,
  });

  const componentPanelFloating = useAnchoredPopover({
    open: componentFlyoutOpen,
    placement: "right-start",
    strategy: "fixed",
    mainAxisOffset: -6,
    crossAxisOffset: 0,
    flipOptions: CONTEXT_SUBMENU_FLIP,
    shiftPadding: 8,
  });

  useEffect(() => {
    if (!menu.enabled) {
      setInsertPanelOpen(false);
      setComponentFlyoutOpen(false);
      return;
    }
    setInsertPanelOpen(false);
    setComponentFlyoutOpen(false);
  }, [menu.enabled, menu.id]);

  useLayoutEffect(() => {
    if (!menu.enabled) {
      setStyle({});
      return;
    }
    if (!hasAnyMenuItems) return;

    const PAD = 8;
    const winH = window.innerHeight;
    const winW = window.innerWidth;
    const { x, y } = menu;

    const clamp = (width: number, height: number) => {
      let left = x;
      let top = y;
      if (left + width > winW - PAD) left = Math.max(PAD, winW - PAD - width);
      if (top + height > winH - PAD) top = Math.max(PAD, winH - PAD - height);
      if (left < PAD) left = PAD;
      if (top < PAD) top = PAD;
      setStyle({ left, top, position: "fixed" });
    };

    const el = ref.current;
    if (el) {
      const { width, height } = el.getBoundingClientRect();
      clamp(width, height);
    } else {
      clamp(MENU_W, 280);
    }
  }, [menu.enabled, menu.x, menu.y, menu.id, hasAnyMenuItems]);

  useEffect(() => {
    if (!menu.enabled) return;
    let detach: (() => void) | undefined;
    const tid = window.setTimeout(() => {
      const onDoc = (event: MouseEvent) => {
        if (event.button === 2) return;
        const t = event.target as Node;
        if (ref.current?.contains(t)) return;
        if (insertPanelFloating.refs.floating.current?.contains(t)) return;
        if (componentPanelFloating.refs.floating.current?.contains(t)) return;
        cancelInsertLeaveTimer();
        setInsertPanelOpen(false);
        setComponentFlyoutOpen(false);
        setMenu({ ...toolboxMenuInitialState });
      };
      document.addEventListener("pointerdown", onDoc, true);
      detach = () => document.removeEventListener("pointerdown", onDoc, true);
    }, 0);
    return () => {
      window.clearTimeout(tid);
      detach?.();
    };
  }, [menu.enabled, setMenu]);

  useEffect(() => {
    if (!menu.enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (componentFlyoutOpen) {
        setComponentFlyoutOpen(false);
        e.preventDefault();
        return;
      }
      if (insertPanelOpen) {
        setInsertPanelOpen(false);
        e.preventDefault();
        return;
      }
      setMenu({ ...toolboxMenuInitialState });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu.enabled, setMenu, insertPanelOpen, componentFlyoutOpen]);

  useLayoutEffect(() => {
    if (!menu.enabled || !id || hasAnyMenuItems) return;
    setMenu({ ...toolboxMenuInitialState });
  }, [menu.enabled, id, hasAnyMenuItems, setMenu]);

  const handleDelete = () => {
    if (!canDeleteVisible || !id) return;
    close();
    actions.selectNode(id);
    setTimeout(() => {
      void deleteSelectedNode(false);
    }, 10);
  };

  const handleDeselect = () => {
    if (!showDeselect) return;
    close();
    actions.selectNode(null);
    setSideBarOpen(false);
  };

  const handleConvertToComponent = async () => {
    if (!showConvertRow || !id || !canMake) return;
    close();
    try {
      const comp = await saveHandler({ query, id, component: "component", actions });
      setComponents((prev: unknown[]) => [...prev, comp]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = async () => {
    if (!canCopy || !id) return;
    close();
    try {
      await saveHandler({ query, id, component: null, actions });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePaste = () => {
    if (!showPaste || !id) return;
    close();
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
    close();
    actions.setProp(id, (props: any) => {
      props.className = classClipboard.className || "";
      if (!props.root) props.root = {};
      props.root.activeModifiers = [...(classClipboard.activeModifiers || [])];
    });
  };

  const handleSelectParent = () => {
    if (!showSelectParent || !parentId) return;
    close();
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
    close();
    const { Element } = await import("@craftjs/core");
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
    close();
    const { Element } = await import("@craftjs/core");
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
    close();
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
    close();
    try {
      await duplicateNodeById({ query, actions, setProp, id });
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddToAi = () => {
    if (!canPinAi || !id) return;
    close();
    setAttachedNodes(prev => {
      if (prev.some(n => n.id === id)) return prev;
      return [...prev, { id, displayName }];
    });
    setAssistantOpen({ nodeId: id, revealPanel: true });
  };

  if (!menu.enabled || !id) return null;
  if (!hasAnyMenuItems) return null;

  const dividerBeforeCopy = showDeselect;
  const dividerBeforeNav = showDeselect || showCopyPasteSection;
  const dividerBeforeInsert = dividerBeforeNav || showNavSection;
  const dividerBeforeDupDel = dividerBeforeInsert || hasInsertSubmenu;
  const anyAboveAi =
    showDeselect ||
    showCopyPasteSection ||
    showNavSection ||
    hasInsertSubmenu ||
    showDupDelSection;

  return (
    <div
      id="editor-node-context-menu"
      ref={ref}
      role="menu"
      aria-label="Element actions"
      style={{
        position: "fixed",
        left: (style.left as number | undefined) ?? menu.x,
        top: (style.top as number | undefined) ?? menu.y,
      }}
      className="rounded-xl border-base-300/50 bg-base-100 text-base-content z-10050 min-w-[12rem] overflow-visible border py-1 shadow-xl select-none"
    >
      {showDeselect ? (
        <button type="button" role="menuitem" className={CTX_MENU_ITEM} onClick={handleDeselect}>
          <TbX className="size-4 shrink-0 opacity-80" aria-hidden />
          Deselect
        </button>
      ) : null}

      {showCopyPasteSection ? (
        <div className={dividerBeforeCopy ? "border-base-200 border-t pt-1" : ""}>
          {showCopyBtn ? (
            <button
              type="button"
              role="menuitem"
              className={CTX_MENU_ITEM}
              onClick={() => void handleCopy()}
            >
              <TbClipboard className="size-4 shrink-0 opacity-80" aria-hidden />
              Copy
            </button>
          ) : null}
          {showCopyClassesBtn ? (
            <button
              type="button"
              role="menuitem"
              className={CTX_MENU_ITEM}
              onClick={handleCopyClasses}
            >
              <TbBrush className="size-4 shrink-0 opacity-80" aria-hidden />
              Copy classes
            </button>
          ) : null}
          {showPaste ? (
            <button type="button" role="menuitem" className={CTX_MENU_ITEM} onClick={handlePaste}>
              <TbClipboardCheck className="size-4 shrink-0 opacity-80" aria-hidden />
              Paste
            </button>
          ) : null}
          {showPasteClassesBtn ? (
            <button
              type="button"
              role="menuitem"
              className={CTX_MENU_ITEM}
              onClick={handlePasteClasses}
            >
              <TbBrush className="size-4 shrink-0 opacity-80" aria-hidden />
              Paste classes
            </button>
          ) : null}
        </div>
      ) : null}

      {showNavSection ? (
        <div className={dividerBeforeNav ? "border-base-200 border-t pt-1" : ""}>
          {showSelectParent ? (
            <button
              type="button"
              role="menuitem"
              className={CTX_MENU_ITEM}
              onClick={handleSelectParent}
            >
              <TbCaretUp className="size-4 shrink-0 opacity-80" aria-hidden />
              Select parent
            </button>
          ) : null}
          {showMoveUpBtn ? (
            <button type="button" role="menuitem" className={CTX_MENU_ITEM} onClick={handleMoveUp}>
              <TbChevronUp className="size-4 shrink-0 opacity-80" aria-hidden />
              Move up
            </button>
          ) : null}
          {showMoveDownBtn ? (
            <button
              type="button"
              role="menuitem"
              className={CTX_MENU_ITEM}
              onClick={handleMoveDown}
            >
              <TbChevronDown className="size-4 shrink-0 opacity-80" aria-hidden />
              Move down
            </button>
          ) : null}
        </div>
      ) : null}

      {hasInsertSubmenu ? (
        <div className={dividerBeforeInsert ? "border-base-200 border-t pt-1" : ""}>
          <div
            ref={insertPanelFloating.refs.setReference}
            onMouseEnter={() => {
              cancelInsertLeaveTimer();
              setInsertPanelOpen(true);
            }}
            onMouseLeave={scheduleCloseInsertPanels}
          >
            <div role="menuitem" className={CTX_MENU_SUBMENU_TRIGGER}>
              <span className="flex items-center gap-2">
                <TbPlus className="size-4 shrink-0 opacity-80" aria-hidden />
                Insert
              </span>
              <TbChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
            </div>
          </div>
          {insertPanelOpen && typeof document !== "undefined"
            ? createPortal(
                <div
                  ref={insertPanelFloating.refs.setFloating}
                  style={{
                    ...insertPanelFloating.floatingStyles,
                    zIndex: OVERLAY_Z_CONTEXT_INSERT_PANEL,
                  }}
                  className="rounded-xl border-base-300/50 bg-base-100 text-base-content max-h-[min(70vh,28rem)] min-w-[11rem] overflow-x-visible overflow-y-auto border py-1 shadow-xl select-none"
                  onMouseEnter={cancelInsertLeaveTimer}
                  onMouseLeave={scheduleCloseInsertPanels}
                >
                  {showBlockInsert ? (
                    <>
                      <button
                        type="button"
                        className={CTX_MENU_ITEM}
                        onClick={() => handleBlocksAt("top")}
                      >
                        <TbLayoutGridAdd className="size-4 shrink-0 opacity-80" aria-hidden />
                        Add block above
                      </button>
                      <button
                        type="button"
                        className={CTX_MENU_ITEM}
                        onClick={() => handleBlocksAt("bottom")}
                      >
                        <TbLayoutGridAdd className="size-4 shrink-0 opacity-80" aria-hidden />
                        Add block below
                      </button>
                    </>
                  ) : null}
                  {showInsertComponentRow ? (
                    <div
                      ref={componentPanelFloating.refs.setReference}
                      onMouseEnter={() => {
                        cancelInsertLeaveTimer();
                        setComponentFlyoutOpen(true);
                      }}
                      onMouseLeave={scheduleCloseComponentFlyoutOnly}
                    >
                      <div className={CTX_MENU_SUBMENU_TRIGGER}>
                        <span className="flex items-center gap-2">
                          <TbComponents className="size-4 shrink-0 opacity-80" aria-hidden />
                          Insert component
                        </span>
                        <TbChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
                      </div>
                    </div>
                  ) : null}
                  {showAddSection ? (
                    <button
                      type="button"
                      className={CTX_MENU_ITEM}
                      onClick={() => void handleAddSection()}
                    >
                      <TbLayoutGridAdd className="size-4 shrink-0 opacity-80" aria-hidden />
                      Add empty section
                    </button>
                  ) : null}
                  {showAddContainer ? (
                    <button
                      type="button"
                      className={CTX_MENU_ITEM}
                      onClick={() => void handleAddNestedContainer()}
                    >
                      <TbLayoutGridAdd className="size-4 shrink-0 opacity-80" aria-hidden />
                      Add container
                    </button>
                  ) : null}
                </div>,
                document.body
              )
            : null}
          {componentFlyoutOpen && id && typeof document !== "undefined"
            ? createPortal(
                <div
                  ref={componentPanelFloating.refs.setFloating}
                  style={{
                    ...componentPanelFloating.floatingStyles,
                    zIndex: OVERLAY_Z_CONTEXT_COMPONENT_FLYOUT,
                  }}
                  onMouseEnter={cancelInsertLeaveTimer}
                  onMouseLeave={scheduleCloseComponentFlyoutOnly}
                >
                  <ContextMenuInsertComponentFlyout
                    targetNodeId={id}
                    onInserted={close}
                    onOpenComponentsTab={close}
                  />
                </div>,
                document.body
              )
            : null}
        </div>
      ) : null}

      {showDupDelSection ? (
        <div className={dividerBeforeDupDel ? "border-base-200 border-t pt-1" : ""}>
          {showDuplicateBtn ? (
            <button
              type="button"
              role="menuitem"
              className={CTX_MENU_ITEM}
              onClick={() => void handleDuplicate()}
            >
              <TbCopy className="size-4 shrink-0 opacity-80" aria-hidden />
              Duplicate
            </button>
          ) : null}
          {showConvertRow ? (
            <button
              type="button"
              role="menuitem"
              className={`${CTX_MENU_ITEM} ${!canMake ? "cursor-not-allowed opacity-50" : ""}`}
              disabled={!canMake}
              onClick={() => void handleConvertToComponent()}
            >
              {canMake ? (
                <TbComponents className="size-4 shrink-0 opacity-80" aria-hidden />
              ) : (
                <TbComponentsOff className="size-4 shrink-0 opacity-80" aria-hidden />
              )}
              {canMake ? "Convert to component" : "Component exists"}
            </button>
          ) : null}
          {showDeleteBtn ? (
            <button type="button" role="menuitem" className={CTX_MENU_ITEM} onClick={handleDelete}>
              <TbTrash className="size-4 shrink-0 opacity-80" aria-hidden />
              Delete
            </button>
          ) : null}
        </div>
      ) : null}
      {canPinAi && renderContext ? (
        <div
          className={anyAboveAi ? "border-base-200 border-t pt-1" : ""}
          onMouseDown={e => e.stopPropagation()}
          onMouseDownCapture={e => e.stopPropagation()}
        >
          {renderContext({
            onClick: handleAddToAi,
            className: CTX_MENU_ITEM,
            label: "Include in AI chat",
          })}
        </div>
      ) : null}
    </div>
  );
};
