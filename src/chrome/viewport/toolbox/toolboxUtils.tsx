/**
 * Craft drag sources, AddElement, and ROOT_KEPT for toolbox drops.
 * Built-in tiles are built from defineComponent() (see customComponents.tsx, editor.tsx).
 */
import { ROOT_NODE } from "@craftjs/utils";
import { Element, useEditor } from "@craftjs/core";
import { atom, useAtomValue } from "@zedux/react";
import React, { cloneElement, isValidElement, useMemo, useState } from "react";
import { ToolboxInsertHintTooltip } from "../../primitives/ToolboxInsertHintTooltip";
import { applySmartDefaultsForNewNode } from "../../shell/spatial/executeSpatialDrop";
import { createMergedActions } from "../../shell/spatial/mergedActions";
import { sdkLog } from "../../../utils/logger";

/**
 * Allowed `props.root` keys (non-class styling). Must stay aligned with
 * `ROOT_KEPT` in `scripts/TemplateBuilder.js` / `verify-repo-json.js`.
 */
const ROOT_KEPT = new Set([
  "style",
  "animation",
  "animationDuration",
  "animationDelay",
  "animationEasing",
  "animationTrigger",
  "animationCSSName",
  "animationEngine",
  "pattern",
  "patternVerticalPosition",
  "patternHorizontalPosition",
  "patternStroke",
  "patternZoom",
  "patternColorA",
  "patternColorB",
  "patternSpacingX",
  "patternSpacingY",
  "patternAngle",
  "layoutMode",
  "layoutColumns",
  "activeModifiers",
]);

function pickKeptRoot(root) {
  if (!root || typeof root !== "object") return {};
  const kept = {};
  for (const k of Object.keys(root)) {
    if (ROOT_KEPT.has(k)) kept[k] = root[k];
  }
  return kept;
}

export const Tools: any = {};

export const SelectedNodeAtom = atom("selectedNode", { id: null, position: "" });

/** Look up a component's resolver name. Prefers `.craft.name` (the canonical
 *  resolver key, matches `defineComponent({ name })`), then falls back to
 *  `.craft.displayName` for components that historically aliased the two.
 *  Function.name comes last because it gets mangled in UMD builds. */
function resolveCraftName(comp: any): string | undefined {
  if (!comp) return undefined;
  if (typeof comp === "string") return comp;
  return (
    comp.craft?.name ||
    comp.craft?.displayName ||
    comp.resolvedName ||
    comp.displayName ||
    comp.name
  );
}

function normalizeElementRefs(element: any, resolver: Record<string, any>): any {
  if (Array.isArray(element)) {
    return element.map(c => normalizeElementRefs(c, resolver));
  }

  if (!React.isValidElement(element)) return element;

  const props = (element as any).props ?? {};
  const { is, children, ...rest } = props;

  let newType: any = (element as any).type;
  if (typeof newType === "function") {
    const n = resolveCraftName(newType);
    if (n && resolver[n]) newType = resolver[n];
  }

  let newIs = is;
  if (is !== undefined) {
    const n = resolveCraftName(is);
    if (n && resolver[n]) newIs = resolver[n];
  }

  const newChildren =
    children !== undefined
      ? Array.isArray(children)
        ? children.map(c => normalizeElementRefs(c, resolver))
        : normalizeElementRefs(children, resolver)
      : children;

  const newProps: any = { ...rest };
  if (newIs !== undefined) newProps.is = newIs;
  if (newChildren !== undefined) newProps.children = newChildren;

  if (newType !== (element as any).type) {
    return React.createElement(newType, { key: (element as any).key, ...newProps });
  }
  return React.cloneElement(element as any, newProps);
}

/**
 * Build the same canvas `<Element>` tree used for toolbox drag / double-click insert.
 * `params` matches the prop bag passed to {@link RenderToolComponent} (minus `display` / `renderer`).
 */
export function buildToolboxCanvasElement(
  query: any,
  params: {
    element: any;
    className?: string;
    root?: any;
    [key: string]: any;
  }
): React.ReactElement {
  const { element, className = "", root, ...rest } = params;
  const resolver = query.getOptions().resolver;
  let resolvedElement = element;
  if (resolver) {
    if (typeof element === "string") {
      resolvedElement = resolver[element] ?? element;
    } else if (element) {
      const name = resolveCraftName(element);
      if (name && resolver[name]) resolvedElement = resolver[name];
    }
  }
  const topRootKept = pickKeptRoot(root);
  const cn = (typeof className === "string" ? className : "").trim();
  const raw = (
    <Element
      canvas
      is={resolvedElement}
      canDelete={true}
      canEditName={true}
      {...{
        ...rest,
        ...(cn ? { className: cn } : {}),
        ...(Object.keys(topRootKept).length > 0 ? { root: topRootKept } : {}),
      }}
    />
  );
  return resolver ? normalizeElementRefs(raw, resolver) : raw;
}

/** Insert a toolbox preset into or after the given node (context menu / one-click insert).
 *  If the target is a canvas (droppable container), inserts inside it as the last child.
 *  Otherwise inserts as a sibling after the target. */
export function insertToolboxPresetAfterNode(
  query: any,
  actions: any,
  targetNodeId: string,
  toolProps: { element: any; className?: string; root?: any; [key: string]: any }
) {
  const tool = buildToolboxCanvasElement(query, toolProps);
  const targetNode = query.node(targetNodeId).get();
  const isCanvas = targetNode?.data?.isCanvas;

  if (isCanvas) {
    const childCount = targetNode.data.nodes?.length ?? 0;
    AddElement({
      element: tool,
      actions,
      query,
      addTo: targetNodeId,
      index: childCount,
    });
  } else {
    AddElement({
      element: tool,
      actions,
      query,
      selected: targetNodeId,
      position: "after",
    });
  }
}

export const AddElement = ({
  element,
  actions,
  query,
  index = 1,
  addTo = null,
  selected = null,
  position = "",
}) => {
  if (!element) return;

  let active: string;
  if (selected && !["afterParent", "beforeParent"].includes(position)) {
    // Derive parent directly from the target node — do NOT use CraftJS selection state,
    // which may point to a different page when the canvas is isolated.
    const selectedNode = query.node(selected).get();
    active = selectedNode?.data?.parent || ROOT_NODE;
  } else {
    active = query.getEvent("selected").first() || ROOT_NODE;
    if (["afterParent", "beforeParent"].includes(position) && active !== ROOT_NODE) {
      const node = query.node(active).get();
      active = node.data.parent;
    }
  }

  const activeNode = query.node(active).get();
  if (!activeNode) return false;

  if (selected) {
    index = activeNode.data.nodes.indexOf(selected);
    if (["after", "afterParent"].includes(position)) {
      index += 1;
    } else index -= 1;
  }

  try {
    const resolver = query.getOptions().resolver;
    const normalizedElement = resolver ? normalizeElementRefs(element, resolver) : element;
    const newElement = query.parseReactElement(normalizedElement).toNodeTree();

    const type = newElement?.nodes[newElement?.rootNodeId]?.data?.props?.type || "";

    if (type === "page") {
      addTo = ROOT_NODE;
    }

    const addToNode = addTo ? query.node(addTo).get() : activeNode;
    if (!addToNode) return false;

    if (!addToNode.rules.canMoveIn([newElement?.nodes[newElement?.rootNodeId]])) {
      sdkLog.error("Cant move in.", addToNode, newElement);
      return false;
    }

    const targetParentId = addTo || activeNode.id;
    // Batch insert + smart morph into one undo step.
    const batch = createMergedActions(actions);
    batch.addNodeTree(newElement, targetParentId, index);

    const newNodeId = newElement?.rootNodeId;
    if (newNodeId) {
      applySmartDefaultsForNewNode(batch, query, newNodeId, targetParentId, {
        insertedTree: newElement,
      });
    }

    return newElement;
  } catch (e) {
    sdkLog.error(e);
  }

  return false;
};

export const ToolboxItemDisplay = ({ icon: Icon, label, isDragging = false }) => (
  <div
    className={`border-base-300 bg-base-200 text-base-content hover:bg-accent pointer-events-auto mx-auto h-full w-full max-w-24 cursor-grab rounded-lg border active:cursor-grabbing ${isDragging ? "border-accent bg-accent text-accent-content" : ""}`}
  >
    <div className="pointer-events-none flex h-full min-h-[60px] w-full flex-col items-center gap-1.5 px-1 pt-3 pb-2 transition-colors">
      <Icon className="text-base-content shrink-0 text-2xl" />
      <div className="flex flex-1 items-center justify-center">
        <span className="text-base-content text-center text-[10px]">{label}</span>
      </div>
    </div>
  </div>
);

export const RenderToolComponent = ({
  element,
  className = "",
  renderer = null,
  display = null,
  description = undefined,
  ...incoming
}) => {
  const { root, ...rest } = incoming || {};
  const { actions, query } = useEditor();
  const {
    enabled,
    connectors: { create },
  } = useEditor(state => ({
    enabled: state.options.enabled,
  }));

  const selectedNode = useAtomValue(SelectedNodeAtom);
  const [isDragging, setIsDragging] = useState(false);

  const tool = useMemo(
    () => buildToolboxCanvasElement(query, { element, className, root, ...rest }),
    [element, query, className, root, rest]
  );

  const displayWithProps =
    display && isValidElement(display) ? cloneElement(display, { isDragging } as any) : display;

  return (
    <ToolboxInsertHintTooltip description={description}>
      <div
        className="h-full w-full cursor-grab active:cursor-grabbing"
        ref={(ref: any) => create(ref, tool)}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onDoubleClick={() => {
          AddElement({
            element: tool,
            actions,
            query,
            selected: selectedNode.id,
            position: selectedNode.position,
          });
        }}
      >
        {renderer || (
          <div className="flex h-full w-full items-stretch justify-center">{displayWithProps}</div>
        )}
      </div>
    </ToolboxInsertHintTooltip>
  );
};
