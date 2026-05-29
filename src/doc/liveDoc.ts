/**
 * Live document backend — wraps a CraftJS `query` + `actions` pair to
 * expose the unified `Doc` / `NodeRef` interface. Used by editor host
 * adapters (avocado-editor, future ones) so they never reach into
 * `query.getNodes()` / `actions.setProp(id, draft => ...)` directly.
 *
 * The `CraftQuery` / `CraftActions` types are intentionally loose — the
 * real shapes come from `@craftjs/core` and we don't want to bake a hard
 * peer dependency here.
 */

import type {
  Doc,
  InsertTarget,
  NodeData,
  NodeInput,
  NodeRef,
} from "./types";

/** Minimal subset of CraftJS `query` we rely on. */
export interface CraftQuery {
  getNodes(): Record<string, any>;
  node(id: string): { get(): any };
  parseSerializedNode(serialized: any): {
    toNode(callback?: (node: any) => void): any;
  };
}

/** Minimal subset of CraftJS `actions` we rely on. */
export interface CraftActions {
  setProp(nodeId: string, mutator: (props: Record<string, unknown>) => void): void;
  setCustom(nodeId: string, mutator: (custom: Record<string, unknown>) => void): void;
  delete(nodeId: string): void;
  move(nodeId: string, parentId: string, index: number): void;
  addNodeTree(
    tree: { rootNodeId: string; nodes: Record<string, any> },
    parentId: string,
    index?: number,
  ): void;
}

const ROOT_ID = "ROOT";

function nextId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function freezeData(node: any): NodeData {
  return Object.freeze({
    type: node?.data?.type?.resolvedName,
    isCanvas: !!node?.data?.isCanvas,
    props: Object.freeze({ ...(node?.data?.props ?? {}) }),
    custom: Object.freeze({ ...(node?.data?.custom ?? {}) }),
    displayName: node?.data?.displayName,
    hidden: !!node?.data?.hidden,
  });
}

function resolveTargetParentIndex(
  query: CraftQuery,
  target: InsertTarget,
): { parent: string; index: number } {
  if ("parent" in target) {
    const parentNode = query.node(target.parent).get();
    const siblings = parentNode?.data?.nodes ?? [];
    return { parent: target.parent, index: target.index ?? siblings.length };
  }
  if ("after" in target) {
    const anchorNode = query.node(target.after).get();
    const parentId = anchorNode?.data?.parent;
    if (!parentId) throw new Error(`insert: anchor "${target.after}" has no parent`);
    const siblings = query.node(parentId).get()?.data?.nodes ?? [];
    const idx = siblings.indexOf(target.after);
    return { parent: parentId, index: idx >= 0 ? idx + 1 : siblings.length };
  }
  // before
  const anchorNode = query.node(target.before).get();
  const parentId = anchorNode?.data?.parent;
  if (!parentId) throw new Error(`insert: anchor "${target.before}" has no parent`);
  const siblings = query.node(parentId).get()?.data?.nodes ?? [];
  const idx = siblings.indexOf(target.before);
  return { parent: parentId, index: idx >= 0 ? idx : 0 };
}

/** Convert NodeInput → serialized CraftJS shape, recursively. */
function inputToSerialized(input: NodeInput, parentId: string): {
  id: string;
  nodes: Record<string, any>;
  childIds: string[];
} {
  const id = input.id ?? nextId("n");
  const accum: Record<string, any> = {};
  const childIds: string[] = [];
  for (const child of input.children ?? []) {
    const built = inputToSerialized(child, id);
    childIds.push(built.id);
    Object.assign(accum, built.nodes);
  }
  accum[id] = {
    type: { resolvedName: input.type },
    isCanvas: input.isCanvas ?? false,
    props: { ...(input.props ?? {}) },
    custom: { ...(input.custom ?? {}) },
    displayName: input.displayName ?? input.type,
    parent: parentId,
    hidden: !!input.hidden,
    nodes: childIds,
    linkedNodes: {},
  };
  return { id, nodes: accum, childIds };
}

function buildRef(query: CraftQuery, actions: CraftActions, id: string): NodeRef {
  const ref: NodeRef = {
    id,
    get data() {
      const node = query.node(id).get();
      if (!node) throw new Error(`Node "${id}" no longer exists`);
      return freezeData(node);
    },
    parent() {
      const parentId = query.node(id).get()?.data?.parent;
      return parentId ? buildRef(query, actions, parentId) : null;
    },
    children() {
      const kids = query.node(id).get()?.data?.nodes ?? [];
      return kids.map((cid: string) => buildRef(query, actions, cid));
    },
    ancestors() {
      const out: NodeRef[] = [];
      let cursor = query.node(id).get()?.data?.parent;
      while (cursor) {
        out.push(buildRef(query, actions, cursor));
        cursor = query.node(cursor).get()?.data?.parent;
      }
      return out;
    },
    descendants() {
      const out: NodeRef[] = [];
      const walk = (currentId: string) => {
        const kids = query.node(currentId).get()?.data?.nodes ?? [];
        for (const cid of kids) {
          out.push(buildRef(query, actions, cid));
          walk(cid);
        }
      };
      walk(id);
      return out;
    },
    patchProps(patch) {
      actions.setProp(id, (props) => {
        Object.assign(props, patch);
      });
    },
    setProps(props) {
      actions.setProp(id, (existing) => {
        for (const key of Object.keys(existing)) delete (existing as any)[key];
        Object.assign(existing, props);
      });
    },
    setCustom(patch) {
      actions.setCustom(id, (custom) => {
        Object.assign(custom, patch);
      });
    },
    delete() {
      actions.delete(id);
    },
    move(target) {
      const { parent, index } = resolveTargetParentIndex(query, target);
      actions.move(id, parent, index);
    },
    duplicate(target) {
      const src = query.node(id).get();
      if (!src) throw new Error(`Node "${id}" not found`);
      const inputTarget: InsertTarget = target ?? { after: id };
      const { parent, index } = resolveTargetParentIndex(query, inputTarget);
      const cloneInput = serializeNodeForClone(query, id);
      const built = inputToSerialized(cloneInput, parent);
      const nodesObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(built.nodes)) {
        nodesObj[k] = query.parseSerializedNode(v).toNode((n: any) => {
          n.id = k;
        });
      }
      actions.addNodeTree({ rootNodeId: built.id, nodes: nodesObj }, parent, index);
      return buildRef(query, actions, built.id);
    },
  };
  return ref;
}

function serializeNodeForClone(query: CraftQuery, nodeId: string): NodeInput {
  const node = query.node(nodeId).get();
  if (!node) throw new Error(`Node "${nodeId}" not found`);
  const childIds: string[] = node.data?.nodes ?? [];
  return {
    type: node.data.type.resolvedName,
    isCanvas: !!node.data.isCanvas,
    props: { ...(node.data.props ?? {}) },
    custom: { ...(node.data.custom ?? {}) },
    displayName: node.data.displayName,
    hidden: !!node.data.hidden,
    children: childIds.map((cid: string) => serializeNodeForClone(query, cid)),
  };
}

/**
 * Wrap a CraftJS `{ query, actions }` pair in the unified `Doc` interface.
 * Read methods reflect live state (cursor-style refs); writes go through
 * `actions` so the editor receives notifications.
 */
export function createLiveDoc(craft: {
  query: CraftQuery;
  actions: CraftActions;
}): Doc {
  const { query, actions } = craft;
  return {
    root() {
      return buildRef(query, actions, ROOT_ID);
    },
    node(id) {
      const exists = !!query.node(id).get();
      return exists ? buildRef(query, actions, id) : null;
    },
    findByProp(key, value) {
      const all = query.getNodes();
      for (const id of Object.keys(all)) {
        if (all[id]?.data?.props?.[key] === value) return buildRef(query, actions, id);
      }
      return null;
    },
    findByCustom(key, value) {
      const all = query.getNodes();
      for (const id of Object.keys(all)) {
        if (all[id]?.data?.custom?.[key] === value) return buildRef(query, actions, id);
      }
      return null;
    },
    filterByType(type) {
      const all = query.getNodes();
      const out: NodeRef[] = [];
      for (const id of Object.keys(all)) {
        if (all[id]?.data?.type?.resolvedName === type) out.push(buildRef(query, actions, id));
      }
      return out;
    },
    filter(predicate) {
      const all = query.getNodes();
      const out: NodeRef[] = [];
      for (const id of Object.keys(all)) {
        const ref = buildRef(query, actions, id);
        if (predicate(ref)) out.push(ref);
      }
      return out;
    },
    insert(input, target) {
      const { parent, index } = resolveTargetParentIndex(query, target);
      const built = inputToSerialized(input, parent);
      const nodesObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(built.nodes)) {
        nodesObj[k] = query.parseSerializedNode(v).toNode((n: any) => {
          n.id = k;
        });
      }
      actions.addNodeTree({ rootNodeId: built.id, nodes: nodesObj }, parent, index);
      return buildRef(query, actions, built.id);
    },
    ids() {
      return Object.keys(query.getNodes());
    },
  };
}
