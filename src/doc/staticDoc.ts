/**
 * Static document backend — operates by direct mutation of a serialized
 * CraftJS node map (`{ nodeId: { type, props, ..., nodes, linkedNodes } }`).
 *
 * Used by mcp-core handlers and any other server-side / non-React code path
 * that holds the doc as plain JSON. Zero React / @craftjs/core deps.
 */

import type {
  Doc,
  InsertTarget,
  NodeData,
  NodeInput,
  NodeRef,
} from "./types";

/** The serialized shape of a single CraftJS node in the flat map. */
interface StaticNode {
  type: { resolvedName: string };
  isCanvas?: boolean;
  props: Record<string, unknown>;
  custom?: Record<string, unknown>;
  displayName?: string;
  parent: string | null;
  hidden?: boolean;
  nodes?: string[];
  linkedNodes?: Record<string, string>;
}

/** Flat-map shape — keys are node ids, values are serialized nodes. */
export type FlatNodeMap = Record<string, StaticNode>;

const ROOT_ID = "ROOT";

function freezeData(node: StaticNode): NodeData {
  return Object.freeze({
    type: node.type?.resolvedName,
    isCanvas: !!node.isCanvas,
    props: Object.freeze({ ...(node.props ?? {}) }),
    custom: Object.freeze({ ...(node.custom ?? {}) }),
    displayName: node.displayName,
    hidden: !!node.hidden,
  });
}

function nextId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function resolveTargetParentIndex(
  flat: FlatNodeMap,
  target: InsertTarget,
): { parent: string; index: number } {
  if ("parent" in target) {
    const parent = target.parent;
    const siblings = flat[parent]?.nodes ?? [];
    const index = target.index ?? siblings.length;
    return { parent, index };
  }
  if ("after" in target) {
    const anchor = flat[target.after];
    if (!anchor?.parent) throw new Error(`insert: anchor "${target.after}" has no parent`);
    const siblings = flat[anchor.parent]?.nodes ?? [];
    const idx = siblings.indexOf(target.after);
    return { parent: anchor.parent, index: idx >= 0 ? idx + 1 : siblings.length };
  }
  // before
  const anchor = flat[target.before];
  if (!anchor?.parent) throw new Error(`insert: anchor "${target.before}" has no parent`);
  const siblings = flat[anchor.parent]?.nodes ?? [];
  const idx = siblings.indexOf(target.before);
  return { parent: anchor.parent, index: idx >= 0 ? idx : 0 };
}

/** Materialise a NodeInput (with possibly nested children) into the flat map. Returns the new root id. */
function materialize(flat: FlatNodeMap, input: NodeInput, parentId: string): string {
  const id = input.id ?? nextId("n");
  const childIds: string[] = [];
  flat[id] = {
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
  for (const child of input.children ?? []) {
    childIds.push(materialize(flat, child, id));
  }
  return id;
}

function cascadeDelete(flat: FlatNodeMap, nodeId: string): void {
  const node = flat[nodeId];
  if (!node) return;
  for (const childId of [...(node.nodes ?? [])]) cascadeDelete(flat, childId);
  delete flat[nodeId];
}

function buildRef(flat: FlatNodeMap, id: string): NodeRef {
  const ref: NodeRef = {
    id,
    get data() {
      const node = flat[id];
      if (!node) throw new Error(`Node "${id}" no longer exists`);
      return freezeData(node);
    },
    parent() {
      const parentId = flat[id]?.parent;
      return parentId ? buildRef(flat, parentId) : null;
    },
    children() {
      return (flat[id]?.nodes ?? []).map((childId) => buildRef(flat, childId));
    },
    ancestors() {
      const out: NodeRef[] = [];
      let cursor = flat[id]?.parent;
      while (cursor) {
        out.push(buildRef(flat, cursor));
        cursor = flat[cursor]?.parent;
      }
      return out;
    },
    descendants() {
      const out: NodeRef[] = [];
      const walk = (currentId: string) => {
        const node = flat[currentId];
        if (!node) return;
        for (const childId of node.nodes ?? []) {
          out.push(buildRef(flat, childId));
          walk(childId);
        }
      };
      walk(id);
      return out;
    },
    patchProps(patch) {
      const node = flat[id];
      if (!node) throw new Error(`Node "${id}" not found`);
      node.props = { ...node.props, ...patch };
    },
    setProps(props) {
      const node = flat[id];
      if (!node) throw new Error(`Node "${id}" not found`);
      node.props = { ...props };
    },
    setCustom(patch) {
      const node = flat[id];
      if (!node) throw new Error(`Node "${id}" not found`);
      node.custom = { ...(node.custom ?? {}), ...patch };
    },
    delete() {
      const node = flat[id];
      if (!node) return;
      const parentId = node.parent;
      if (parentId && flat[parentId]) {
        flat[parentId].nodes = (flat[parentId].nodes ?? []).filter((cid) => cid !== id);
      }
      cascadeDelete(flat, id);
    },
    move(target) {
      const node = flat[id];
      if (!node) throw new Error(`Node "${id}" not found`);
      // Remove from old parent's nodes
      const oldParentId = node.parent;
      if (oldParentId && flat[oldParentId]) {
        flat[oldParentId].nodes = (flat[oldParentId].nodes ?? []).filter((cid) => cid !== id);
      }
      const { parent, index } = resolveTargetParentIndex(flat, target);
      if (!flat[parent]) throw new Error(`move: parent "${parent}" not found`);
      node.parent = parent;
      const siblings = flat[parent].nodes ?? (flat[parent].nodes = []);
      siblings.splice(index, 0, id);
    },
    duplicate(target) {
      const src = flat[id];
      if (!src) throw new Error(`Node "${id}" not found`);
      const inputTarget: InsertTarget = target ?? { after: id };
      const { parent, index } = resolveTargetParentIndex(flat, inputTarget);
      const cloneInput = serializeForClone(flat, id);
      const newId = materialize(flat, cloneInput, parent);
      const siblings = flat[parent].nodes ?? (flat[parent].nodes = []);
      // materialize appended to end; relocate to requested index
      const appendedIdx = siblings.indexOf(newId);
      if (appendedIdx >= 0 && appendedIdx !== index) {
        siblings.splice(appendedIdx, 1);
        siblings.splice(index, 0, newId);
      }
      return buildRef(flat, newId);
    },
  };
  return ref;
}

/** Recursively dump a node's subtree back into NodeInput form (used by duplicate). */
function serializeForClone(flat: FlatNodeMap, nodeId: string): NodeInput {
  const node = flat[nodeId];
  if (!node) throw new Error(`Node "${nodeId}" not found`);
  return {
    type: node.type.resolvedName,
    isCanvas: node.isCanvas,
    props: { ...node.props },
    custom: { ...(node.custom ?? {}) },
    displayName: node.displayName,
    hidden: node.hidden,
    children: (node.nodes ?? []).map((cid) => serializeForClone(flat, cid)),
  };
}

/**
 * Wrap a flat CraftJS node map in the unified `Doc` interface. The passed
 * map is mutated in place — callers can keep their reference and observe
 * changes directly. If the map has no ROOT, callers should seed one first.
 */
export function createStaticDoc(flat: FlatNodeMap): Doc {
  return {
    root() {
      if (!flat[ROOT_ID]) throw new Error("createStaticDoc: flat map is missing ROOT");
      return buildRef(flat, ROOT_ID);
    },
    node(id) {
      return flat[id] ? buildRef(flat, id) : null;
    },
    findByProp(key, value) {
      for (const id of Object.keys(flat)) {
        if (flat[id].props?.[key] === value) return buildRef(flat, id);
      }
      return null;
    },
    findByCustom(key, value) {
      for (const id of Object.keys(flat)) {
        if (flat[id].custom?.[key] === value) return buildRef(flat, id);
      }
      return null;
    },
    filterByType(type) {
      const out: NodeRef[] = [];
      for (const id of Object.keys(flat)) {
        if (flat[id].type?.resolvedName === type) out.push(buildRef(flat, id));
      }
      return out;
    },
    filter(predicate) {
      const out: NodeRef[] = [];
      for (const id of Object.keys(flat)) {
        const ref = buildRef(flat, id);
        if (predicate(ref)) out.push(ref);
      }
      return out;
    },
    insert(input, target) {
      const { parent, index } = resolveTargetParentIndex(flat, target);
      if (!flat[parent]) throw new Error(`insert: parent "${parent}" not found`);
      const newId = materialize(flat, input, parent);
      const siblings = flat[parent].nodes ?? (flat[parent].nodes = []);
      // materialize already pushed when handling children; root id was added during creation,
      // but not yet linked into parent.nodes — do that here at the requested index.
      const appendedIdx = siblings.indexOf(newId);
      if (appendedIdx >= 0) siblings.splice(appendedIdx, 1);
      siblings.splice(index, 0, newId);
      return buildRef(flat, newId);
    },
    ids() {
      return Object.keys(flat);
    },
  };
}
