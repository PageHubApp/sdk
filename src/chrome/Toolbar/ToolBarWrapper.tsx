import { NodeTree, ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { checkIfAncestorLinked } from "../componentUtils";
import { useUnifiedDelete } from "../hooks/useUnifiedDelete";
import { Tooltip } from "components/layout/Tooltip";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  TbCaretUp,
  TbClipboard,
  TbClipboardCheck,
  TbComponents,
  TbComponentsOff,
  TbCopy,
  TbScaleOutline,
  TbScaleOutlineOff,
  TbTrash,
  TbTrashOff,
  TbX,
} from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { SettingsAtom } from "utils/atoms";
import { ComponentsAtom, IsolateAtom, SideBarOpen, isolatePage } from "utils/lib";
import { addHandler, buildClonedTree, saveHandler } from "../Viewport/lib";
import { RenderChildren } from "./Helpers/CloneHelper";
import Tab from "./Tab";
import { UnifiedTab, scrollToSection, toSectionId } from "./UnifiedTab";
import { useAccordionContext } from "./AccordionContext";
import { TabBarCollapseToggle } from "./TabBarCollapseToggle";
import { TabBarDarkModeToggle } from "./TabBarDarkModeToggle";
import { TabBarBreakpointPicker } from "./TabBarBreakpointPicker";
import { phStorage } from "../../utils/phStorage";


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

  const { parent, deletable, props, nodeData, parentName } = useNode(node => ({
    deletable: query.node(node.id).isDeletable(),
    parent: node.data.parent,
    props: node.data.props,
    nodeData: node.data,
    parentName: node.data.parent
      ? query.node(node.data.parent).get()?.data?.custom?.displayName ||
        query.node(node.data.parent).get()?.data?.displayName
      : null,
  }));

  const {
    actions: { setProp },
  } = useEditor();

  const { id } = useNode();
  const active = id;

  const tablistRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{ width: number; height: number; top: number; left: number } | null>(null);

  useLayoutEffect(() => {
    if (!unified || !tablistRef.current) return;
    const activeTab = tablistRef.current.querySelector('[aria-selected="true"]') as HTMLElement | null;
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

  const handleClone = async (e) => {
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

  const handleCopy = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Use the exact same approach as clone - save to localStorage
      await handleSaveTemplate();
    } catch (error) {
      console.error("Error copying node:", error);
    }
  };

  const handlePaste = async (e) => {
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
  const setSideBarOpen = useSetAtomState(SideBarOpen);
  const settings = useAtomValue(SettingsAtom);
  const accordionCtx = useAccordionContext();

  useEffect(() => {
    const iso = phStorage.get("isolated");
    if (iso) setIsolate(iso);
  }, [setIsolate]);

  // Handle keyboard shortcuts for copy/paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if we're not in an input field or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "c" && id !== ROOT_NODE) {
          e.preventDefault();
          handleCopy(e as any);
        } else if (e.key === "v") {
          const clipData = phStorage.get("clipboard");
          if (clipData && clipData !== "{}") {
            e.preventDefault();
            handlePaste(e as any);
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [id, handleCopy, handlePaste]);

  const ref = useRef();

  const canMake = !(components || []).find(_ => _.rootNodeId === id);

  // Check if this node or ANY ancestor is a fully linked component (not style mode)
  const isLinked = checkIfAncestorLinked(id, query);

  return (
    <div className="flex h-full flex-col">
      {/* Hide settings tabs for fully linked components */}
      {!isLinked && (
        <div
          id="toolbarTabs"
          aria-label="Tabs"
          role="tablist"
          className="flex shrink-0 items-center gap-1.5 border-b border-base-300 bg-secondary px-3 py-0.5 text-center font-semibold text-secondary-content"
        >
          <TabBarCollapseToggle unified={unified} accordionCtx={accordionCtx} />
          <div className="mx-0.5 h-4 w-px shrink-0 bg-border" />
          <TabBarBreakpointPicker />
          <TabBarDarkModeToggle />
          <div className="relative ml-auto flex flex-row-reverse items-center gap-3" role="tablist" ref={tablistRef}>
            {indicatorStyle && (
              <div
                className="absolute rounded-lg bg-primary"
                style={{
                  width: indicatorStyle.width,
                  height: indicatorStyle.height,
                  top: 0,
                  left: 0,
                  transform: `translate(${indicatorStyle.left}px, ${indicatorStyle.top}px)`,
                  transition: "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  zIndex: 0,
                  pointerEvents: "none",
                }}
              />
            )}
            {head.map((_, key) => {
              // If activeSection doesn't match any tab title (stale from previous node), default to tab 0
              const sectionMatchesAny = unified && head.some(h => h.title === activeSection);
              const isActive = unified
                ? (sectionMatchesAny ? activeSection === _.title : key === 0)
                : false;
              return unified ? (
                <UnifiedTab
                  key={key}
                  title={_.title}
                  icon={_.icon}
                  isActive={isActive}
                  onClick={() => {
                    scrollToSection(_.title);
                    if (accordionCtx?.openOnly) {
                      // Find all accordion section titles within this tab's DOM section
                      const sectionEl = document.getElementById(toSectionId(_.title));
                      if (sectionEl) {
                        const buttons = sectionEl.querySelectorAll("[role='button'][aria-label]");
                        const titles: string[] = [];
                        buttons.forEach((btn) => {
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

      <div id="toolbarItems" data-toolbar={true} className="flex min-h-0 flex-1 flex-col">
        <RenderChildren props={props} query={query} actions={actions} id={id}>
          {children}
        </RenderChildren>
      </div>

      <div
        id="toolbarFooter"
        className="flex w-full shrink-0 flex-row items-center justify-between border-t border-t-border bg-neutral px-2.5 py-1.5 text-lg"
      >
        {foot}

        {id !== ROOT_NODE && parentName !== "Background" && (
          <Tooltip content="Select Parent">
            <button

              className="cursor-pointer rounded-lg p-2 text-neutral-content hover:text-accent-content"

              onClick={() => {
                actions.selectNode(parent);
              }}
            >
              <TbCaretUp />
            </button>
          </Tooltip>
        )}

        {(props.type === "page" || isolate) && (
          <Tooltip
            className="hidden"
            content={!isolate ? "Isolate Page" : "Show All Pages"}
            onClick={() => isolatePage(isolate, query, active, actions, setIsolate)}
          >
            <button

              className={`cursor-pointer ${
                isolate ? "text-accent-content" : "text-neutral-content"
              } rounded-lg p-2 hover:text-accent-content`}

            >
              {isolate ? <TbScaleOutlineOff /> : <TbScaleOutline />}
            </button>
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
              <button

                className="cursor-pointer rounded-lg p-2 text-neutral-content hover:text-accent-content"

              >
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
                  <button
    
                    className="cursor-pointer rounded-lg p-2 text-neutral-content hover:text-accent-content"
    
                  >
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
                        ? "cursor-pointer text-neutral-content hover:text-accent-content"
                        : "cursor-not-allowed text-neutral-content/50"
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
                      phStorage.get("clipboard") &&
                      phStorage.get("clipboard") !== "{}"
                        ? "cursor-pointer text-neutral-content hover:text-accent-content"
                        : "cursor-not-allowed text-neutral-content/50"
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
                    className="cursor-pointer rounded-lg p-2 text-neutral-content hover:text-accent-content"
    
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
            <button

              className="cursor-pointer rounded-lg p-2 text-neutral-content hover:text-accent-content"

            >
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
