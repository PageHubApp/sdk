import { useEditor } from "@craftjs/core";
import { Tooltip } from "components/layout/Tooltip";
import { useState } from "react";
import { TbChevronRight, TbListTree } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { IsolateAtom } from "utils/lib";
import { ToolbarPortalDropdown } from "../Tools/ToolbarPortalDropdown";
import { TabAtom } from "./atoms";

interface BreadcrumbItem {
  id: string;
  name: string;
  type: string;
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
  const getPageContext = () => {
    if (!isolate) {
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
        };
      }
    } catch (e) {
      console.warn("Could not get page context:", e);
    }

    return { name: "All", id: "all" };
  };

  const pageContext = getPageContext();
  const breadcrumb = selectedId ? buildBreadcrumb(selectedId) : [];

  if (!selectedId) return null;

  const currentItem = breadcrumb[breadcrumb.length - 1];
  const showOnlyPageContext = isolate && breadcrumb.length === 0;

  // Check if the breadcrumb is within a Header or Footer (root-level components with no page parent)
  const isHeaderOrFooter =
    breadcrumb.length > 0 && (breadcrumb[0].type === "Header" || breadcrumb[0].type === "Footer");

  // Don't show page context for Header/Footer components (they're not children of pages)
  const showPageContext = !isHeaderOrFooter;

  const handleNodeClick = (nodeId: string) => {
    actions.selectNode(nodeId);
  };

  const handlePageClick = () => {
    if (!isolate) {
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

  return (
    <div className="flex w-full items-center justify-between bg-base-100 px-2 py-1 text-sm text-base-content">
      <div className="flex min-w-0 max-w-[calc(100%-120px)] flex-1 items-center gap-0">
        {/* Ancestry dropdown — full stack on hover */}
        {!isEditing && !showOnlyPageContext && breadcrumb.length > 1 && (
          <ToolbarPortalDropdown
            openOn="hover"
            align="left"
            className="min-w-[10rem] rounded-lg border border-base-300 bg-base-100 p-1 py-1.5 shadow-xl"
            trigger={
              <button
                type="button"
                aria-label="View ancestry"
                className="mr-0.5 rounded p-1 text-neutral-content transition-colors hover:bg-neutral hover:text-base-content"
              >
                <TbListTree className="size-3.5" />
              </button>
            }
          >
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-content">
              Ancestry
            </div>
            <div className="ph-select-item-host">
              {showPageContext && (
                <button
                  type="button"
                  onClick={handlePageClick}
                  className="ph-select-item items-center gap-2 text-xs"
                >
                  <span className="text-neutral-content/40">⌂</span>
                  <span className="font-medium">{pageContext.name}</span>
                </button>
              )}
              {breadcrumb.slice(0, -1).map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNodeClick(item.id)}
                  className="ph-select-item items-center gap-2 text-xs"
                  style={{ paddingLeft: `${(index + (showPageContext ? 1 : 0)) * 8 + 8}px` }}
                >
                  <span className="text-[10px] text-neutral-content/40">›</span>
                  <span className="truncate font-medium">{item.name}</span>
                  <span className="ml-auto text-[10px] text-neutral-content">{item.type}</span>
                </button>
              ))}
            </div>
          </ToolbarPortalDropdown>
        )}

        {/* Page context */}
        {!isEditing && showPageContext && (
          <div className="flex items-center gap-0">
            <Tooltip
              content={
                pageContext.fullName ? `Select page: ${pageContext.fullName}` : "Viewing all pages"
              }
              placement="bottom"
            >
              <button
                onClick={handlePageClick}
                className={`whitespace-nowrap rounded bg-neutral p-1 text-xs font-medium text-base-content transition-colors hover:bg-neutral/80 ${
                  showOnlyPageContext ? "min-w-0" : "min-w-0 max-w-[100px] truncate"
                }`}
              >
                {showOnlyPageContext ? pageContext.fullName || pageContext.name : pageContext.name}
              </button>
            </Tooltip>

            {!showOnlyPageContext && currentItem && (
              <TbChevronRight className="ml-1 size-3 text-neutral-content/60" />
            )}
          </div>
        )}

        {/* Short breadcrumb: Parent > Current */}
        {!isEditing && !showOnlyPageContext && parentItem && (
          <div className="flex items-center gap-0">
            <Tooltip content={`Select ${parentItem.name} (${parentItem.type})`} placement="bottom">
              <button
                onClick={() => handleNodeClick(parentItem.id)}
                className="min-w-0 max-w-[80px] truncate whitespace-nowrap rounded p-1 text-xs text-neutral-content transition-colors hover:bg-neutral hover:text-base-content"
              >
                {parentItem.name}
              </button>
            </Tooltip>
            <TbChevronRight className="size-3 text-neutral-content/60" />
          </div>
        )}

        {/* Current node — editable */}
        {currentItem && !showOnlyPageContext && (
          <>
            {isEditing ? (
              <div className="w-full min-w-0 rounded bg-primary/10 p-1 text-xs font-medium text-primary transition-all duration-300 ease-in-out">
                <input
                  type="text"
                  defaultValue={currentItem.name}
                  placeholder={currentItem.name}
                  className="w-full min-w-0 bg-transparent font-medium text-primary focus:outline-none"
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
              <Tooltip content={`Click to edit "${currentItem.name}"`} placement="bottom">
                <button
                  onClick={() => setIsEditing(true)}
                  className="min-w-0 max-w-[120px] truncate whitespace-nowrap rounded bg-primary/15 p-1 text-xs font-semibold text-primary transition-all duration-200 ease-in-out hover:scale-105 hover:bg-primary/25"
                >
                  {currentItem.name}
                </button>
              </Tooltip>
            )}
          </>
        )}
      </div>

      {activeTab && (
        <div className="hidden text-[10px] font-medium text-secondary-content">{activeTab}</div>
      )}
    </div>
  );
};
