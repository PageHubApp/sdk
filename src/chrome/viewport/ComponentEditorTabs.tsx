import { Element, ROOT_NODE, useEditor } from "@craftjs/core";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { TbBoxModel2, TbLayoutGridAdd, TbX } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import {
  ComponentsAtom,
  OpenComponentEditorAtom,
  ViewModeAtom,
  isolatePageInTree,
} from "@/utils/lib";
import { Container } from "../../components/Container";
import { useEditorStore } from "../../core/store";
import { Text } from "../../components/Text";

interface ComponentEditorTab {
  id: string; // The component node ID
  name: string; // Component name
  isDirty?: boolean; // Has unsaved changes
}

interface ComponentEditorTabsProps {
  className?: string;
}

/** Hide all ROOT children (pages, headers, footers, components), then show only the target. */
const isolateForComponentEditing = (query, actions, targetContainerId, setIsolate) => {
  const root = query.node(ROOT_NODE).get();
  root.data.nodes.forEach(nodeId => {
    const node = query.node(nodeId).get();
    const t = node?.data?.props?.type;
    if (t === "header" || t === "footer" || t === "page" || t === "component") {
      const hide = nodeId !== targetContainerId;
      actions.setHidden(nodeId, hide);
      actions.setProp(nodeId, prop => (prop.hidden = hide));
    }
  });
  setIsolate(targetContainerId);
};

/** Show pages/headers/footers, hide all components. */
const restorePageMode = (query, actions, setIsolate) => {
  const root = query.node(ROOT_NODE).get();
  root.data.nodes.forEach(nodeId => {
    const node = query.node(nodeId).get();
    const t = node?.data?.props?.type;
    if (t === "header" || t === "footer" || t === "page") {
      actions.setHidden(nodeId, false);
      actions.setProp(nodeId, prop => (prop.hidden = false));
    } else if (t === "component") {
      actions.setHidden(nodeId, true);
      actions.setProp(nodeId, prop => (prop.hidden = true));
    }
  });
  isolatePageInTree(query, actions, null, setIsolate);
};

export function ComponentEditorTabs({ className = "" }: ComponentEditorTabsProps) {
  const { query, actions } = useEditor();
  const { isolate, setIsolate } = useEditorStore();
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

  // Open or switch to a component editor.
  // componentId is the CONTAINER node ID (type="component"), or null for a new component.
  const handleOpenComponent = useCallback(
    (componentId: string | null, componentName: string) => {
      // Create a new blank component
      if (componentId === null) {
        try {
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

          actions.addNodeTree(componentWrapper, ROOT_NODE);
          const containerId = componentWrapper.rootNodeId;
          const contentNodeId = componentWrapper.nodes[containerId].data.nodes[0];

          if (!tabs.find(t => t.id === containerId)) {
            setTabs([...tabs, { id: containerId, name: componentName, isDirty: false }]);
          }
          setActiveTabId(containerId);

          // Defer serialization + isolation until tree is committed
          requestAnimationFrame(() => {
            const contentTree = query.node(contentNodeId).toNodeTree();
            const nodePairs = Object.keys(contentTree.nodes).map(id => [
              id,
              query.node(id).toSerializedNode(),
            ]);
            setComponents([
              ...components,
              { rootNodeId: contentNodeId, nodes: JSON.stringify(Object.fromEntries(nodePairs)), name: componentName },
            ]);
            isolateForComponentEditing(query, actions, containerId, setIsolate);
          });
          return;
        } catch (e) {
          console.error("Error creating new component:", e);
          return;
        }
      }

      // Resolve container ID — callers may pass either a container ID or a content node ID
      let containerId = componentId;
      const node = query.node(componentId).get();
      if (!node) return;

      if (node.data.props?.type !== "component") {
        // Caller passed a content node ID — walk up to the container
        const parentId = node.data.parent;
        const parent = parentId ? query.node(parentId).get() : null;
        if (!parent || parent.data.props?.type !== "component") return;
        containerId = parentId;
      }

      // Check if tab already exists
      const existingTab = tabs.find(t => t.id === containerId);
      if (existingTab) {
        setActiveTabId(containerId);
      } else {
        setTabs([...tabs, { id: containerId, name: componentName, isDirty: false }]);
        setActiveTabId(containerId);
      }

      requestAnimationFrame(() => {
        isolateForComponentEditing(query, actions, containerId, setIsolate);
        actions.selectNode(null);
      });
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
      handleOpenComponent(componentId, componentName);

      // Clear processing flag after a delay
      setTimeout(() => {
        if (processingRef.current === requestKey) {
          processingRef.current = null;
        }
      }, 500);
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
          isolateForComponentEditing(query, actions, newActiveTab, setIsolate);
        } else {
          setActiveTabId(null);
          restorePageMode(query, actions, setIsolate);
        }
      }
    }
  }, [components, query]);

  // Restore active tab when switching back to component mode
  useEffect(() => {
    if (viewMode === "component" && activeTabId && tabs.length > 0) {
      isolateForComponentEditing(query, actions, activeTabId, setIsolate);
    }
  }, [viewMode, activeTabId, tabs.length, isolate, query, actions, setIsolate]);

  // Switch to a different tab
  const handleTabClick = (tabId: string) => {
    setActiveTabId(tabId);
    isolateForComponentEditing(query, actions, tabId, setIsolate);
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
        const newActiveTab = newTabs[Math.max(0, tabIndex - 1)];
        setActiveTabId(newActiveTab.id);
        isolateForComponentEditing(query, actions, newActiveTab.id, setIsolate);
      } else {
        setActiveTabId(null);
        actions.setHidden(tabId, true);
        actions.setProp(tabId, prop => (prop.hidden = true));
        restorePageMode(query, actions, setIsolate);
        requestAnimationFrame(() => actions.selectNode(null));
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
              className={`group flex min-w-32 cursor-pointer items-center gap-2 rounded-t px-3 py-1.5 transition-[color,background-color,transform] active:scale-95 ${
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
                className={`hover:bg-neutral hover:text-neutral-content rounded-lg p-0.5 transition-[color,background-color,opacity,transform] active:scale-90 ${activeTabId === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
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
