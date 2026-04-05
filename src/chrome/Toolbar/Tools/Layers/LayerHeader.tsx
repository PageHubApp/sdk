// @ts-nocheck
import { NodeId, useEditor } from "@craftjs/core";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  TbArrowDown,
  TbArrowLeft,
  TbArrowRight,
  TbArrowUp,
  TbChevronRight,
  TbEye,
  TbEyeOff,
  TbGripVertical,
  TbTrash,
} from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { IsolateAtom, isolatePageAlt } from "utils/lib";
import { useLayerManager } from "./LayerManager";
import { canMove } from "./utils";

interface LayerHeaderProps {
  nodeId: NodeId;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

export const LayerHeader: React.FC<LayerHeaderProps> = ({
  nodeId,
  depth,
  hasChildren,
  isExpanded,
}) => {
  const { toggleExpanded, setDraggedNode, setDropIndicator, state } = useLayerManager();
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isolate, setIsolate] = useAtomState(IsolateAtom);

  const { displayName, hidden, isSelected, isHovered, actions, query, componentType, nodeType } =
    useEditor((editorState, query) => {
      const node = editorState.nodes[nodeId];
      const selectedId = query.getEvent("selected").first();
      const hoveredId = query.getEvent("hovered").first();

      return {
        displayName:
          node?.data?.custom?.displayName ||
          node?.data?.displayName ||
          node?.data?.name ||
          "Unnamed",
        hidden: node?.data?.hidden || false,
        isSelected: selectedId === nodeId,
        isHovered: hoveredId === nodeId,
        componentType: node?.data?.displayName || node?.data?.name || "",
        nodeType: node?.data?.props?.type || "",
      };
    });

  const isDragging = state.draggedNode === nodeId;
  const isDropTarget = state.dropIndicator?.targetId === nodeId && state.draggedNode !== nodeId;

  // Check component types for different styling
  const isPage = nodeType === "page" || componentType === "Page";
  const isHeader = componentType === "Header";
  const isFooter = componentType === "Footer";
  const isSection = componentType === "Container" && !isPage && !isHeader && !isFooter;

  // Arrow button handlers
  const handleMoveUp = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const node = query.node(nodeId).get();
      const parentId = node.data.parent;
      if (!parentId) return;

      const parent = query.node(parentId).get();
      const siblings = parent.data.nodes || [];
      const currentIndex = siblings.indexOf(nodeId);

      if (currentIndex > 0) {
        // Move before previous sibling
        actions.move(nodeId, parentId, currentIndex - 1);
      }
    },
    [nodeId, query, actions]
  );

  const handleMoveDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const node = query.node(nodeId).get();
      const parentId = node.data.parent;
      if (!parentId) return;

      const parent = query.node(parentId).get();
      const siblings = parent.data.nodes || [];
      const currentIndex = siblings.indexOf(nodeId);

      if (currentIndex < siblings.length - 1) {
        // Move after next sibling
        actions.move(nodeId, parentId, currentIndex + 2);
      }
    },
    [nodeId, query, actions]
  );

  const handleMoveOut = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const node = query.node(nodeId).get();
      const parentId = node.data.parent;
      if (!parentId) return;

      const parent = query.node(parentId).get();
      const grandparentId = parent.data.parent;
      if (!grandparentId) return;

      // Check if grandparent can accept this node type
      const grandparent = query.node(grandparentId).get();
      if (!(grandparent.rules.canMoveIn as any)([node], grandparent)) {
        console.warn("Cannot move node out - grandparent rejects this node type");
        return;
      }

      try {
        // Move to after parent (outdent)
        const parentSiblings = grandparent.data.nodes || [];
        const parentIndex = parentSiblings.indexOf(parentId);

        actions.move(nodeId, grandparentId, parentIndex + 1);
      } catch (error) {
        console.error("Cannot move node out:", error);
      }
    },
    [nodeId, query, actions]
  );

  const handleMoveIn = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const node = query.node(nodeId).get();
      const parentId = node.data.parent;
      if (!parentId) return;

      const parent = query.node(parentId).get();
      const siblings = parent.data.nodes || [];
      const currentIndex = siblings.indexOf(nodeId);

      if (currentIndex > 0) {
        // Move into previous sibling (if it's a canvas and accepts this node)
        const prevSiblingId = siblings[currentIndex - 1];
        const prevSibling = query.node(prevSiblingId).get();

        if (prevSibling.data.isCanvas) {
          try {
            // Check if previous sibling can accept this node type
            if (!(prevSibling.rules.canMoveIn as any)([node], prevSibling)) {
              console.warn("Cannot move node in - previous sibling rejects this node type");
              return;
            }

            const prevSiblingChildren = prevSibling.data.nodes || [];
            actions.move(nodeId, prevSiblingId, prevSiblingChildren.length);
          } catch (error) {
            console.warn("Cannot move node into previous sibling:", error);
          }
        }
      }
    },
    [nodeId, query, actions]
  );

  // Check what moves are possible
  const node = query.node(nodeId).get();
  const parentId = node?.data?.parent;
  const parent = parentId ? query.node(parentId).get() : null;
  const siblings = parent?.data?.nodes || [];
  const currentIndex = siblings.indexOf(nodeId);
  const grandparentId = parent?.data?.parent;

  const canMoveUp = currentIndex > 0;
  const canMoveDown = currentIndex < siblings.length - 1;

  // Check if we can move out: grandparent must exist AND accept this node type
  let canMoveOut = false;
  if (grandparentId) {
    try {
      const grandparent = query.node(grandparentId).get();
      canMoveOut = (grandparent?.rules?.canMoveIn as any)?.([node], grandparent) ?? false;
    } catch (error) {
      canMoveOut = false;
    }
  }

  // Check if move in is possible (previous sibling must be canvas, node must be draggable, and sibling must accept this node)
  let canMoveIn = false;
  if (currentIndex > 0 && siblings[currentIndex - 1]) {
    try {
      const prevSiblingId = siblings[currentIndex - 1];
      const prevSibling = query.node(prevSiblingId).get();

      canMoveIn =
        prevSibling?.data?.isCanvas &&
        query.node(nodeId).isDraggable() &&
        ((prevSibling?.rules?.canMoveIn as any)?.([node], prevSibling) ?? false);
    } catch (error) {
      canMoveIn = false;
    }
  }

  // Check if node can be deleted
  // Prevent deletion of Header, Footer, and Homepage
  const nodeData = query.node(nodeId).get();
  const isHomePage = nodeData?.data?.props?.isHomePage || false;
  const canDelete = query.node(nodeId).isDeletable() && !isHeader && !isFooter && !isHomePage;

  // Handle delete
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (canDelete) {
        actions.delete(nodeId);
      }
    },
    [nodeId, canDelete, actions]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      setDraggedNode(nodeId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", nodeId);
    },
    [nodeId, setDraggedNode]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();

      // Execute the move if we have a valid drop target
      if (state.dropIndicator && state.draggedNode) {
        const { targetId, position } = state.dropIndicator;

        try {
          const draggedNode = query.node(state.draggedNode).get();
          const targetNode = query.node(targetId).get();

          if (position === "inside") {
            // Validate that target can accept this node
            if (!(targetNode.rules.canMoveIn as any)([draggedNode], targetNode)) {
              console.warn("Cannot drop inside - target rejects this node type");
              setDraggedNode(null);
              setDropIndicator(null);
              return;
            }

            // Move inside the target node
            const targetChildren = targetNode.data.nodes || [];
            actions.move(state.draggedNode, targetId, targetChildren.length);
          } else {
            // Move before or after the target node
            const parentId = targetNode.data.parent;
            if (parentId) {
              const parentNode = query.node(parentId).get();

              // Validate that parent can accept this node
              if (!(parentNode.rules.canMoveIn as any)([draggedNode], parentNode)) {
                console.warn("Cannot drop - parent rejects this node type");
                setDraggedNode(null);
                setDropIndicator(null);
                return;
              }

              const siblings = parentNode.data.nodes || [];
              const targetIndex = siblings.indexOf(targetId);
              const newIndex = position === "after" ? targetIndex + 1 : targetIndex;
              actions.move(state.draggedNode, parentId, newIndex);
            }
          }
        } catch (error) {
          console.error("Error moving node:", error);
        }
      }

      setDraggedNode(null);
      setDropIndicator(null);
    },
    [state.dropIndicator, state.draggedNode, actions, query, setDraggedNode, setDropIndicator]
  );

  // Handle drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!state.draggedNode || state.draggedNode === nodeId) {
        return;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const height = rect.height;
      const width = rect.width;

      // Get node to check if it's a canvas
      const node = query.node(nodeId).get();
      const isCanvas = node?.data?.isCanvas || false;

      // Check if dragging to LEFT MARGIN (to move OUT of parent)
      const leftMargin = depth * 16 + 8;
      const isInLeftMargin = mouseX < leftMargin + 40; // 40px margin zone

      // If dragging in left margin and this node has a parent,
      // offer to drop AFTER the parent instead
      if (isInLeftMargin && depth > 0) {
        const parent = query.node(node.data.parent).get();
        if (parent && parent.data.parent) {
          // Offer to drop after the parent (moves item out one level)
          const editorState = query.getSerializedNodes();
          const nodes = Object.keys(editorState).reduce(
            (acc, id) => {
              acc[id] = query.node(id).get();
              return acc;
            },
            {} as Record<NodeId, any>
          );

          if (canMove(state.draggedNode, node.data.parent, "after", nodes)) {
            setDropIndicator({
              targetId: node.data.parent,
              position: "after",
            });
            return;
          }
        }
      }

      // More generous drop zones for better UX
      let position: "before" | "after" | "inside";

      if (isCanvas && hasChildren) {
        // For canvas nodes with children, create 3 clear zones (very generous)
        if (mouseY < height * 0.2) {
          position = "before"; // Top 20% = before
        } else if (mouseY > height * 0.8) {
          position = "after"; // Bottom 20% = after
        } else {
          position = "inside"; // Middle 60% = inside (larger target!)
        }
      } else if (isCanvas) {
        // Canvas without children - prefer inside
        if (mouseY < height * 0.25) {
          position = "before";
        } else if (mouseY > height * 0.75) {
          position = "after";
        } else {
          position = "inside"; // 50% for inside
        }
      } else {
        // Non-canvas - only before/after
        position = mouseY < height / 2 ? "before" : "after";
      }

      // Validate move before showing indicator
      const editorState = query.getSerializedNodes();
      const nodes = Object.keys(editorState).reduce(
        (acc, id) => {
          acc[id] = query.node(id).get();
          return acc;
        },
        {} as Record<NodeId, any>
      );

      if (canMove(state.draggedNode, nodeId, position, nodes)) {
        setDropIndicator({ targetId: nodeId, position });
      }
    },
    [nodeId, depth, hasChildren, state.draggedNode, query, setDropIndicator]
  );

  // Handle drag leave
  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      // Only clear if we're leaving this specific element
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (!e.currentTarget.contains(relatedTarget)) {
        setDropIndicator(null);
      }
    },
    [setDropIndicator]
  );

  // Handle visibility toggle
  const handleToggleVisibility = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      actions.setHidden(nodeId, !hidden);
    },
    [nodeId, hidden, actions]
  );

  // Handle expand/collapse
  const handleToggleExpand = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleExpanded(nodeId);
    },
    [nodeId, toggleExpanded]
  );

  // Handle selection
  const handleSelect = useCallback(() => {
    // If clicking on a page, isolate it
    if (isPage) {
      isolatePageAlt(isolate, query, nodeId, actions, setIsolate, true);
    } else {
      actions.selectNode(nodeId);
    }
  }, [nodeId, actions, isPage, isolate, query, setIsolate]);

  // Handle name editing
  const handleNameDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditingName(true);
  }, []);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      actions.setCustom(nodeId, custom => {
        custom.displayName = e.target.value;
      });
    },
    [nodeId, actions]
  );

  const handleNameBlur = useCallback(() => {
    setIsEditingName(false);
  }, []);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditingName(false);
    } else if (e.key === "Escape") {
      setIsEditingName(false);
    }
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  return (
    <>
      {/* Drop indicator - before (with spacing) */}
      {isDropTarget && state.dropIndicator?.position === "before" && (
        <div
          className="animate-in fade-in zoom-in relative w-full py-3 duration-200"
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <div className="h-1 w-full animate-pulse rounded-full bg-linear-to-r from-blue-400 via-blue-500 to-blue-600 shadow-lg shadow-blue-500/50" />
          <div className="border-3 absolute -top-1.5 left-0 size-5 rounded-full border-white bg-linear-to-br from-blue-400 to-blue-600 shadow-lg" />
          <div className="absolute -top-1 right-0 rounded-full bg-linear-to-r from-blue-500 to-blue-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
            Drop here
          </div>
        </div>
      )}

      <div
        className={`group relative flex cursor-pointer items-center gap-2.5 border-l-2 px-3 py-2 transition-all duration-200 ${
          isHeader ? "mb-3" : ""
        } ${isFooter ? "mt-3" : ""} ${
          isSelected
            ? isPage
              ? "border-l-orange-700 bg-linear-to-r from-orange-500 to-orange-600 font-medium text-white shadow-lg"
              : isHeader
                ? "border-l-purple-700 bg-linear-to-r from-purple-500 to-purple-600 font-medium text-white shadow-lg"
                : isFooter
                  ? "border-l-emerald-700 bg-linear-to-r from-emerald-500 to-emerald-600 font-medium text-white shadow-lg"
                  : isSection
                    ? "border-l-blue-700 bg-linear-to-r from-blue-500 to-blue-600 font-medium text-white shadow-lg"
                    : "border-l-gray-700 bg-linear-to-r from-gray-500 to-gray-600 font-medium text-white shadow-lg"
            : isPage
              ? "border-l-orange-300 bg-orange-50/50 hover:border-l-orange-400 hover:bg-orange-100/70 dark:border-l-orange-700 dark:bg-orange-900/30 dark:hover:border-l-orange-600 dark:hover:bg-orange-900/50"
              : isHeader
                ? "border-l-purple-300 bg-purple-50/50 hover:border-l-purple-400 hover:bg-purple-100/70 dark:border-l-purple-700 dark:bg-purple-900/30 dark:hover:border-l-purple-600 dark:hover:bg-purple-900/50"
                : isFooter
                  ? "border-l-emerald-300 bg-emerald-50/50 hover:border-l-emerald-400 hover:bg-emerald-100/70 dark:border-l-emerald-700 dark:bg-emerald-900/30 dark:hover:border-l-emerald-600 dark:hover:bg-emerald-900/50"
                  : isSection
                    ? "border-l-blue-300 bg-blue-50/50 hover:border-l-blue-400 hover:bg-blue-100/70 dark:border-l-blue-700 dark:bg-blue-900/30 dark:hover:border-l-blue-600 dark:hover:bg-blue-900/50"
                    : "border-l-transparent hover:border-l-gray-300 hover:bg-gray-50 dark:hover:border-l-gray-600 dark:hover:bg-gray-800"
        } ${isDragging ? "scale-105 cursor-grabbing opacity-50 shadow-xl" : "cursor-pointer"} ${
          isHovered && !isSelected ? "bg-gray-50 dark:bg-gray-900" : ""
        } ${
          isDropTarget && state.dropIndicator?.position === "inside"
            ? "scale-[1.02] border-l-blue-500 bg-linear-to-r from-blue-50 to-blue-100 ring-2 ring-inset ring-blue-400 dark:from-blue-950 dark:to-blue-900 dark:ring-blue-600"
            : ""
        } ${isDropTarget ? "my-1" : ""}`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleSelect}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Drag handle */}
        <div
          className={`${isDragging ? "animate-pulse" : ""} transition-transform hover:scale-110`}
        >
          <TbGripVertical
            className={`size-4 shrink-0 cursor-grab transition-colors active:cursor-grabbing ${
              isSelected
                ? "text-white"
                : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            } ${isDragging ? "text-blue-500" : ""}`}
          />
        </div>

        {/* Expand/collapse chevron */}
        <div className="flex size-4 shrink-0 items-center justify-center">
          {hasChildren ? (
            <button
              onClick={handleToggleExpand}
              className="rounded p-0.5 transition-all hover:scale-110 hover:bg-white/20 dark:hover:bg-black/20"
            >
              <TbChevronRight
                className={`size-3.5 transition-all duration-200 ${
                  isExpanded ? "rotate-90" : ""
                } ${isSelected ? "text-white" : "text-gray-600 dark:text-gray-400"}`}
              />
            </button>
          ) : (
            <div className="size-3.5" />
          )}
        </div>

        {/* Visibility toggle */}
        <button
          onClick={handleToggleVisibility}
          className="rounded p-1 transition-all hover:scale-110 hover:bg-white/20 dark:hover:bg-black/20"
          title={hidden ? "Show" : "Hide"}
        >
          {hidden ? (
            <TbEyeOff
              className={`size-4 transition-colors ${
                isSelected ? "text-white/70" : "hover:text-red-500 text-gray-400"
              }`}
            />
          ) : (
            <TbEye
              className={`size-4 transition-colors ${
                isSelected
                  ? "text-white"
                  : "text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
              }`}
            />
          )}
        </button>

        {/* Display name */}
        <div className="min-w-0 flex-1" onDoubleClick={handleNameDoubleClick}>
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={displayName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="w-full rounded border border-blue-500 bg-white px-1 py-0 text-sm text-gray-900 outline-none dark:bg-gray-800 dark:text-gray-100"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              className={`block truncate text-sm ${
                isSelected ? "font-medium text-white" : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {displayName}
            </span>
          )}
        </div>

        {/* Arrow controls - show on hover or selection */}
        <div
          className={`flex items-center gap-0.5 transition-all duration-200 ${
            isSelected
              ? "scale-100 opacity-100"
              : "scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100"
          }`}
        >
          <div className="flex items-center gap-0.5 rounded bg-white/10 px-0.5 backdrop-blur-sm dark:bg-black/10">
            <button
              onClick={handleMoveUp}
              disabled={!canMoveUp}
              className={`rounded p-1 transition-all ${
                canMoveUp
                  ? "hover:scale-110 hover:bg-white/20 dark:hover:bg-black/30"
                  : "cursor-not-allowed opacity-20"
              }`}
              title="Move up (↑)"
            >
              <TbArrowUp
                className={`size-3.5 transition-colors ${
                  isSelected ? "text-white" : "text-gray-700 dark:text-gray-300"
                }`}
              />
            </button>
            <button
              onClick={handleMoveDown}
              disabled={!canMoveDown}
              className={`rounded p-1 transition-all ${
                canMoveDown
                  ? "hover:scale-110 hover:bg-white/20 dark:hover:bg-black/30"
                  : "cursor-not-allowed opacity-20"
              }`}
              title="Move down (↓)"
            >
              <TbArrowDown
                className={`size-3.5 transition-colors ${
                  isSelected ? "text-white" : "text-gray-700 dark:text-gray-300"
                }`}
              />
            </button>
            <div className="h-4 w-px bg-white/20 dark:bg-black/20" />
            <button
              onClick={handleMoveOut}
              disabled={!canMoveOut}
              className={`rounded p-1 transition-all ${
                canMoveOut
                  ? "hover:scale-110 hover:bg-white/20 dark:hover:bg-black/30"
                  : "cursor-not-allowed opacity-20"
              }`}
              title="Move out (←)"
            >
              <TbArrowLeft
                className={`size-3.5 transition-colors ${
                  isSelected ? "text-white" : "text-gray-700 dark:text-gray-300"
                }`}
              />
            </button>
            <button
              onClick={handleMoveIn}
              disabled={!canMoveIn}
              className={`rounded p-1 transition-all ${
                canMoveIn
                  ? "hover:scale-110 hover:bg-white/20 dark:hover:bg-black/30"
                  : "cursor-not-allowed opacity-20"
              }`}
              title="Move in (→)"
            >
              <TbArrowRight
                className={`size-3.5 transition-colors ${
                  isSelected ? "text-white" : "text-gray-700 dark:text-gray-300"
                }`}
              />
            </button>
            {canDelete && (
              <>
                <div className="h-4 w-px bg-white/20 dark:bg-black/20" />
                <button
                  onClick={handleDelete}
                  className="hover:bg-red-500/20 dark:hover:bg-red-500/30 rounded p-1 transition-all hover:scale-110"
                  title="Delete"
                >
                  <TbTrash
                    className={`size-3.5 transition-colors ${
                      isSelected
                        ? "hover:text-red-300 text-white"
                        : "hover:text-red-600 dark:hover:text-red-400 text-gray-700 dark:text-gray-300"
                    }`}
                  />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Drop indicator - after (with spacing) */}
      {isDropTarget && state.dropIndicator?.position === "after" && (
        <div
          className="animate-in fade-in zoom-in relative w-full py-3 duration-200"
          style={{ marginLeft: `${depth * 16}px` }}
        >
          <div className="h-1 w-full animate-pulse rounded-full bg-linear-to-r from-blue-400 via-blue-500 to-blue-600 shadow-lg shadow-blue-500/50" />
          <div className="border-3 absolute -top-1.5 left-0 size-5 rounded-full border-white bg-linear-to-br from-blue-400 to-blue-600 shadow-lg" />
          <div className="absolute -top-1 right-0 rounded-full bg-linear-to-r from-blue-500 to-blue-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
            Drop here
          </div>
        </div>
      )}

      {/* Label for inside drops */}
      {isDropTarget && state.dropIndicator?.position === "inside" && (
        <div className="pointer-events-none absolute right-3 top-2 z-10 animate-pulse rounded-full border-2 border-blue-400 bg-linear-to-r from-blue-500 to-blue-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
          Drop inside
        </div>
      )}
    </>
  );
};
