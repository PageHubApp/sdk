import { NodeTree, ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { checkIfAncestorLinked } from "@/utils/componentUtils";
import { useUnifiedDelete } from "../hooks/useUnifiedDelete";
import { Tooltip } from "@/chrome/primitives/layout/Tooltip";
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
import { useAtomState, useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { AiChatAttachedNodesAtom, AssistantOpenAtom, SettingsAtom } from "../../utils/atoms";
import { ComponentsAtom, EDITOR_ALL_PAGES_STORAGE, IsolateAtom, SideBarOpen } from "../../utils/lib";
import { useAiEnabled } from "../../utils/hooks/useAiEnabled";
import { useSDK } from "../../core/context";
import { addHandler, buildClonedTree, saveHandler } from "../viewport/viewportExports";
import { toolbarInputNoAutocompleteProps } from "./toolbarInputAttrs";
import { RenderChildren } from "./helpers/CloneHelper";
import Tab from "./Tab";
import { UnifiedTab, scrollToSection, setActiveTabFromClick, toSectionId } from "./UnifiedTab";
import { useAccordionContext } from "./AccordionContext";
import { TabAtom } from "../viewport/atoms";
import { TabBarCollapseToggle } from "./TabBarCollapseToggle";
import { TabBarDarkModeToggle } from "./TabBarDarkModeToggle";
import { TabBarBreakpointPicker } from "./TabBarBreakpointPicker";
import { phStorage } from "../../utils/phStorage";
import { SettingsSearchAtom, SettingsSearchOpenAtom } from "./unified-settings/registry/atoms";

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
    if (iso === EDITOR_ALL_PAGES_STORAGE) {
      setIsolate("");
      return;
    }
    if (iso && iso !== "null") setIsolate(iso);
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
            <Tooltip content="Search settings">
              <button
                type="button"
                onClick={toggleSearch}
                className={`cursor-pointer rounded-lg p-1.5 transition-colors ${searchOpen ? "text-primary" : "text-secondary-content hover:text-base-content"}`}
                aria-label="Search settings"
              >
                <TbSearch size={14} />
              </button>
            </Tooltip>
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
                className="border-base-300 bg-base-200 text-base-content placeholder:text-neutral-content focus:ring-primary h-7 w-full rounded-md border px-2.5 text-xs focus:ring-1 focus:outline-none"
                autoFocus
                {...toolbarInputNoAutocompleteProps}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-neutral-content hover:text-base-content absolute right-1.5 cursor-pointer"
                >
                  <TbX size={12} />
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
        className="border-t-border bg-neutral flex w-full shrink-0 flex-row items-center justify-between border-t px-2.5 py-1.5 text-lg"
      >
        {foot}

        {id !== ROOT_NODE && parentName !== "Background" && (
          <Tooltip content="Select Parent">
            <button
              className="text-neutral-content hover:text-accent-content cursor-pointer rounded-lg p-2"
              onClick={() => {
                actions.selectNode(parent);
              }}
            >
              <TbCaretUp />
            </button>
          </Tooltip>
        )}

        {id !== ROOT_NODE && aiEnabled && renderAiContext && (
          <Tooltip content="Include in AI chat">
            {renderAiContext({
              onClick: pinSelectionInAiChat,
              className:
                "cursor-pointer rounded-lg p-2 text-neutral-content transition-colors hover:bg-black/7 hover:text-accent-content dark:hover:bg-white/12",
            })}
          </Tooltip>
        )}

        {deletable && (
          <>
            <Tooltip
              content={props.canDelete !== false ? "Delete" : "Unable to delete"}
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();

                if (props.canDelete !== false) deleteSelectedNode();
              }}
            >
              <button className="text-neutral-content hover:text-accent-content cursor-pointer rounded-lg p-2">
                {props.canDelete !== false ? <TbTrash /> : <TbTrashOff />}
              </button>
            </Tooltip>

            {/* Hide Clone and Create Component buttons for linked components */}
            {!isLinked && (
              <>
                <Tooltip
                  content="Duplicate"
                  onClick={(e: React.MouseEvent) => {
                    handleClone(e);
                  }}
                >
                  <button className="text-neutral-content hover:text-accent-content cursor-pointer rounded-lg p-2">
                    <TbCopy />
                  </button>
                </Tooltip>

                <Tooltip
                  content={id !== ROOT_NODE ? "Copy" : "Copy (select a component)"}
                  onClick={(e: React.MouseEvent) => {
                    if (id !== ROOT_NODE) {
                      handleCopy(e);
                    }
                  }}
                >
                  <button
                    className={`rounded-lg p-2 transition-colors active:scale-90 ${
                      id !== ROOT_NODE
                        ? "text-neutral-content hover:text-accent-content cursor-pointer"
                        : "text-neutral-content/50 cursor-not-allowed"
                    }`}
                  >
                    <TbClipboard />
                  </button>
                </Tooltip>

                <Tooltip
                  content="Paste"
                  onClick={(e: React.MouseEvent) => {
                    const clipData = phStorage.get("clipboard");
                    if (clipData && clipData !== "{}") {
                      handlePaste(e);
                    }
                  }}
                >
                  <button
                    className={`rounded-lg p-2 transition-colors active:scale-90 ${
                      phStorage.get("clipboard") && phStorage.get("clipboard") !== "{}"
                        ? "text-neutral-content hover:text-accent-content cursor-pointer"
                        : "text-neutral-content/50 cursor-not-allowed"
                    }`}
                  >
                    <TbClipboardCheck />
                  </button>
                </Tooltip>

                <Tooltip
                  content={`${canMake ? "Convert to Component" : "Component Exists"}`}
                  onClick={async (e: React.MouseEvent) => {
                    const comp = await handleSaveTemplate("component");

                    setComponents([...components, comp]);
                  }}
                >
                  <button
                    ref={ref}
                    className="text-neutral-content hover:text-accent-content cursor-pointer rounded-lg p-2"
                  >
                    {canMake ? <TbComponents /> : <TbComponentsOff />}
                  </button>
                </Tooltip>
              </>
            )}
          </>
        )}

        {id !== ROOT_NODE && (
          <Tooltip
            content="Close"
            onClick={() => {
              actions.selectNode(null);
              setSideBarOpen(false);
            }}
          >
            <button className="text-neutral-content hover:text-accent-content cursor-pointer rounded-lg p-2">
              <TbX />
            </button>
          </Tooltip>
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
