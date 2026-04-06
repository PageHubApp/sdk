import { ROOT_NODE, useEditor } from "@craftjs/core";

/**
 * Hook to determine where to insert a new node (section, component, etc.)
 * Returns the target page ID where the node should be inserted
 *
 * Logic - tries VERY hard to find a page (never goes to ROOT unless no pages exist):
 * 1. If a page is selected, use it
 * 2. If a node inside a page is selected, find parent page
 * 3. Find the first visible page in viewport
 * 4. Find ANY page with a DOM element
 * 5. Find ANY page node (even if not rendered yet)
 * 6. Only fall back to ROOT_NODE if no pages exist at all
 */
export const useInsertTarget = () => {
  const { query } = useEditor();

  const getTargetPageId = (): string => {
    // Get currently selected node
    const selectedNodeId = query.getEvent("selected").first();

    // Strategy 1: If something specific is selected, try to use it or find its parent page
    if (selectedNodeId && selectedNodeId !== ROOT_NODE) {
      try {
        const selectedNodeData = query.node(selectedNodeId).get();

        if (selectedNodeData) {
          // If selected node is a page, use it directly
          if (selectedNodeData.data.props?.type === "page") {
            return selectedNodeId;
          }

          // If selected node is inside a page, find the parent page
          let currentNode = selectedNodeData;
          let depth = 0;
          const maxDepth = 20; // Increased from 10 to handle deeper nesting

          while (currentNode && currentNode.data.parent && depth < maxDepth) {
            const parentNode = query.node(currentNode.data.parent).get();

            if (parentNode?.data.props?.type === "page") {
              return parentNode.id;
            }

            currentNode = parentNode;
            depth++;
          }
        }
      } catch (error) {
        console.warn("Error getting selected node data:", error);
        // Continue to fallback logic
      }
    }

    // Strategy 2: Find the first VISIBLE page (in viewport)
    try {
      const rootNode = query.node(ROOT_NODE).get();
      if (rootNode && rootNode.data.nodes) {
        for (const nodeId of rootNode.data.nodes) {
          try {
            const node = query.node(nodeId).get();
            if (node && node.data.props?.type === "page") {
              // Check if the page is visible (has DOM element and is in viewport)
              if (node.dom && node.dom.offsetParent !== null) {
                return nodeId;
              }
            }
          } catch (e) {
            // Skip invalid nodes
            continue;
          }
        }
      }
    } catch (error) {
      console.warn("Error searching for visible page:", error);
    }

    // Strategy 3: Find ANY page with a DOM element (even if not in viewport)
    try {
      const rootNode = query.node(ROOT_NODE).get();
      if (rootNode && rootNode.data.nodes) {
        for (const nodeId of rootNode.data.nodes) {
          try {
            const node = query.node(nodeId).get();
            if (node && node.data.props?.type === "page" && node.dom) {
              return nodeId;
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error) {
      console.warn("Error searching for page with DOM:", error);
    }

    // Strategy 4: Find ANY page node (even if not rendered)
    try {
      const rootNode = query.node(ROOT_NODE).get();
      if (rootNode && rootNode.data.nodes) {
        for (const nodeId of rootNode.data.nodes) {
          try {
            const node = query.node(nodeId).get();
            if (node && node.data.props?.type === "page") {
              console.log("Found page without DOM, using it anyway:", nodeId);
              return nodeId;
            }
          } catch (e) {
            continue;
          }
        }
      }
    } catch (error) {
      console.warn("Error searching for any page:", error);
    }

    // Strategy 5: If we have ANY child nodes at all, check if the first one is a page
    try {
      const rootNode = query.node(ROOT_NODE).get();
      if (rootNode && rootNode.data.nodes && rootNode.data.nodes.length > 0) {
        const firstNodeId = rootNode.data.nodes[0];
        const firstNode = query.node(firstNodeId).get();
        if (firstNode) {
          // If first node is a page, use it
          if (firstNode.data.props?.type === "page") {
            return firstNodeId;
          }
        }
      }
    } catch (error) {
      console.warn("Error checking first node:", error);
    }

    // Last resort: Return ROOT_NODE (only if no pages exist)
    console.warn("No pages found anywhere! Falling back to ROOT_NODE. This should rarely happen.");
    return ROOT_NODE;
  };

  return { getTargetPageId };
};
