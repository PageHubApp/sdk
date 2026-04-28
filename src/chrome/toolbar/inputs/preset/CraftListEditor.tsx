import { useEditor } from "@craftjs/core";
import { useAtomInstance } from "@zedux/react";
import React from "react";
import { TbEdit } from "react-icons/tb";
import { BatchOperationAtom } from "@/utils/atoms";
import { PAGEHUB_RTT_GLOBAL_ID } from "../../../primitives/layout/tooltipSurface";
import { ListEditor } from "./ListEditor";

/**
 * CraftListEditor — high-level list editor for CraftJS child nodes.
 *
 * Every consumer (Button list, Nav links, Image list, Map points, Table rows,
 * Table cells) wraps `ListEditor` and re-implements the same five things:
 *
 *   1. Filter `data.nodes` by `name` (+ per-consumer extra filter).
 *   2. Delete via `actions.delete`.
 *   3. Add via `BatchOperationAtom` + `addNodeTree` + `setActiveIndex`.
 *   4. Reorder via `actions.move(id, parent, parentNodesIndex)` translating
 *      visible-list indexes to the parent's full `data.nodes` indexes.
 *   5. An "edit" pencil that calls `actions.selectNode`.
 *
 * This component owns all five so each MainTab only declares what's specific
 * to its node type: the type name, optional filter, label mapper, add factory,
 * and the inline detail body.
 */

interface BaseCraftItem {
  id: string;
}

interface AddHelpers {
  parentId: string;
  query: any;
  actions: any;
  /** Standard add: `parseReactElement` + `addNodeTree` + select the new last item. */
  addNode: (element: React.ReactElement) => string | undefined;
}

interface Props<T extends BaseCraftItem> {
  /** CraftJS parent node id whose children we're editing. */
  parentId: string;
  /**
   * `childNode.data.name` must equal this string for the child to be listed.
   * Omit to skip the name filter and list every child (preset wrappers whose
   * children may be heterogeneous types).
   */
  childTypeName?: string;
  /** Optional secondary filter (e.g. exclude hamburger Buttons). Receives the raw craft node. */
  filterChild?: (childNode: any) => boolean;
  /** Map a child craft node to the renderable item shape. `id` is added automatically. */
  mapItem: (childNode: any, id: string, index: number) => Omit<T, "id">;

  activeIndex: any;
  setActiveIndex: (v: number | null) => void;

  addLabel: string;
  /** Defaults to `addNode(defaultElement)`. Override for custom add flows (e.g. peer-inherit). */
  onAdd: (helpers: AddHelpers) => void;

  renderLabel: (item: T, index: number) => React.ReactNode;
  renderPopover: (item: T, index: number) => React.ReactNode;

  /** Defaults to `Edit ${childTypeName.toLowerCase()}`. Pass `null` to hide the pencil. */
  editTooltip?: string | null;
}

export function CraftListEditor<T extends BaseCraftItem>({
  parentId,
  childTypeName,
  filterChild,
  mapItem,
  activeIndex,
  setActiveIndex,
  addLabel,
  onAdd,
  renderLabel,
  renderPopover,
  editTooltip,
}: Props<T>) {
  const { actions, query } = useEditor();
  const batchOp = useAtomInstance(BatchOperationAtom);

  const { items } = useEditor((_, q) => {
    try {
      const node = q.node(parentId).get();
      const list = (node.data.nodes ?? [])
        .map((childId: string, idx: number) => {
          try {
            const childNode = q.node(childId).get();
            if (childTypeName && childNode.data.name !== childTypeName) return null;
            if (filterChild && !filterChild(childNode)) return null;
            return { id: childId, ...mapItem(childNode, childId, idx) } as T;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as T[];
      return { items: list };
    } catch {
      return { items: [] as T[] };
    }
  });

  const addNode = (element: React.ReactElement): string | undefined => {
    batchOp.setState(true);
    const tree = query.parseReactElement(element).toNodeTree();
    actions.addNodeTree(tree, parentId);
    setActiveIndex(items.length);
    requestAnimationFrame(() => batchOp.setState(false));
    return tree?.rootNodeId;
  };

  const editLabel =
    editTooltip === null
      ? null
      : (editTooltip ?? `Edit ${childTypeName?.toLowerCase() ?? "item"}`);

  return (
    <ListEditor
      items={items}
      activeIndex={activeIndex}
      setActiveIndex={setActiveIndex}
      addLabel={addLabel}
      renderLabel={renderLabel}
      renderPopover={renderPopover}
      onDelete={item => actions.delete(item.id)}
      onAdd={() => onAdd({ parentId, query, actions, addNode })}
      onReorder={(from, to) => {
        const list = items;
        const target = list[from];
        if (!target) return;
        // Visible-list indexes → parent.data.nodes index. The parent may hold
        // siblings that this list filters out (e.g. hamburger buttons), so we
        // map by id rather than trusting `from` / `to` directly.
        const parentNodes = query.node(parentId).get().data.nodes ?? [];
        const targetIndex =
          to >= list.length - 1
            ? parentNodes.indexOf(list[list.length - 1].id) + 1
            : parentNodes.indexOf(list[to].id);
        if (targetIndex < 0) return;
        actions.move(target.id, parentId, targetIndex);
        setActiveIndex(to);
      }}
      extraButtons={
        editLabel
          ? item => [
              <button
                key="edit"
                type="button"
                className="text-base-content hover:text-primary flex items-center justify-center transition-colors"
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content={editLabel}
                onClick={() => actions.selectNode(item.id)}
                aria-label={editLabel}
              >
                <TbEdit className="h-3.5 w-3.5" />
              </button>,
            ]
          : undefined
      }
    />
  );
}
