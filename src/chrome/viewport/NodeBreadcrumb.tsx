import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { useEditor } from "@craftjs/core";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useState } from "react";
import { TbChevronRight, TbDots, TbFileText, TbHome } from "react-icons/tb";
import { IsolateAtom } from "../../utils/atoms";
import { hasPageIsolation } from "../../utils/page/pageManagement";
import { ToolbarPortalDropdown } from "../inline-tools/ToolbarPortalDropdown";
import { PageSelector } from "./PageSelector";
import { TabAtom } from "./atoms";
import { useOpenNodeContextMenu } from "./hooks/useOpenNodeContextMenu";

interface BreadcrumbItem {
  id: string;
  name: string;
  type: string;
  /** Structural role from props.type (e.g. "header", "footer", "section") */
  role?: string;
}

export const NodeBreadcrumb = () => {
  const { query, actions } = useEditor((state, query) => ({
    selectedId: query.getEvent("selected").first(),
  }));

  const activeTab = useAtomValue(TabAtom);
  const [isolate, setIsolate] = useAtomState(IsolateAtom);
  const selectedId = query.getEvent("selected").first();
  const [isEditing, setIsEditing] = useState(false);

  // Helper function to remove parent prefixes from breadcrumb names
  const removeParentPrefixes = (breadcrumb: BreadcrumbItem[]): BreadcrumbItem[] => {
    return breadcrumb.map((item, index) => {
      let cleanName = item.name;

      // Check all parents (items before this one)
      for (let i = 0; i < index; i++) {
        const parentName = breadcrumb[i].name;

        // If current name starts with parent name (case-insensitive), remove it
        if (cleanName.toLowerCase().startsWith(parentName.toLowerCase())) {
          // Remove the parent name prefix
          cleanName = cleanName.substring(parentName.length).trim();

          // Also remove common separators at the start (-, |, :, >, etc.)
          cleanName = cleanName.replace(/^[-–—:|>]+\s*/, "").trim();
        }
      }

      return {
        ...item,
        name: cleanName || item.name, // Fallback to original if empty
      };
    });
  };

  // Build breadcrumb trail from selected node to root (excluding page level)
  const buildBreadcrumb = (nodeId: string): BreadcrumbItem[] => {
    const breadcrumb: BreadcrumbItem[] = [];
    let currentNodeId = nodeId;

    while (currentNodeId && currentNodeId !== "ROOT") {
      try {
        const node = query.node(currentNodeId).get();
        if (!node) break;

        // Skip page-level nodes since we show page context separately
        if (node.data.props?.type === "page") {
          currentNodeId = node.data.parent;
          continue;
        }

        const name =
          node.data.custom?.displayName || node.data.displayName || node.data.name || "Unnamed";

        const type = node.data.name || "Unknown";

        breadcrumb.unshift({
          id: currentNodeId,
          name,
          type,
          role: node.data.props?.type || undefined,
        });

        currentNodeId = node.data.parent;
      } catch (e) {
        break;
      }
    }

    // Remove redundant parent prefixes from child names
    return removeParentPrefixes(breadcrumb);
  };

  // Get page context
  const getPageContext = (): {
    name: string;
    id: string;
    fullName?: string;
    isHomePage?: boolean;
  } => {
    if (!hasPageIsolation(isolate)) {
      return { name: "All", id: "all" };
    }

    try {
      const pageNode = query.node(isolate).get();
      if (pageNode?.data?.props?.type === "page") {
        const pageName =
          pageNode.data.custom?.displayName || pageNode.data.displayName || "Untitled Page";
        return {
          name: pageName,
          id: isolate,
          fullName: pageName,
          isHomePage: !!pageNode.data.props?.isHomePage,
        };
      }
    } catch (e) {
      console.warn("Could not get page context:", e);
    }

    return { name: "All", id: "all" };
  };

  const pageContext = getPageContext();
  const pageContextIsConcretePage = pageContext.id !== "all";
  const breadcrumb = selectedId ? buildBreadcrumb(selectedId) : [];

  const currentItem = breadcrumb[breadcrumb.length - 1];
  const showOnlyPageContext = hasPageIsolation(isolate) && breadcrumb.length === 0;

  // Check if the breadcrumb is within a Header or Footer (root-level, not page children)
  const isHeaderOrFooter =
    breadcrumb.length > 0 && (breadcrumb[0].role === "header" || breadcrumb[0].role === "footer");

  // Don't show page context for Header/Footer components (they're not children of pages)
  const showPageContext = !isHeaderOrFooter;

  const openNodeContextMenu = useOpenNodeContextMenu();

  const handleNodeClick = (nodeId: string) => {
    actions.selectNode(nodeId);
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    openNodeContextMenu(nodeId, e.clientX, e.clientY);
  };

  const handlePageClick = () => {
    if (!hasPageIsolation(isolate)) {
      // No specific page selected, can't select page node
      return;
    }

    try {
      // Select the page node itself
      actions.selectNode(isolate);
    } catch (e) {
      console.warn("Could not select page node:", e);
    }
  };

  // Short breadcrumb: just the immediate parent (if any)
  const parentItem = breadcrumb.length >= 2 ? breadcrumb[breadcrumb.length - 2] : null;
  const breadcrumbButtonClass = "transition-[color,background-color,transform] active:scale-95";
  const breadcrumbIconButtonClass =
    "text-neutral-content hover:bg-neutral hover:text-base-content rounded p-1 " +
    breadcrumbButtonClass;

  /** Same outline width/style on every crumb control so selection never changes box metrics (no layout shift). */
  const crumbOutlineIdle = "outline-1 -outline-offset-1 outline-dashed outline-transparent";
  const crumbTextSegment =
    "box-border inline-flex max-w-full min-w-0 items-center truncate whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium leading-snug transition-[color,outline-color,transform]";

  return (
    <div
      className={`bg-base-100 text-base-content border-base-300 flex w-full items-center justify-between border-b px-3 text-sm ${
        isEditing ? "min-h-10 py-1.5" : "h-10 shrink-0 py-0"
      }`}
    >
      <div className="flex min-h-0 min-w-0 flex-1 items-center gap-1">
        {/* Page selector — always visible, acts as the page context + navigation */}
        {!isEditing && <PageSelector inlineTrigger />}

        {/* Ancestry dropdown — sits between home and breadcrumbs, replacing the first chevron */}
        {!isEditing && !showOnlyPageContext && breadcrumb.length > 1 && (
          <ToolbarPortalDropdown
            openOn="hover"
            align="left"
            className="border-base-300 bg-base-100 min-w-[16rem] rounded-xl border p-1 py-1.5 shadow-xl"
            trigger={
              <button
                type="button"
                aria-label="View ancestry"
                className={`${breadcrumbIconButtonClass} ml-1`}
              >
                <TbDots className="size-3.5" />
              </button>
            }
          >
            <div className="text-neutral-content px-2 pb-1 text-[10px] font-semibold tracking-wide uppercase">
              Ancestry
            </div>
            <div className="ph-select-item-host">
              {showPageContext && (
                <button
                  type="button"
                  onClick={handlePageClick}
                  className="ph-select-item items-center gap-2 text-xs"
                >
                  {pageContextIsConcretePage ? (
                    pageContext.isHomePage ? (
                      <TbHome className="text-neutral-content/70 size-3.5 shrink-0" aria-hidden />
                    ) : (
                      <TbFileText
                        className="text-neutral-content/60 size-3.5 shrink-0"
                        aria-hidden
                      />
                    )
                  ) : (
                    <span className="text-neutral-content/40" aria-hidden>
                      ⌂
                    </span>
                  )}
                  <span className="font-medium">{pageContext.name}</span>
                </button>
              )}
              {breadcrumb.slice(0, -1).map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNodeClick(item.id)}
                  onContextMenu={e => handleNodeContextMenu(e, item.id)}
                  className="ph-select-item items-center gap-2 text-xs"
                  style={{ paddingLeft: `${(index + (showPageContext ? 1 : 0)) * 8 + 8}px` }}
                >
                  <span className="text-neutral-content/40 text-[10px]">›</span>
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="text-neutral-content ml-auto text-[10px]">{item.type}</span>
                </button>
              ))}
            </div>
          </ToolbarPortalDropdown>
        )}

        {/* Chevron separating page/ancestry from the breadcrumb chain */}
        {!isEditing && !showOnlyPageContext && currentItem && (
          <TbChevronRight
            className="text-neutral-content/45 pointer-events-none size-3.5 shrink-0"
            aria-hidden
          />
        )}

        {/* Placeholder when no node is selected — orients the user without competing with real crumbs */}
        {!isEditing && !currentItem && (
          <span className="text-neutral-content/60 ml-2 truncate text-xs italic">
            Viewing {pageContext.fullName || pageContext.name || "page"}
          </span>
        )}

        {/* Short breadcrumb: Parent > Current */}
        {!isEditing && !showOnlyPageContext && parentItem && (
          <div className="flex min-w-0 items-center gap-1">
            <button
              type="button"
              onClick={() => handleNodeClick(parentItem.id)}
              onContextMenu={e => handleNodeContextMenu(e, parentItem.id)}
              className={`text-neutral-content hover:text-base-content max-w-[80px] min-w-0 ${crumbTextSegment} ${crumbOutlineIdle} hover:bg-base-200/80 active:scale-95`}
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content={`Select ${parentItem.name} (${parentItem.type})`}
              data-tooltip-place="bottom"
              data-tooltip-offset={10}
            >
              {parentItem.name}
            </button>
            <TbChevronRight
              className="text-neutral-content/45 pointer-events-none size-3.5 shrink-0"
              aria-hidden
            />
          </div>
        )}

        {/* Current node — editable */}
        {currentItem && !showOnlyPageContext && (
          <>
            {isEditing ? (
              <div className="bg-primary/10 text-primary w-full min-w-0 rounded p-1 text-xs font-medium">
                <input
                  type="text"
                  defaultValue={currentItem.name}
                  placeholder={currentItem.name}
                  className="text-primary w-full min-w-0 bg-transparent font-medium focus:outline-none"
                  onBlur={() => setIsEditing(false)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === "Escape") {
                      setIsEditing(false);
                    }
                  }}
                  onChange={e => {
                    actions.setCustom(
                      currentItem.id,
                      custom => (custom.displayName = e.target.value)
                    );
                  }}
                  autoFocus
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                onContextMenu={e => handleNodeContextMenu(e, currentItem.id)}
                className={`text-base-content hover:outline-base-content/40 inline-flex w-fit max-w-full min-w-0 shrink ${crumbTextSegment} outline-base-content/25 bg-transparent outline-1 -outline-offset-1 outline-dashed active:scale-95`}
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content={`Click to edit "${currentItem.name}"`}
                data-tooltip-place="bottom"
                data-tooltip-offset={10}
              >
                {currentItem.name}
              </button>
            )}
          </>
        )}
      </div>

      {activeTab && (
        <div className="text-secondary-content hidden text-[10px] font-medium">{activeTab}</div>
      )}
    </div>
  );
};
