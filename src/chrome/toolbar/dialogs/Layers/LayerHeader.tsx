import { NodeId, useEditor } from "@craftjs/core";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  TbArrowDown,
  TbArrowLeft,
  TbArrowRight,
  TbArrowUp,
  TbBox,
  TbChevronRight,
  TbEye,
  TbEyeOff,
  TbFile,
  TbLayoutBottombar,
  TbLayoutNavbar,
  TbSection,
  TbTrash,
} from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { IsolateAtom, isolatePageInTree } from "@/utils/lib";
import { PAGEHUB_RTT_GLOBAL_ID } from "@/chrome/primitives/layout/tooltipSurface";
import { getBuiltinComponentDef } from "@/core/builtinDefsLookup";
import { resolveToolboxIcon } from "@/chrome/viewport/toolbox/resolveToolboxIcon";
import { useLayerManager } from "./LayerManager";
import { useLayerMove } from "./hooks/useLayerMove";
import { useLayerDragDrop } from "./hooks/useLayerDragDrop";
import { lintNode, maxSeverity } from "@/utils/lint/responsiveLint";
import {
  getShowHideState,
  setShowHideState,
  useShowHideVersion,
} from "@/utils/showHideStore";

interface LayerHeaderProps {
  nodeId: NodeId;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
}

const FALLBACK_ICON = TbBox;

function resolveTypeIcon(
  nodeName: string,
  isPage: boolean,
  isHeader: boolean,
  isFooter: boolean,
  isSection: boolean,
): React.ComponentType<{ className?: string }> {
  if (isPage) return TbFile;
  if (isHeader) return TbLayoutNavbar;
  if (isFooter) return TbLayoutBottombar;
  if (isSection) return TbSection;
  const def = getBuiltinComponentDef(nodeName);
  if (def?.icon) return resolveToolboxIcon(def.icon);
  return FALLBACK_ICON;
}

export function LayerHeader({ nodeId, depth, hasChildren, isExpanded }: LayerHeaderProps) {
  const { toggleExpanded, setDraggedNode, setDropIndicator, state } = useLayerManager();
  const [isEditingName, setIsEditingName] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isolate, setIsolate] = useAtomState(IsolateAtom);

  const {
    displayName,
    craftHidden,
    isSelected,
    isHovered,
    actions,
    query,
    nodeName,
    nodeType,
    nodeClassName,
    nodeChildCount,
    nodeLintIgnore,
    showHideTarget,
  } = useEditor((editorState, query) => {
    const node = editorState.nodes[nodeId];
    const selectedId = query.getEvent("selected").first();
    const hoveredId = query.getEvent("hovered").first();
    const props = node?.data?.props;
    const target =
      (props?.attrs && typeof props.attrs.id === "string" ? props.attrs.id : undefined) ||
      (typeof props?.id === "string" ? props.id : undefined) ||
      (typeof props?.anchor === "string" ? props.anchor : undefined);

    return {
      displayName:
        node?.data?.custom?.displayName ||
        node?.data?.displayName ||
        node?.data?.name ||
        "Unnamed",
      craftHidden: node?.data?.hidden || false,
      isSelected: selectedId === nodeId,
      isHovered: hoveredId === nodeId,
      nodeName: node?.data?.name || "",
      nodeType: node?.data?.props?.type || "",
      nodeClassName: (node?.data?.props?.className as string) || "",
      nodeChildCount: node?.data?.nodes?.length ?? 0,
      nodeLintIgnore: node?.data?.custom?.lintIgnore,
      showHideTarget: target as string | undefined,
    };
  });

  // Subscribe to show-hide store so the eyeball icon flips reactively when
  // the store state for this node's DOM target changes (e.g. modifier picker
  // toggles, action panel "peek", show-hide button click).
  useShowHideVersion();

  // Unified hidden state — node is hidden if ANY mechanism is hiding it:
  //   1. CraftJS `data.hidden` (page switching, isolation, conditions)
  //   2. `hidden` token in className (cookie banners, modal backdrops)
  //   3. showHideStore says "hidden" for the node's DOM target
  // The store override "shown" wins over a baked-in className `hidden` token,
  // matching what `applyShowHideOverride` does at render time.
  const classNameHasHidden = nodeClassName.split(/\s+/).includes("hidden");
  const storeState = showHideTarget ? getShowHideState(showHideTarget) : undefined;
  const isHidden =
    craftHidden ||
    (classNameHasHidden && storeState !== "shown") ||
    storeState === "hidden";

  // Responsive lint — re-runs only when this node's className or child count changes.
  const lintIssues = useMemo(
    () =>
      lintNode({
        data: {
          props: { className: nodeClassName },
          nodes: new Array(nodeChildCount), // we only need the length
          custom: { lintIgnore: nodeLintIgnore },
        },
      }),
    [nodeClassName, nodeChildCount, nodeLintIgnore]
  );
  const lintSeverity = maxSeverity(lintIssues);

  const isDragging = state.draggedNode === nodeId;
  const isDropTarget = state.dropIndicator?.targetId === nodeId && state.draggedNode !== nodeId;

  // Structural roles from props.type — no component name checks
  const isPage = nodeType === "page";
  const isHeader = nodeType === "header";
  const isFooter = nodeType === "footer";
  const isSection = nodeType === "section";

  const TypeIcon = useMemo(
    () => resolveTypeIcon(nodeName, isPage, isHeader, isFooter, isSection),
    [nodeName, isPage, isHeader, isFooter, isSection],
  );

  const roleIconColor = isSelected
    ? "text-white"
    : isPage
      ? "text-orange-500"
      : isHeader
        ? "text-purple-500"
        : isFooter
          ? "text-emerald-500"
          : isSection
            ? "text-blue-500"
            : "text-gray-500 dark:text-gray-400";

  // Extracted hooks for move and drag/drop logic
  const {
    handleMoveUp,
    handleMoveDown,
    handleMoveOut,
    handleMoveIn,
    canMoveUp,
    canMoveDown,
    canMoveOut,
    canMoveIn,
  } = useLayerMove({ nodeId });

  const { handleDragStart, handleDragEnd, handleDragOver, handleDragLeave } = useLayerDragDrop({
    nodeId,
    depth,
    hasChildren,
    setDraggedNode,
    setDropIndicator,
    state,
  });

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

  // Handle visibility toggle — reveals the node by clearing whichever
  // mechanism is hiding it (any combination of craft `data.hidden`, className
  // `hidden` token via store, or store-hidden state). When making a visible
  // node hidden, defaults to craft `data.hidden` so the eyeball works on every
  // node regardless of whether it has a DOM id.
  const handleToggleVisibility = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!isHidden) {
        actions.setHidden(nodeId, true);
        return;
      }
      if (craftHidden) actions.setHidden(nodeId, false);
      if (showHideTarget && (classNameHasHidden || storeState === "hidden")) {
        setShowHideState(showHideTarget, "shown");
      }
    },
    [nodeId, isHidden, craftHidden, classNameHasHidden, storeState, showHideTarget, actions]
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
      isolatePageInTree(query, actions, nodeId, setIsolate);
    } else {
      actions.selectNode(nodeId);
    }
  }, [nodeId, actions, isPage, isolate, query, setIsolate]);

  // Handle name editing (pages are renamed via page settings, not layers)
  const handleNameDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (isPage) return;
      e.stopPropagation();
      setIsEditingName(true);
    },
    [isPage]
  );

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

  const showInsideDrop = isDropTarget && state.dropIndicator?.position === "inside";
  const showBeforeDrop = isDropTarget && state.dropIndicator?.position === "before";
  const showAfterDrop = isDropTarget && state.dropIndicator?.position === "after";

  const dimmed = isHidden && !isSelected;

  const rowClassName = [
    "group relative flex w-full cursor-pointer select-none items-center gap-1 py-1.5 pr-1.5",
    isHeader ? "mb-0.5" : "",
    isFooter ? "mt-0.5" : "",
    isSelected
      ? "bg-blue-600 text-white dark:bg-blue-500"
      : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/70",
    isHovered && !isSelected ? "bg-gray-100 dark:bg-gray-800/70" : "",
    isDragging ? "cursor-grabbing opacity-40" : "",
    showInsideDrop ? "ring-1 ring-blue-500 ring-inset" : "",
    dimmed ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      {/* Drop indicator - before */}
      {showBeforeDrop && (
        <div
          className="relative h-0.5 w-full bg-blue-500"
          style={{ marginLeft: `${depth * 12 + 6}px` }}
        />
      )}

      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        className={rowClassName}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        onClick={handleSelect}
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Expand/collapse chevron */}
        <div className="flex size-3 shrink-0 items-center justify-center">
          {hasChildren ? (
            <button
              onClick={handleToggleExpand}
              className="rounded p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              <TbChevronRight
                className={`size-3 transition-transform duration-150 ${
                  isExpanded ? "rotate-90" : ""
                } ${isSelected ? "text-white" : "text-gray-500 dark:text-gray-400"}`}
              />
            </button>
          ) : null}
        </div>

        {/* Type icon (carries role color for page/header/footer/section) */}
        <TypeIcon className={`size-3.5 shrink-0 ${roleIconColor}`} />

        {/* Display name */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div className="min-w-0 flex-1" onDoubleClick={handleNameDoubleClick}>
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={displayName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="w-full rounded border border-blue-500 bg-white px-0.5 py-0 text-xs leading-none text-gray-900 outline-none dark:bg-gray-800 dark:text-gray-100"
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              className={`block truncate text-xs leading-tight ${
                isSelected ? "font-medium" : ""
              }`}
            >
              {isPage ? "Page" : displayName}
            </span>
          )}
        </div>

        {/* Lint dot — always visible when present */}
        {lintSeverity && (
          <span
            className={`size-1.5 shrink-0 rounded-full ${
              lintSeverity === "error" ? "bg-red-500" : "bg-yellow-500"
            }`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={lintIssues.map(i => `• ${i.message}`).join("\n")}
            data-tooltip-place="left"
            aria-label={`${lintIssues.length} responsive ${
              lintIssues.length === 1 ? "issue" : "issues"
            }`}
          />
        )}

        {/* Hidden indicator — visible at rest only when node is hidden AND
            chrome isn't already showing (selected rows or hovered rows show
            the toggle button, which would otherwise render two eyeballs). */}
        {isHidden && !isSelected && (
          <TbEyeOff
            className="size-3.5 shrink-0 text-gray-400 dark:text-gray-500 group-hover:hidden"
            aria-hidden
          />
        )}

        {/* Hover-only chrome: visibility toggle + move arrows + delete */}
        <div
          className={`flex items-center gap-0.5 transition-opacity ${
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <button
            onClick={handleToggleVisibility}
            className="rounded p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10"
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={isHidden ? "Show" : "Hide"}
            aria-label="Toggle visibility"
            aria-pressed={!isHidden}
          >
            {isHidden ? (
              <TbEyeOff className="size-3.5" />
            ) : (
              <TbEye className="size-3.5" />
            )}
          </button>

          <button
            onClick={handleMoveUp}
            disabled={!canMoveUp}
            className={`rounded p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${
              canMoveUp ? "" : "cursor-not-allowed opacity-30"
            }`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Move up (↑)"
            aria-label="Move up"
          >
            <TbArrowUp className="size-3" />
          </button>
          <button
            onClick={handleMoveDown}
            disabled={!canMoveDown}
            className={`rounded p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${
              canMoveDown ? "" : "cursor-not-allowed opacity-30"
            }`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Move down (↓)"
            aria-label="Move down"
          >
            <TbArrowDown className="size-3" />
          </button>
          <button
            onClick={handleMoveOut}
            disabled={!canMoveOut}
            className={`rounded p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${
              canMoveOut ? "" : "cursor-not-allowed opacity-30"
            }`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Move out (←)"
            aria-label="Move out"
          >
            <TbArrowLeft className="size-3" />
          </button>
          <button
            onClick={handleMoveIn}
            disabled={!canMoveIn}
            className={`rounded p-0.5 transition-colors hover:bg-black/10 dark:hover:bg-white/10 ${
              canMoveIn ? "" : "cursor-not-allowed opacity-30"
            }`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content="Move in (→)"
            aria-label="Move in"
          >
            <TbArrowRight className="size-3" />
          </button>

          {canDelete && (
            <button
              onClick={handleDelete}
              className="rounded p-0.5 transition-colors hover:bg-red-500/20 hover:text-red-500"
              data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
              data-tooltip-content="Delete"
              aria-label="Delete"
            >
              <TbTrash className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Drop indicator - after */}
      {showAfterDrop && (
        <div
          className="relative h-0.5 w-full bg-blue-500"
          style={{ marginLeft: `${depth * 12 + 6}px` }}
        />
      )}
    </>
  );
}
