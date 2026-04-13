import { useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useAtomState } from "@zedux/react";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Placement } from "@floating-ui/react-dom";
import {
  TbBrush,
  TbChevronDown,
  TbChevronRight,
  TbChevronUp,
  TbClipboard,
  TbClipboardCheck,
  TbComponents,
  TbCopy,
  TbLayoutGridAdd,
  TbPlus,
  TbTrash,
} from "react-icons/tb";
import { AiChatAttachedNodesAtom, ClippyOpenAtom, SectionPickerDialogAtom } from "utils/atoms";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { useSDK } from "../../context";
import { useSetAtomState } from "../../utils/atoms";
import generate from "../../utils/data/nameGenerator";
import { phStorage } from "../../utils/phStorage";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { useUnifiedDelete } from "../hooks/useUnifiedDelete";
import { NodeType, resolveNodeTypeFromQuery } from "../NodeControllers/hooks/useNodeType";
import { ToolboxMenu, toolboxMenuInitialState } from "../RenderNode";
import {
  getSiblingMoveState,
  moveNodeDown,
  moveNodeUp,
} from "../Toolbar/Tools/Layers/siblingMoveOps";
import {
  OVERLAY_Z_CONTEXT_COMPONENT_FLYOUT,
  OVERLAY_Z_CONTEXT_INSERT_PANEL,
} from "../overlays/overlayZIndex";
import { useAnchoredPopover } from "../overlays/useAnchoredPopover";
import { ContextMenuInsertComponentFlyout } from "./ContextMenuInsertComponentFlyout";
import { duplicateNodeById } from "./duplicateNodeById";
import { addHandler, buildClonedTree, saveHandler } from "./lib";
import { AddElement } from "./Toolbox/lib";

const MENU_W = 220;
const MENU_H = 420;
const CANVAS_CLASS_CLIPBOARD = "canvas-class-clipboard";

/** Same interaction as `.ph-select-item` (dropdowns.css): accent fill reads on base-100 menus. */
const CTX_MENU_HOVER =
  "outline-none transition-[color,background-color] duration-150 ease-out hover:bg-accent hover:text-accent-content focus-visible:bg-accent focus-visible:text-accent-content active:bg-accent/90";
const CTX_MENU_ITEM = `flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-left text-sm ${CTX_MENU_HOVER}`;
const CTX_MENU_SUBMENU_TRIGGER = `flex w-full cursor-default select-none items-center justify-between gap-2 rounded-sm px-3 py-2 text-left text-sm ${CTX_MENU_HOVER}`;

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
 * Canvas right-click menu: clipboard, move, classes, Insert submenu, duplicate, delete, AI.
 */
export const ToolboxContexual = () => {
  const [menu, setMenu] = useAtomState(ToolboxMenu);
  const ref = useRef<HTMLDivElement>(null);
  const insertLeaveTimer = useRef<number | null>(null);

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
  const setClippyOpen = useSetAtomState(ClippyOpenAtom);
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

  const node = menu.enabled && id ? query.node(id).get() : null;
  const parentId = node?.data?.parent as string | undefined;
  const nodeType = node?.data?.props?.type as string | undefined;
  const isPageOrBackground = nodeType === "page" || nodeType === "background";

  const canDelete =
    Boolean(node) &&
    id !== ROOT_NODE &&
    Boolean(node?.data.parent) &&
    node?.data.props?.canDelete !== false &&
    node?.data.custom?.permissions?.canDelete !== false;
  const canDuplicate = Boolean(node && id !== ROOT_NODE && !isPageOrBackground);
  const displayName =
    (node?.data?.custom?.displayName as string | undefined) ||
    (node?.data?.displayName as string | undefined) ||
    String(node?.data?.name || "Element");
  const canPinAi = Boolean(id && id !== ROOT_NODE && aiEnabled && renderContext);

  const isCanvas = Boolean(node?.data?.isCanvas);
  const canCopy = Boolean(id && id !== ROOT_NODE && !isPageOrBackground);
  const canPasteHere = Boolean(id && id !== ROOT_NODE && !isPageOrBackground);
  const showPaste = canPasteHere && hasCraftClipboardPaste();

  const resolvedCraftType = menu.enabled && id ? resolveNodeTypeFromQuery(query, id) : null;
  const showAddSection = Boolean(isCanvas && nodeType === "page");
  const showAddContainer = Boolean(isCanvas && nodeType !== "page" && nodeType !== "background");
  const showBlockInsert = resolvedCraftType === NodeType.Section;
  const showAddPage = resolvedCraftType === NodeType.Page;
  const showInsertComponentRow =
    resolvedCraftType === NodeType.Section || resolvedCraftType === NodeType.Container;

  const hasInsertSubmenu = Boolean(
    showAddSection || showAddContainer || showBlockInsert || showAddPage || showInsertComponentRow
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
    canPasteHere && classClipboard?.className != null && id && !isPageOrBackground
  );

  const showCopyBtn = canCopy;
  const showMoveUpBtn = canMoveUp;
  const showMoveDownBtn = canMoveDown;
  const showMoveSection = showMoveUpBtn || showMoveDownBtn;
  const showCopyClassesBtn = canCopy;
  const showPasteClassesBtn = canPasteClasses;
  const showClassesSection = showCopyClassesBtn || showPasteClassesBtn;
  const showDuplicateBtn = canDuplicate;
  const showDeleteBtn = canDelete;
  const showDupDelSection = showDuplicateBtn || showDeleteBtn;

  const hasAnyMenuItems = Boolean(
    showCopyBtn ||
    showPaste ||
    showMoveSection ||
    showClassesSection ||
    hasInsertSubmenu ||
    showDupDelSection ||
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

  useEffect(() => {
    if (!menu.enabled) return;
    const winH = window.innerHeight;
    const winW = window.innerWidth;
    const { x, y } = menu;
    const sty: CSSProperties = { left: x, top: y, position: "fixed" };

    if (y + MENU_H > winH) {
      delete sty.top;
      sty.bottom = 8;
    }
    if (x + MENU_W > winW) {
      delete sty.left;
      sty.right = 8;
    }
    setStyle(sty);
  }, [menu]);

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
    if (!canDelete || !id) return;
    close();
    actions.selectNode(id);
    setTimeout(() => {
      void deleteSelectedNode(false);
    }, 10);
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

  const handleAddPage = async () => {
    if (!showAddPage || !id) return;
    close();
    const { Element } = await import("@craftjs/core");
    const liveResolver = query.getOptions().resolver;
    const ContainerComp = liveResolver?.["Container"];
    if (!ContainerComp) return;
    const rootNode = query.node(ROOT_NODE).get();
    const currentPageIndex = rootNode.data.nodes.indexOf(id);
    const newIndex = currentPageIndex + 1;
    const newPage = (
      <Element
        canvas
        is={ContainerComp}
        type="page"
        canDelete={true}
        canEditName={true}
        className="mx-auto flex h-full w-full flex-col items-center gap-8 px-3 py-6"
        custom={{ displayName: generate().spaced }}
      />
    );
    const newElement = AddElement({
      element: newPage,
      actions,
      query,
      addTo: ROOT_NODE,
      index: newIndex,
    });
    if (newElement?.rootNodeId) {
      setTimeout(() => {
        const added = query.node(newElement.rootNodeId).get();
        if (added?.dom) {
          added.dom.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
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
    setClippyOpen({ nodeId: id });
  };

  if (!menu.enabled || !id) return null;
  if (!hasAnyMenuItems) return null;

  const dividerBeforeMove = showCopyBtn || showPaste;
  const dividerBeforeClasses = dividerBeforeMove || showMoveSection;
  const dividerBeforeInsert = dividerBeforeClasses || showClassesSection;
  const dividerBeforeDupDel = dividerBeforeInsert || hasInsertSubmenu;
  const anyAboveAi =
    showCopyBtn ||
    showPaste ||
    showMoveSection ||
    showClassesSection ||
    hasInsertSubmenu ||
    showDupDelSection;

  return (
    <div
      id="editor-node-context-menu"
      ref={ref}
      role="menu"
      aria-label="Element actions"
      style={style}
      className="rounded-box border-base-300/50 bg-base-100 text-base-content z-10050 min-w-[12rem] overflow-visible border py-1 shadow-xl select-none"
    >
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
      {showPaste ? (
        <button type="button" role="menuitem" className={CTX_MENU_ITEM} onClick={handlePaste}>
          <TbClipboardCheck className="size-4 shrink-0 opacity-80" aria-hidden />
          Paste
        </button>
      ) : null}

      {showMoveSection ? (
        <div className={dividerBeforeMove ? "border-base-200 border-t pt-1" : ""}>
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

      {showClassesSection ? (
        <div className={dividerBeforeClasses ? "border-base-200 border-t pt-1" : ""}>
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
                  className="rounded-box border-base-300/50 bg-base-100 text-base-content max-h-[min(70vh,28rem)] min-w-[11rem] overflow-x-visible overflow-y-auto border py-1 shadow-xl select-none"
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
                      onMouseLeave={scheduleCloseInsertPanels}
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
                  {showAddPage ? (
                    <button
                      type="button"
                      className={CTX_MENU_ITEM}
                      onClick={() => void handleAddPage()}
                    >
                      <TbLayoutGridAdd className="size-4 shrink-0 opacity-80" aria-hidden />
                      Add page
                    </button>
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
                  onMouseLeave={scheduleCloseInsertPanels}
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
