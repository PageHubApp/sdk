import { useEditor } from "@craftjs/core";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import React, { useState } from "react";
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
import { useAtomState } from "@zedux/react";
import { ComponentsAtom, ViewModeAtom } from "../../../utils/atoms";
import { CanvasIsolateAtom } from "../../../utils/component/componentIsolation";
import { useUnifiedDelete } from "../../hooks/useUnifiedDelete";
import { useCreateComponent } from "../../hooks/useCreateComponent";
import { EditorListPicker } from "./EditorListPicker";
import { EditorSidebarPrimaryCta } from "../../primitives/EditorSidebarPrimaryCta";

interface ComponentSelectorProps {
  className?: string;
}

export function ComponentSelector({ className = "" }: ComponentSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const { query, actions } = useEditor();
  const [components, setComponents] = useAtomState(ComponentsAtom);
  const [canvasIsolateRaw, setCanvasIsolate] = useAtomState(CanvasIsolateAtom);
  const canvasIsolate = canvasIsolateRaw as unknown as string | null;
  const [viewModeRaw, setViewMode] = useAtomState(ViewModeAtom);
  const viewMode = viewModeRaw as unknown as string;
  const { deleteComponent } = useUnifiedDelete();
  const createComponent = useCreateComponent();

  /** Resolve a component's container ID (its rootNodeId is the *content* node). */
  const containerIdOf = (component: any): string | null => {
    try {
      const contentNode = query.node(component.rootNodeId).get();
      return contentNode?.data?.parent ?? null;
    } catch {
      return null;
    }
  };

  /** Switch to canvas mode (if not already) then isolate the given container. */
  const goCanvasAndIsolate = (containerId: string) => {
    if (viewMode !== "canvas") setViewMode("canvas" as any);
    setCanvasIsolate(containerId as any);
  };

  // Filter components based on search term
  const filteredComponents = components.filter(component =>
    component.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle component click — switch to canvas (if needed) and isolate the picked component.
  const handleComponentClick = (component: any) => {
    const containerId = containerIdOf(component);
    if (!containerId) return;
    goCanvasAndIsolate(containerId);
    setIsOpen(false);
  };

  // Create a blank component on canvas, then isolate it.
  const handleCreateComponent = () => {
    setIsOpen(false);
    createComponent();
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

  /** Toggle library item between reusable component and full-width block (`isSection` on container). */
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
    } catch (e) {
      console.error("Error toggling component type:", e);
    }
  };

  // The currently isolated component on canvas (canvasIsolate is the container ID;
  // c.rootNodeId is the content node, whose parent === container).
  const currentComponent = canvasIsolate
    ? components.find(c => {
        try {
          const contentNode = query.node(c.rootNodeId).get();
          return contentNode?.data?.parent === canvasIsolate;
        } catch {
          return false;
        }
      })
    : null;

  /** Right-hand chrome label (mirrors page bar: route left, small label right). */
  const scopeLabel = components.length > 0 ? "Components" : "No Components";

  return (
    <EditorListPicker
      className={className}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      trigger={
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="ph-menu-trigger ph-menu-trigger--chrome-rail py-1.5 text-sm"
          aria-label="Component selector"
          aria-expanded={isOpen}
        >
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <div className="shrink-0">
              {currentComponent?.isSection ? (
                <TbLayoutGridAdd className="size-4 opacity-70" aria-hidden />
              ) : (
                <TbBoxModel2 className="size-4 opacity-70" aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
              {currentComponent ? (
                <span className="text-neutral-content truncate font-mono text-xs">
                  {currentComponent.name}
                </span>
              ) : null}
              <span className="text-neutral-content/60 ml-auto shrink-0 font-mono text-[10px]">
                {scopeLabel}
              </span>
            </div>
          </div>
          <TbChevronDown
            className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
      }
      searchPlaceholder="Search components..."
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      footer={
        <>
          <EditorSidebarPrimaryCta
            variant="ghost"
            onClick={handleCreateComponent}
            leading={<TbPlus className="size-3.5" />}
          >
            Create New Component
          </EditorSidebarPrimaryCta>

          <div className="border-base-300 grid grid-cols-2 gap-0 border-t">
            <button
              type="button"
              className="border-base-300 text-neutral-content hover:bg-neutral hover:text-base-content flex items-center justify-center gap-1 border-r px-3 py-2 text-xs transition-colors"
            >
              <TbUpload className="size-3" />
              Import
            </button>
            <button
              type="button"
              className="text-neutral-content hover:bg-neutral hover:text-base-content flex items-center justify-center gap-1 px-3 py-2 text-xs transition-colors"
            >
              <TbDownload className="size-3" />
              Export
            </button>
          </div>
        </>
      }
    >
      {filteredComponents.length > 0 ? (
        filteredComponents.map(component => {
          let isSelected = false;
          try {
            const contentNode = query.node(component.rootNodeId).get();
            isSelected = !!canvasIsolate && contentNode?.data?.parent === canvasIsolate;
          } catch {
            isSelected = false;
          }

          return (
            <div
              key={component.rootNodeId}
              className={`group hover:bg-neutral flex w-full items-center gap-2 px-3 py-2 transition-colors ${
                isSelected ? "bg-accent text-accent-content font-medium" : ""
              }`}
            >
              {editingId === component.rootNodeId ? (
                <>
                  <input
                    type="text"
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") handleSaveRename(component);
                      if (e.key === "Escape") handleCancelRename();
                    }}
                    className="border-ring bg-base-100 text-base-content min-w-0 flex-1 rounded-lg border px-2 py-1 text-sm focus:outline-none"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSaveRename(component)}
                      className="text-neutral-content hover:bg-primary hover:text-primary-content rounded-md p-1 transition-colors"
                      aria-label="Save"
                    >
                      <TbCheck className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelRename}
                      className="tool-button"
                      aria-label="Cancel"
                    >
                      <TbX className="size-5" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleComponentClick(component)}
                    className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden text-left"
                  >
                    {component.isSection ? (
                      <TbLayoutGridAdd className="size-4 shrink-0 opacity-70" aria-hidden />
                    ) : (
                      <TbBoxModel2 className="size-4 shrink-0 opacity-70" aria-hidden />
                    )}
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-2 overflow-hidden">
                      <span className="text-base-content truncate text-sm">{component.name}</span>
                      <span className="text-neutral-content shrink-0 truncate text-xs">
                        {component.isSection ? "Block" : "Component"}
                      </span>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={e => handleToggleComponentType(component, e)}
                      className="text-neutral-content hover:text-base-content shrink-0 p-1 transition-colors"
                      aria-label={component.isSection ? "Convert to Component" : "Convert to Block"}
                      data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                      data-tooltip-content={
                        component.isSection ? "Convert to Component" : "Convert to Block"
                      }
                      data-tooltip-place="top"
                      data-tooltip-offset={10}
                    >
                      {component.isSection ? (
                        <TbLayoutGridAdd className="size-4" />
                      ) : (
                        <TbBoxModel2 className="size-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={e => handleStartRename(component, e)}
                      className="text-neutral-content hover:text-base-content shrink-0 p-1 transition-colors"
                      aria-label={`Rename ${component.name}`}
                    >
                      <TbPencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={e => handleDeleteComponent(component, e)}
                      className="text-neutral-content hover:text-error shrink-0 p-1 transition-colors"
                      aria-label={`Delete ${component.name}`}
                    >
                      <TbTrash className="size-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })
      ) : searchTerm ? (
        <div className="text-neutral-content px-3 py-4 text-center text-sm">
          No components found
        </div>
      ) : (
        <div className="text-neutral-content px-3 py-4 text-center text-sm">No components yet</div>
      )}
    </EditorListPicker>
  );
}
