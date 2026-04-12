import { ROOT_NODE, useEditor } from "@craftjs/core";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { TbBoxModel2, TbLayoutGridAdd, TbX } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import {
  ComponentsAtom,
  IsolateAtom,
  OpenComponentEditorAtom,
  ViewModeAtom,
  isolatePageAlt,
} from "utils/lib";

interface ComponentEditorTab {
  id: string; // The component node ID
  name: string; // Component name
  isDirty?: boolean; // Has unsaved changes
}

interface ComponentEditorTabsProps {
  className?: string;
}

// Helper function to hide/show header, footer, and pages
const hideHeaderFooter = (query, actions, hide: boolean) => {
  const root = query.node(ROOT_NODE).get();

  root.data.nodes.forEach(nodeId => {
    const node = query.node(nodeId).get();
    const nodeType = node?.data?.props?.type;

    if (nodeType === "header" || nodeType === "footer" || nodeType === "page") {
      actions.setHidden(nodeId, hide);
      actions.setProp(nodeId, prop => (prop.hidden = hide));
    }
  });
};

export function ComponentEditorTabs({ className = "" }: ComponentEditorTabsProps) {
  const { query, actions } = useEditor();
  const [isolate, setIsolate] = useAtomState(IsolateAtom);
  const [tabs, setTabs] = useState<ComponentEditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [openComponentEditorRaw, setOpenComponentEditor] = useAtomState(OpenComponentEditorAtom);
  const openComponentEditor = openComponentEditorRaw as unknown as {
    componentId: string;
    componentName: string;
  } | null;
  const [components, setComponents] = useAtomState(ComponentsAtom);
  const processingRef = useRef<string | null>(null);
  const viewMode = useAtomValue(ViewModeAtom);

  // Open or switch to a component editor
  const handleOpenComponent = useCallback(
    async (componentId: string | null, componentName: string) => {
      // If componentId is null, create a new blank component
      if (componentId === null) {
        try {
          // Dynamically import Container and Element
          const { Container } = await import("../../components/Container");
          const { Element } = await import("@craftjs/core");
          const { Text } = await import("../../components/Text");

          // Create a new component container with a default Text element inside
          const componentWrapper = query
            .parseReactElement(
              <Element
                canvas
                is={Container}
                type="component"
                custom={{ displayName: componentName }}
                className="flex flex-col gap-4 bg-transparent p-6"
              >
                <Text text="Start editing your component..." />
              </Element>
            )
            .toNodeTree();

          // Add to ROOT
          actions.addNodeTree(componentWrapper, ROOT_NODE);
          const componentContainerId = componentWrapper.rootNodeId;

          // Get the first child (the Text node) which will be the actual component root
          const contentNodeId = componentWrapper.nodes[componentContainerId].data.nodes[0];

          // Wait a moment for the tree to be fully added, then serialize it
          await new Promise(resolve => setTimeout(resolve, 50));

          // Get the content node's tree and serialize it
          const contentTree = query.node(contentNodeId).toNodeTree();
          const serializedNodePairs = Object.keys(contentTree.nodes).map(nodeId => [
            nodeId,
            query.node(nodeId).toSerializedNode(),
          ]);
          const serializedEntries = Object.fromEntries(serializedNodePairs);
          const serializedJSON = JSON.stringify(serializedEntries);

          // Update components list
          const newComponent = {
            rootNodeId: contentNodeId, // The Text node inside the container
            nodes: serializedJSON,
            name: componentName,
          };
          setComponents([...components, newComponent]);

          // Check if tab already exists (shouldn't happen for new components, but just in case)
          const existingTab = tabs.find(t => t.id === componentContainerId);

          if (!existingTab) {
            // Add tab and open for editing
            const newTab: ComponentEditorTab = {
              id: componentContainerId,
              name: componentName,
              isDirty: false,
            };

            setTabs([...tabs, newTab]);
          }

          setActiveTabId(componentContainerId);

          // Isolate the component container and hide header/footer
          setTimeout(() => {
            isolatePageAlt(isolate, query, componentContainerId, actions, setIsolate, true);
            actions.setHidden(componentContainerId, false);
            actions.setProp(componentContainerId, prop => (prop.hidden = false));
            hideHeaderFooter(query, actions, true);
          }, 100);

          return;
        } catch (e) {
          console.error("Error creating new component:", e);
          return;
        }
      }

      // Check if tab already exists for this component
      const existingTab = tabs.find(tab => tab.id === componentId);

      if (existingTab) {
        // Tab exists, just switch to it
        setActiveTabId(existingTab.id);
        isolatePageAlt(isolate, query, existingTab.id, actions, setIsolate, true);
        actions.setHidden(existingTab.id, false);
        actions.setProp(existingTab.id, prop => (prop.hidden = false));
        hideHeaderFooter(query, actions, true);
      } else {
        // NEW APPROACH: Just isolate the component node directly!
        try {
          // The componentId is the content node - we need to find its parent (the component container)
          const contentNode = query.node(componentId).get();
          if (!contentNode) {
            console.error("❌ Content node not found:", componentId);
            return;
          }

          const componentContainerId = contentNode.data.parent;
          const componentContainer = query.node(componentContainerId).get();

          if (!componentContainer || componentContainer.data.props?.type !== "component") {
            console.error("❌ Component container not found or invalid");
            return;
          }

          // Check if tab already exists
          const existingTab = tabs.find(t => t.id === componentContainerId);

          if (existingTab) {
            // Tab exists, just switch to it
            setActiveTabId(componentContainerId);
          } else {
            // Add a new tab for this component - use the container ID
            const newTab: ComponentEditorTab = {
              id: componentContainerId, // Use the component container ID
              name: componentName,
              isDirty: false,
            };

            setTabs([...tabs, newTab]);
            setActiveTabId(componentContainerId);
          }

          // Isolate the component container and hide header/footer, but select the content node
          setTimeout(() => {
            isolatePageAlt(isolate, query, componentContainerId, actions, setIsolate, false); // Don't auto-select
            actions.setHidden(componentContainerId, false);
            actions.setProp(componentContainerId, prop => (prop.hidden = false));
            hideHeaderFooter(query, actions, true);

            // Select the content node (the actual component data), not the wrapper
            actions.selectNode(null);
          }, 100);
        } catch (e) {
          console.error("Error opening component in editor:", e);
        }
      }
    },
    [tabs, isolate, query, actions, setTabs, setActiveTabId, setIsolate, setComponents, components]
  );

  // Listen for component editor open requests
  useEffect(() => {
    if (openComponentEditor) {
      const { componentId, componentName } = openComponentEditor;
      const requestKey = `${componentId}-${componentName}-${Date.now()}`;

      // Check if we're already processing this or a similar request
      if (processingRef.current === requestKey) {
        return;
      }

      // Mark as processing
      processingRef.current = requestKey;

      // Clear the request immediately to prevent re-runs
      setOpenComponentEditor(null);

      // Then handle opening the component
      handleOpenComponent(componentId, componentName).finally(() => {
        // Clear processing flag after a delay
        setTimeout(() => {
          if (processingRef.current === requestKey) {
            processingRef.current = null;
          }
        }, 500);
      });
    }
  }, [openComponentEditor, setOpenComponentEditor, handleOpenComponent]);

  // Close tabs for deleted components
  useEffect(() => {
    if (tabs.length === 0) return; // Nothing to clean up

    // Get IDs of all components that still exist
    const existingComponentIds = new Set(
      components
        .map(c => {
          // The tab ID is the component container ID, which is the parent of the content node
          try {
            const contentNode = query.node(c.rootNodeId).get();
            return contentNode?.data?.parent;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    );

    // Find tabs for components that no longer exist
    const hasDeletedTabs = tabs.some(tab => !existingComponentIds.has(tab.id));

    if (hasDeletedTabs) {
      // If active tab is being deleted, find the best tab to switch to
      let newActiveTab = null;
      if (activeTabId && !existingComponentIds.has(activeTabId)) {
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        // Try to select the tab before the deleted one, or after if it was the first
        const remainingTabs = tabs.filter(tab => existingComponentIds.has(tab.id));
        if (remainingTabs.length > 0) {
          // Find the closest remaining tab
          let closestTab = remainingTabs[0]; // fallback
          for (let i = currentIndex - 1; i >= 0; i--) {
            if (existingComponentIds.has(tabs[i].id)) {
              closestTab = tabs[i];
              break;
            }
          }
          // If no tab before, try to find one after
          if (closestTab === remainingTabs[0] && currentIndex < tabs.length - 1) {
            for (let i = currentIndex + 1; i < tabs.length; i++) {
              if (existingComponentIds.has(tabs[i].id)) {
                closestTab = tabs[i];
                break;
              }
            }
          }
          newActiveTab = closestTab.id;
        }
      }

      // Remove deleted component tabs
      const remainingTabs = tabs.filter(tab => existingComponentIds.has(tab.id));
      setTabs(remainingTabs);

      // Switch to the selected tab or clear
      if (activeTabId && !existingComponentIds.has(activeTabId)) {
        if (newActiveTab) {
          setActiveTabId(newActiveTab);
          isolatePageAlt(isolate, query, newActiveTab, actions, setIsolate, true);
          hideHeaderFooter(query, actions, true);
        } else {
          setActiveTabId(null);
          isolatePageAlt(isolate, query, null, actions, setIsolate, false);
          hideHeaderFooter(query, actions, false);
        }
      }
    }
  }, [components, query]);

  // Restore active tab when switching back to component mode
  useEffect(() => {
    if (viewMode === "component" && activeTabId && tabs.length > 0) {
      // Re-isolate the active component
      isolatePageAlt(isolate, query, activeTabId, actions, setIsolate, true);

      // Make sure the component container is visible
      actions.setHidden(activeTabId, false);
      actions.setProp(activeTabId, prop => (prop.hidden = false));

      // Hide pages, headers, and footers
      hideHeaderFooter(query, actions, true);
    }
  }, [viewMode, activeTabId, tabs.length, isolate, query, actions, setIsolate]);

  // Switch to a different tab
  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);

    // Isolate the component for this tab
    isolatePageAlt(isolate, query, tabId, actions, setIsolate, true);

    // Make sure this component container is visible
    actions.setHidden(tabId, false);
    actions.setProp(tabId, prop => (prop.hidden = false));

    // Hide pages, headers, and footers
    hideHeaderFooter(query, actions, true);
  };

  // Close a tab
  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    // If closing the active tab, switch to another one
    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        // Switch to the previous tab, or the first one
        const newActiveTab = newTabs[Math.max(0, tabIndex - 1)];
        setActiveTabId(newActiveTab.id);
        isolatePageAlt(isolate, query, newActiveTab.id, actions, setIsolate, true);
        actions.setHidden(newActiveTab.id, false);
        actions.setProp(newActiveTab.id, prop => (prop.hidden = false));
        hideHeaderFooter(query, actions, true);
      } else {
        // No more tabs, clear selection and keep everything hidden
        setActiveTabId(null);

        actions.setHidden(tabId, true);
        actions.setProp(tabId, prop => (prop.hidden = true));

        isolatePageAlt(isolate, query, null, actions, setIsolate, true);
        hideHeaderFooter(query, actions, true);

        setTimeout(() => {
          actions.selectNode(null);
        }, 100);
      }
    }

    // Note: We DON'T delete the component node - it stays in ROOT as a master
  };

  return (
    <div
      className={`border-base-300 bg-secondary relative flex h-10 items-center gap-2 border-b px-3 pt-2 ${className}`}
    >
      {/* Tabs */}
      <div
        className="scrollbar-hide flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        role="tablist"
      >
        {tabs.map(tab => {
          // Find the component to check if it's a section
          const component = components.find(c => {
            try {
              const contentNode = query.node(c.rootNodeId).get();
              return contentNode?.data?.parent === tab.id;
            } catch {
              return false;
            }
          });

          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={activeTabId === tab.id}
              tabIndex={0}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleTabClick(tab.id);
                }
              }}
              className={`group flex min-w-32 cursor-pointer items-center gap-2 rounded-t px-3 py-1.5 transition-colors ${
                activeTabId === tab.id
                  ? "bg-neutral text-neutral-content hover:bg-base-200 hover:text-base-content font-bold"
                  : "bg-base-100 text-secondary-content hover:bg-base-200 hover:text-base-content"
              } `}
            >
              {component?.isSection ? (
                <TbLayoutGridAdd className="size-3.5 shrink-0" />
              ) : (
                <TbBoxModel2 className="size-3.5 shrink-0" />
              )}
              <span className="min-w-0 truncate text-sm" title={tab.name}>
                {tab.name}
              </span>
              <button
                onClick={e => handleCloseTab(tab.id, e)}
                className={`hover:bg-neutral hover:text-neutral-content rounded-lg p-0.5 transition-opacity ${activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                <TbX className="size-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
