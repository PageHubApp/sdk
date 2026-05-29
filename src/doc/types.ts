/**
 * Unified document model — typed wrapper over CraftJS state used by both
 * the live editor (avocado-editor, future host adapters) and the static
 * server-side mutators (mcp-core handlers).
 *
 * Two backends, one surface:
 *   - `createLiveDoc({ query, actions })` — drives the editor at runtime
 *   - `createStaticDoc(flat)` — mutates a serialized node map in place
 *
 * Hosts code against `Doc` / `NodeRef`; they never touch raw `getNodes()` /
 * `setProp(id, draft => ...)` again.
 */

/** Component name (e.g. "Container", "Text", "AvocadoHero"). */
export type ComponentTypeName = string;

/** Frozen view of one node's stored data. */
export interface NodeData {
  /** Component name — the toolbox key that produced this node. */
  type: ComponentTypeName;
  /** Whether this node accepts children (CraftJS Canvas semantics). */
  isCanvas: boolean;
  /** Author-controlled props (settings-panel inputs land here). */
  props: Readonly<Record<string, unknown>>;
  /** Internal metadata (displayName, source pointer, host-block-id, etc.). */
  custom: Readonly<Record<string, unknown>>;
  /** Layers / breadcrumb label override. */
  displayName?: string;
  /** Whether the node is hidden from view. */
  hidden: boolean;
}

/**
 * Reference to one node in the document. Acts as a typed cursor — methods
 * stay valid even if the underlying state replaces objects.
 */
export interface NodeRef {
  readonly id: string;
  /** Frozen snapshot of the node's data at call time. */
  readonly data: NodeData;
  /** Parent ref, or `null` for ROOT. */
  parent(): NodeRef | null;
  /** Direct children in order. */
  children(): NodeRef[];
  /** Ancestors, nearest first (excludes self). */
  ancestors(): NodeRef[];
  /** All descendants, depth-first (excludes self). */
  descendants(): NodeRef[];
  /** Shallow-merge a partial props patch. */
  patchProps(patch: Record<string, unknown>): void;
  /** Replace props entirely. */
  setProps(props: Record<string, unknown>): void;
  /** Shallow-merge a partial custom-metadata patch. */
  setCustom(patch: Record<string, unknown>): void;
  /** Remove this node and its descendants. */
  delete(): void;
  /** Relocate this node to a new target (kept identity / id). */
  move(target: InsertTarget): void;
  /** Deep-copy this node (with new ids) and insert at the target. Returns the new root ref. */
  duplicate(target?: InsertTarget): NodeRef;
}

/** Insert-position specifier — pick one shape. */
export type InsertTarget =
  | { parent: string; index?: number }
  | { after: string }
  | { before: string };

/** Recursive node-creation payload. Children supply nested NodeInputs. */
export interface NodeInput {
  /** Optional id; auto-generated when omitted. */
  id?: string;
  type: ComponentTypeName;
  /** Defaults to `false` (leaf) unless overridden. */
  isCanvas?: boolean;
  props?: Record<string, unknown>;
  custom?: Record<string, unknown>;
  displayName?: string;
  hidden?: boolean;
  children?: NodeInput[];
}

export interface Doc {
  /** ROOT node ref — always present once the doc is initialised. */
  root(): NodeRef;
  /** Lookup by id; `null` if absent. */
  node(id: string): NodeRef | null;
  /** First node whose `props[key] === value`. */
  findByProp(key: string, value: unknown): NodeRef | null;
  /** First node whose `custom[key] === value`. */
  findByCustom(key: string, value: unknown): NodeRef | null;
  /** All nodes of the given component type. */
  filterByType(type: ComponentTypeName): NodeRef[];
  /** Predicate-based search across all nodes. */
  filter(predicate: (node: NodeRef) => boolean): NodeRef[];
  /** Create + insert a fresh subtree. Returns ref to the new root. */
  insert(input: NodeInput, target: InsertTarget): NodeRef;
  /** All node ids currently in the doc. */
  ids(): string[];
}
