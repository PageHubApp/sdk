import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { checkIfAncestorLinked } from "@/utils/componentUtils";
import { NodeTree, ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  TbCaretUp,
  TbClipboard,
  TbClipboardCheck,
  TbComponents,
  TbComponentsOff,
  TbCopy,
  TbSearch,
  TbTrash,
  TbTrashOff,
  TbX,
} from "react-icons/tb";
import { useSDK } from "../../core/context";
import {
  AiChatAttachedNodesAtom,
  AssistantOpenAtom,
  SettingsAtom,
  useSetAtomState,
} from "../../utils/atoms";
import { useAiEnabled } from "../../utils/hooks/useAiEnabled";
import {
  ComponentsAtom,
  EDITOR_ALL_PAGES_STORAGE,
  IsolateAtom,
  SideBarOpen,
} from "../../utils/lib";
import { phStorage } from "../../utils/phStorage";
import { useUnifiedDelete } from "../hooks/useUnifiedDelete";
import { TabAtom } from "../viewport/atoms";
import { addHandler, buildClonedTree, saveHandler } from "../viewport/viewportExports";
import { useAccordionContext } from "./AccordionContext";
import { RenderChildren } from "./helpers/CloneHelper";
import Tab from "./Tab";
import { TabBarBreakpointPicker } from "./TabBarBreakpointPicker";
import { TabBarCollapseToggle } from "./TabBarCollapseToggle";
import { TabBarDarkModeToggle } from "./TabBarDarkModeToggle";
import { toolbarInputNoAutocompleteProps } from "./toolbarInputAttrs";
import { SettingsSearchAtom, SettingsSearchOpenAtom } from "./unified-settings/registry/atoms";
import { UnifiedTab, scrollToSection, setActiveTabFromClick, toSectionId } from "./UnifiedTab";

export const ToolbarWrapper = ({
  children = null,
  head,
  foot = "",
  unified = false,
  activeSection = "",
}) => {
  const { query, actions } = useEditor();
  const [components, setComponents] = useAtomState(ComponentsAtom);
  const { deleteSelectedNode } = useUnifiedDelete();

  const { id, parent, deletable, props, nodeData, parentName, displayName } = useNode(node => ({
    id: node.id,
    deletable: query.node(node.id).isDeletable(),
    parent: node.data.parent,
    props: node.data.props,
    nodeData: node.data,
    parentName: node.data.parent
      ? query.node(node.data.parent).get()?.data?.custom?.displayName ||
        query.node(node.data.parent).get()?.data?.displayName
      : null,
    displayName:
      (node.data.custom?.displayName as string | undefined) ||
      (node.data.displayName as string | undefined) ||
      String(node.data.name || "Element"),
  }));

  const {
    actions: { setProp },
  } = useEditor();

  const tablistRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    width: number;
    height: number;
    top: number;
    left: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!unified || !tablistRef.current) return;
    const activeTab = tablistRef.current.querySelector(
      '[aria-selected="true"]'
    ) as HTMLElement | null;
    if (!activeTab) return;
    const containerRect = tablistRef.current.getBoundingClientRect();
    const tabRect = activeTab.getBoundingClientRect();
    setIndicatorStyle({
      width: tabRect.width,
      height: tabRect.height,
      top: tabRect.top - containerRect.top,
      left: tabRect.left - containerRect.left,
    });
  }, [activeSection, head, unified]);

  const getCloneTree = useCallback(
    (tree: NodeTree) => buildClonedTree({ tree, query, setProp, createLinks: false }),
    [query, setProp]
  );

  const handleSaveTemplate = useCallback(
    (component = null) => saveHandler({ query, id, component, actions }),
    [id, query, actions]
  );

  const handleAdd = useCallback(() => {
    addHandler({
      actions,
      query,
      getCloneTree,
      id,
      setProp,
    });
  }, [actions, getCloneTree, id, query, setProp]);

  const handleClone = async e => {
    e.preventDefault();

    try {
      // Batch all operations to prevent multiple saves
      await handleSaveTemplate();

      // Use requestAnimationFrame to batch the add operation
      requestAnimationFrame(() => {
        handleAdd();
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopy = async e => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Use the exact same approach as clone - save to localStorage
      await handleSaveTemplate();
    } catch (error) {
      console.error("Error copying node:", error);
    }
  };

  const handlePaste = async e => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Use requestAnimationFrame to batch the add operation
      requestAnimationFrame(() => {
        handleAdd();
      });
    } catch (error) {
      console.error("Error pasting node:", error);
    }
  };

  const [isolate, setIsolate] = useAtomState(IsolateAtom);
  const [, setAttachedNodes] = useAtomState(AiChatAttachedNodesAtom);
  const setAssistantOpen = useSetAtomState(AssistantOpenAtom);
  const { config } = useSDK();
  const aiEnabled = useAiEnabled();
  const renderAiContext = config.editorChromeSlots?.renderNodeAiContextButton;
  const setSideBarOpen = useSetAtomState(SideBarOpen);
  const settings = useAtomValue(SettingsAtom);
  const accordionCtx = useAccordionContext();
  const [searchQuery, setSearchQuery] = useAtomState(SettingsSearchAtom);
  const [searchOpen, setSearchOpen] = useAtomState(SettingsSearchOpenAtom);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const footerActionClass =
    "rounded-lg p-1.5 transition-[color,transform] active:scale-90 cursor-pointer";

  const setActiveTab = useSetAtomState(TabAtom);

  const toggleSearch = useCallback(() => {
    if (searchOpen) {
      setSearchOpen(false);
      setSearchQuery("");
    } else {
      setSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchOpen, setSearchQuery]);

  useEffect(() => {
    const iso = phStorage.get("isolated");
    if (iso && iso !== "null" && iso !== EDITOR_ALL_PAGES_STORAGE) setIsolate(iso);
  }, [setIsolate]);

  const ref = useRef<HTMLButtonElement | null>(null);

  const canMake = !(components || []).find(_ => _.rootNodeId === id);

  // Check if this node or ANY ancestor is a fully linked component (not style mode)
  const isLinked = checkIfAncestorLinked(id, query);

  const pinSelectionInAiChat = () => {
    if (id === ROOT_NODE) return;
    setAttachedNodes(prev => {
      if (prev.some(n => n.id === id)) return prev;
      return [...prev, { id, displayName }];
    });
    setAssistantOpen({ nodeId: id });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Hide settings tabs for fully linked components */}
      {!isLinked && (
        <div
          id="toolbarTabs"
          aria-label="Tabs"
          role="tablist"
          className="border-base-300 bg-secondary text-secondary-content flex shrink-0 items-center justify-between gap-1.5 border-b px-3 py-0.5 text-center font-semibold"
        >
          {/* ── Left: utilities ── */}
          <div className="flex items-center gap-1">
            <TabBarCollapseToggle unified={unified} accordionCtx={accordionCtx} />
            <button
              type="button"
              onClick={toggleSearch}
              className={`inline-flex size-8 cursor-pointer items-center justify-center rounded-lg transition-[color,background-color,transform] active:scale-90 ${
                searchOpen
                  ? "text-primary"
                  : "text-secondary-content hover:text-base-content"
              }`}
              aria-label="Search settings"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Search settings"
              data-tooltip-place="top"
              data-tooltip-offset={10}
            >
              <TbSearch className="size-4" />
            </button>
            <div className="bg-border mx-0.5 h-4 w-px shrink-0" />
            <TabBarBreakpointPicker />
            <TabBarDarkModeToggle />
          </div>

          {/* ── Search input (replaces tabs when active) ── */}
          {searchOpen ? (
            <div className="relative flex flex-1 items-center">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Escape") toggleSearch();
                }}
                placeholder="Search settings..."
                className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:ring-primary h-8 w-full rounded-md border px-2.5 text-xs focus:ring-1 focus:outline-none"
                autoFocus
                {...toolbarInputNoAutocompleteProps}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-neutral-content hover:text-base-content absolute right-1.5 top-1/2 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center"
                >
                  <TbX className="size-3" />
                </button>
              )}
            </div>
          ) : (
            /* ── Right: tab icons ── */
            <div className="flex items-center gap-1.5">
              <div className="bg-border mx-0.5 h-4 w-px shrink-0" />
              <div
                className="relative flex flex-row-reverse items-center gap-3"
                role="tablist"
                ref={tablistRef}
              >
                {indicatorStyle && (
                  <div
                    className="bg-primary absolute bottom-0 h-0.5 rounded-full"
                    style={{
                      width: indicatorStyle.width,
                      left: 0,
                      transform: `translateX(${indicatorStyle.left}px)`,
                      transition:
                        "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      zIndex: 0,
                      pointerEvents: "none",
                    }}
                  />
                )}
                {head.map((_, key) => {
                  // If activeSection doesn't match any tab title (stale from previous node), default to tab 0
                  const sectionMatchesAny = unified && head.some(h => h.title === activeSection);
                  const isActive = unified
                    ? sectionMatchesAny
                      ? activeSection === _.title
                      : key === 0
                    : false;
                  return unified ? (
                    <UnifiedTab
                      key={key}
                      title={_.title}
                      icon={_.icon}
                      isActive={isActive}
                      onClick={() => {
                        setActiveTabFromClick(_.title, setActiveTab);
                        scrollToSection(_.title, key);
                        if (accordionCtx?.openOnly) {
                          // Find all accordion section titles within this tab's DOM section (stable stack id — title can duplicate display names)
                          const sectionEl = document.getElementById(toSectionId(`stack-${key}`));
                          if (sectionEl) {
                            const buttons = sectionEl.querySelectorAll(
                              "[role='button'][aria-label]"
                            );
                            const titles: string[] = [];
                            buttons.forEach(btn => {
                              const label = btn.getAttribute("aria-label");
                              if (label) titles.push(label);
                            });
                            if (titles.length > 0) {
                              accordionCtx.openOnly(titles);
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <Tab key={key} title={_.title} tabId={_.title} icon={_.icon} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div id="toolbarItems" data-toolbar={true} className="flex min-h-0 flex-1 flex-col">
        <RenderChildren props={props} query={query} actions={actions} id={id}>
          {children}
        </RenderChildren>
      </div>

      <div
        id="toolbarFooter"
        className="border-base-300 bg-sidebar box-border flex w-full max-w-none shrink-0 flex-row flex-nowrap items-center justify-between border-y px-2.5 py-1 text-base"
      >
        {foot}

        {id !== ROOT_NODE && (
          <button
            className={`text-neutral-content hover:text-accent-content ${footerActionClass}`}
            onClick={() => {
              actions.selectNode(null);
              setSideBarOpen(false);
            }}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Close"
            data-tooltip-place="top"
            data-tooltip-offset={10}
          >
            <TbX />
          </button>
        )}

        {id !== ROOT_NODE && parentName !== "Background" && (
          <button
            className={`text-neutral-content hover:text-accent-content ${footerActionClass}`}
            onClick={() => actions.selectNode(parent)}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Select Parent"
            data-tooltip-place="top"
            data-tooltip-offset={10}
          >
            <TbCaretUp />
          </button>
        )}

        {deletable && (
          <>
            <button
              className={`text-neutral-content hover:text-accent-content ${footerActionClass}`}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                if (props.canDelete !== false) deleteSelectedNode();
              }}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content={props.canDelete !== false ? "Delete" : "Unable to delete"}
              data-tooltip-place="top"
              data-tooltip-offset={10}
            >
              {props.canDelete !== false ? <TbTrash /> : <TbTrashOff />}
            </button>

            {/* Hide Clone and Create Component buttons for linked components */}
            {!isLinked && (
              <>
                <button
                  className={`text-neutral-content hover:text-accent-content ${footerActionClass}`}
                  onClick={handleClone}
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content="Duplicate"
                  data-tooltip-place="top"
                  data-tooltip-offset={10}
                >
                  <TbCopy />
                </button>

                <button
                  className={`${footerActionClass} transition-colors ${
                    id !== ROOT_NODE
                      ? "text-neutral-content hover:text-accent-content cursor-pointer"
                      : "text-neutral-content/50 cursor-not-allowed"
                  }`}
                  onClick={(e: React.MouseEvent) => {
                    if (id !== ROOT_NODE) handleCopy(e);
                  }}
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content={id !== ROOT_NODE ? "Copy" : "Copy (select a component)"}
                  data-tooltip-place="top"
                  data-tooltip-offset={10}
                >
                  <TbClipboard />
                </button>

                <button
                  className={`${footerActionClass} transition-colors ${
                    phStorage.get("clipboard") && phStorage.get("clipboard") !== "{}"
                      ? "text-neutral-content hover:text-accent-content cursor-pointer"
                      : "text-neutral-content/50 cursor-not-allowed"
                  }`}
                  onClick={(e: React.MouseEvent) => {
                    const clipData = phStorage.get("clipboard");
                    if (clipData && clipData !== "{}") handlePaste(e);
                  }}
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content="Paste"
                  data-tooltip-place="top"
                  data-tooltip-offset={10}
                >
                  <TbClipboardCheck />
                </button>

                <button
                  ref={ref}
                  className={`text-neutral-content hover:text-accent-content ${footerActionClass}`}
                  onClick={async (e: React.MouseEvent) => {
                    const comp = await handleSaveTemplate("component");
                    setComponents([...components, comp]);
                  }}
                  data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                  data-tooltip-content={canMake ? "Convert to Component" : "Component Exists"}
                  data-tooltip-place="top"
                  data-tooltip-offset={10}
                >
                  {canMake ? <TbComponents /> : <TbComponentsOff />}
                </button>
              </>
            )}
          </>
        )}

        {id !== ROOT_NODE && aiEnabled && renderAiContext && (
          <>
            {renderAiContext({
              onClick: pinSelectionInAiChat,
              className: `text-neutral-content hover:text-accent-content ${footerActionClass}`,
              "data-tooltip-id": PAGEHUB_RTT_GLOBAL_ID,
              "data-tooltip-content": "Include in AI chat",
              "data-tooltip-place": "top",
              "data-tooltip-offset": 10,
            })}
          </>
        )}

        {id === ROOT_NODE && (
          <button
            className="btn m-2 w-full"
            onClick={() => {
              actions.selectNode(null);
              setSideBarOpen(false);
            }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};
