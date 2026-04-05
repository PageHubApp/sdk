// @ts-nocheck
import { useEditor } from "@craftjs/core";
import { Tooltip } from "components/layout/Tooltip";
import React, { useEffect, useRef, useState } from "react";
import {
  TbBoxModel2,
  TbCheck,
  TbChevronDown,
  TbDownload,
  TbLayoutGridAdd,
  TbPencil,
  TbPlus,
  TbTrash,
  TbUpload,
  TbX,
} from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { ComponentsAtom, IsolateAtom, OpenComponentEditorAtom } from "utils/lib";
import { useUnifiedDelete } from "../hooks/useUnifiedDelete";

interface ComponentSelectorProps {
  className?: string;
}

export const ComponentSelector: React.FC<ComponentSelectorProps> = ({ className = "" }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const { query, actions } = useEditor();
  const [components, setComponents] = useAtomState(ComponentsAtom);
  const isolate = useAtomValue(IsolateAtom);
  const setOpenComponentEditor = useSetAtomState(OpenComponentEditorAtom);
  const { deleteComponent } = useUnifiedDelete();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Filter components based on search term
  const filteredComponents = components.filter(component =>
    component.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle component click - open in editor
  const handleComponentClick = (component: any) => {
    setOpenComponentEditor({
      componentId: component.rootNodeId,
      componentName: component.name,
    });
    setIsOpen(false);
  };

  // Handle create new component
  const handleCreateComponent = () => {
    // Trigger opening a new blank component editor
    setOpenComponentEditor({
      componentId: null,
      componentName: "New Component",
    });
    setIsOpen(false);
  };

  // Handle start rename
  const handleStartRename = (component: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(component.rootNodeId);
    setEditingName(component.name);
  };

  // Handle save rename
  const handleSaveRename = (component: any) => {
    if (!editingName.trim()) {
      setEditingId(null);
      return;
    }

    try {
      // Find the component container and update its display name
      const contentNode = query.node(component.rootNodeId).get();
      if (contentNode) {
        const componentContainerId = contentNode.data.parent;
        const componentContainer = query.node(componentContainerId).get();

        if (componentContainer?.data?.props?.type === "component") {
          // Update the container's display name
          actions.setProp(componentContainerId, prop => {
            if (!prop.custom) prop.custom = {};
            prop.custom.displayName = editingName.trim();
          });

          // Update the components list
          setComponents(
            components.map(c =>
              c.rootNodeId === component.rootNodeId ? { ...c, name: editingName.trim() } : c
            )
          );

          console.log("✅ Renamed component to:", editingName.trim());
        }
      }
    } catch (e) {
      console.error("Error renaming component:", e);
    }

    setEditingId(null);
  };

  // Handle cancel rename
  const handleCancelRename = () => {
    setEditingId(null);
    setEditingName("");
  };

  // Handle delete component
  const handleDeleteComponent = async (component: any, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!confirm(`Delete component "${component.name}"?`)) {
      return;
    }

    try {
      const success = await deleteComponent(component);
      if (success) {
        // Update the components list
        setComponents(components.filter(c => c.rootNodeId !== component.rootNodeId));
      }
    } catch (e) {
      console.error("Error deleting component:", e);
    }
  };

  // Toggle component/section type
  const handleToggleComponentType = (component: any, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const newIsSection = !component.isSection;

      // Find the component container and update its isSection property
      const contentNode = query.node(component.rootNodeId).get();
      if (contentNode) {
        const componentContainerId = contentNode.data.parent;
        const componentContainer = query.node(componentContainerId).get();

        if (componentContainer?.data?.props?.type === "component") {
          // Update the container's isSection property
          actions.setProp(componentContainerId, prop => {
            prop.isSection = newIsSection;
          });
        }
      }

      // Toggle isSection in the components list
      setComponents(
        components.map(c =>
          c.rootNodeId === component.rootNodeId ? { ...c, isSection: newIsSection } : c
        )
      );

      console.log(
        "✅ Toggled component type:",
        component.name,
        newIsSection ? "Section" : "Component"
      );
    } catch (e) {
      console.error("Error toggling component type:", e);
    }
  };

  // Find the currently editing component based on isolate ID
  // The isolate ID is the component container, but rootNodeId is the content node
  // So we need to check if the content node's parent matches the isolate
  const currentComponent = isolate
    ? components.find(c => {
      const contentNode = query.node(c.rootNodeId).get();
      return contentNode?.data?.parent === isolate;
    })
    : null;

  // Display the current component name if editing, otherwise "Components"
  const displayText = currentComponent
    ? currentComponent.name
    : components.length > 0
      ? "Components"
      : "No Components";

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground transition-colors hover:bg-muted"
        aria-label="Component selector"
      >
        <div className="flex flex-1 items-center gap-2 overflow-hidden">
          {currentComponent?.isSection ? (
            <TbLayoutGridAdd className="shrink-0" />
          ) : (
            <TbBoxModel2 className="shrink-0" />
          )}
          <span className="truncate text-sm font-medium">{displayText}</span>
        </div>
        <TbChevronDown className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-50 mt-1 flex max-h-[500px] flex-col overflow-hidden rounded-lg border border-border bg-background text-foreground shadow-xl">
          {/* Search Header - Fixed */}
          <div className="border-b border-border p-3">
            <input
              type="text"
              placeholder="Search components..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-transparent"
              autoFocus
            />
          </div>

          {/* Scrollable Content */}
          <div className="scrollbar flex-1 overflow-y-auto bg-popover text-popover-foreground">
            {/* Component List */}
            {filteredComponents.length > 0 ? (
              filteredComponents.map((component, index) => (
                <div
                  key={index}
                  className="group flex w-full items-center justify-between px-3 py-2 transition-colors hover:bg-muted"
                >
                  {editingId === component.rootNodeId ? (
                    // Rename mode
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleSaveRename(component);
                          if (e.key === "Escape") handleCancelRename();
                        }}
                        className="flex-1 rounded-lg border border-ring bg-background px-2 py-1 text-sm text-foreground focus:outline-none"
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="ml-2 flex items-center gap-1">
                        <button
                          onClick={() => handleSaveRename(component)}
                          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
                          aria-label="Save"
                        >
                          <TbCheck className="size-4" />
                        </button>
                        <button
                          onClick={handleCancelRename}
                          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label="Cancel"
                        >
                          <TbX className="size-4" />
                        </button>
                      </div>
                    </>
                  ) : (
                    // Normal mode
                    <>
                      <Tooltip
                        content={
                          component.isSection ? "Convert to Component" : "Convert to Section"
                        }
                        placement="top"
                        arrow={false}
                      >
                        <button
                          onClick={e => handleToggleComponentType(component, e)}
                          className="flex shrink-0 items-center rounded-lg p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={
                            component.isSection ? "Convert to Component" : "Convert to Section"
                          }
                        >
                          {component.isSection ? (
                            <TbLayoutGridAdd className="size-4" />
                          ) : (
                            <TbBoxModel2 className="size-4" />
                          )}
                        </button>
                      </Tooltip>
                      <button
                        onClick={() => handleComponentClick(component)}
                        className="flex flex-1 items-center gap-2 overflow-hidden text-left"
                      >
                        <span className="truncate text-sm text-foreground">{component.name}</span>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={e => handleStartRename(component, e)}
                          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          aria-label={`Rename ${component.name}`}
                        >
                          <TbPencil className="size-4" />
                        </button>
                        <button
                          onClick={e => handleDeleteComponent(component, e)}
                          className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"
                          aria-label={`Delete ${component.name}`}
                        >
                          <TbTrash className="size-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            ) : searchTerm ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No components found
              </div>
            ) : (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No components yet
              </div>
            )}
          </div>

          {/* Footer - Fixed */}
          <div className="border-t border-border">
            <button
              onClick={handleCreateComponent}
              className="flex w-full items-center gap-2 px-3 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground"
            >
              <TbPlus />
              <span className="text-sm font-medium">Create New Component</span>
            </button>

            {/* Import/Export Actions */}
            <div className="grid grid-cols-2 gap-0 border-t border-border">
              <button className="flex items-center justify-center gap-1 border-r border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <TbUpload className="size-3" />
                Import
              </button>
              <button className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <TbDownload className="size-3" />
                Export
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComponentSelector;
