// @ts-nocheck
import { useEditor } from "@craftjs/core";
import { Tooltip } from "components/layout/Tooltip";
import { useState } from "react";
import { TbChevronRight } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { IsolateAtom } from "utils/lib";
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

  // Debug: log the breadcrumb to see what's in it

  // Don't show breadcrumb if no node is selected
  if (!selectedId) return null;

  // Dynamic breadcrumb display: ellipsis + last 2 items (skip first item)
  const getDisplayBreadcrumb = () => {
    if (breadcrumb.length <= 2) {
      return breadcrumb; // Show all if 2 or fewer items
    }

    // For 3+ items: ellipsis + last 2 items (skip "Section" and other first items)
    return [
      { id: "ellipsis", name: "...", type: "ellipsis" },
      ...breadcrumb.slice(-2), // Always show parent + current (last 2 items)
    ];
  };

  const displayBreadcrumb = getDisplayBreadcrumb();

  // Debug: log the display breadcrumb

  // Separate the last item (current node) from the rest
  const previousItems = displayBreadcrumb.slice(0, -1);
  const currentItem = displayBreadcrumb[displayBreadcrumb.length - 1];

  // If we're viewing a specific page but no component is selected, show just the page context
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

  return (
    <div className="flex w-full items-center justify-between bg-background px-2 py-1 text-sm text-foreground">
      {/* Breadcrumb navigation - limited width to reserve space for tab */}
      <div className="flex min-w-0 max-w-[calc(100%-120px)] flex-1 items-center gap-0">
        {/* Page context first */}
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
                className={`whitespace-nowrap rounded bg-muted p-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/80 ${
                  showOnlyPageContext
                    ? "min-w-0" // No truncation when showing only page context
                    : "min-w-0 max-w-[100px] truncate" // Truncate when showing with breadcrumb
                }`}
              >
                {showOnlyPageContext ? pageContext.fullName || pageContext.name : pageContext.name}
              </button>
            </Tooltip>

            {/* Separator after page context - show if we have breadcrumb items */}
            {!showOnlyPageContext && (previousItems.length > 0 || currentItem) && (
              <TbChevronRight className="ml-1 size-3 text-muted-foreground/60" />
            )}
          </div>
        )}

        {/* Previous breadcrumb items - only show if not showing only page context */}
        {!isEditing && !showOnlyPageContext && (
          <div className="flex items-center gap-0">
            {previousItems.map((item, index) => (
              <div key={item.id} className="flex items-center gap-0">
                {index > 0 && <TbChevronRight className="size-3 text-muted-foreground/60" />}

                {item.type === "ellipsis" ? (
                  <Tooltip
                    content={`Go to ${breadcrumb[breadcrumb.length - 3]?.name || "parent"}`}
                    placement="bottom"
                  >
                    <button
                      onClick={() => handleNodeClick(breadcrumb[breadcrumb.length - 3]?.id)}
                      className="min-w-0 whitespace-nowrap rounded p-1 text-xs text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
                    >
                      {item.name}
                    </button>
                  </Tooltip>
                ) : (
                  <Tooltip content={`Select ${item.name} (${item.type})`} placement="bottom">
                    <button
                      onClick={() => handleNodeClick(item.id)}
                      className="min-w-0 max-w-[80px] truncate whitespace-nowrap rounded p-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {item.name}
                    </button>
                  </Tooltip>
                )}
              </div>
            ))}

            {/* Separator chevron before current item - only if we have previous items */}
            {!showOnlyPageContext && previousItems.length > 0 && (
              <TbChevronRight className="size-3 text-muted-foreground/60" />
            )}
          </div>
        )}

        {/* Current node - editable with CSS transform animation - only show if not showing only page context */}
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

      {/* Active tab indicator - reserved space */}
      {activeTab && (
        <div className="hidden text-[10px] font-medium text-secondary-foreground">{activeTab}</div>
      )}
    </div>
  );
};
