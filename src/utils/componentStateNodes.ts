import { ROOT_NODE } from "@craftjs/utils";

/**
 * State-node detection for the component canvas.
 *
 * In canvas isolation mode the editor surfaces each "interaction state"
 * subtree of the isolated component as its own canvas card — Modal panels,
 * Dropdown panels, Tabs panes — alongside the master card. This module finds
 * those state nodes by reverse-indexing show-hide / open-modal action targets
 * within the isolated subtree, plus any node carrying `props.tabGroup`.
 *
 * Out of scope for v1: Accordion (`<details>` is a different model — multi-
 * open, browser-driven), nested components (we stop the walk at any other
 * `type === "component"` boundary), and cross-component show-hide
 * (target must live INSIDE the isolated subtree to count).
 */

const WALK_NODE_CAP = 500;

/** React component displayNames that show up on the canvas as "inherent
 *  components" — surfaces interactive widgets anywhere in the page as cards
 *  without needing to wrap them in a `type === "component"` Container. */
export const INHERENT_COMPONENT_DISPLAYNAMES = new Set<string>([
  "Modal",
  "Dropdown",
  "Tabs",
  "Accordion",
]);

export type StateNodeKind = "modal" | "show-hide" | "tab" | "css-hidden";

export interface StateNodeRef {
  nodeId: string;
  kind: StateNodeKind;
  /** First trigger that pointed at this state node (for show-hide / modal). */
  triggerNodeId?: string;
}

/**
 * Walk the entire CraftJS tree from ROOT and return every node whose
 * displayName is in {@link INHERENT_COMPONENT_DISPLAYNAMES} — Modal,
 * Dropdown, Tabs, Accordion. These are surfaced as canvas cards alongside
 * user-created `type === "component"` Containers so the user doesn't have
 * to wrap each interactive widget in a component to design its states.
 *
 * Skips:
 *  - nodes inside `type === "component"` containers (already covered by
 *    that component's master/state cards),
 *  - nodes inside other inherent components (a Dropdown inside a Modal is
 *    surfaced via the Modal's state cards, not as its own list-mode card).
 */
export function findInherentComponentNodes(query: any): string[] {
  const result: string[] = [];
  let walked = 0;
  const stack: { id: string; insideContainer: boolean }[] = [];
  try {
    const root = query.node(ROOT_NODE).get();
    for (const cid of root?.data?.nodes ?? []) {
      stack.push({ id: cid, insideContainer: false });
    }
  } catch {
    return [];
  }
  while (stack.length > 0) {
    if (++walked > 5000) {
      console.warn("[findInherentComponentNodes] tree walk cap exceeded");
      break;
    }
    const { id, insideContainer } = stack.pop()!;
    let node: any;
    try {
      node = query.node(id).get();
    } catch {
      continue;
    }
    if (!node) continue;
    const displayName: string = node.data?.displayName || "";
    const propsType = node.data?.props?.type;

    // Don't surface inherent components nested inside a real component
    // container — those are part of that component's design surface already.
    const isInsideContainer = insideContainer || propsType === "component";

    if (
      !isInsideContainer &&
      INHERENT_COMPONENT_DISPLAYNAMES.has(displayName)
    ) {
      result.push(id);
      // Don't descend into an inherent component — its inner state nodes
      // are surfaced via state cards when it's isolated, not as their own
      // list-mode cards.
      continue;
    }

    for (const cid of node.data?.nodes ?? []) {
      stack.push({ id: cid, insideContainer: isInsideContainer });
    }
  }
  return result;
}

/** BFS from componentRootId, collect every descendant node id that is itself
 *  a state subtree. Stops at nested `type === "component"` boundaries. */
export function findStateNodes(
  componentRootId: string,
  query: any,
): StateNodeRef[] {
  // First pass: collect descendant ids (skipping nested components).
  const descendantIds: string[] = [];
  const queue: string[] = [];
  try {
    const root = query.node(componentRootId).get();
    if (!root) return [];
    for (const cid of root.data.nodes ?? []) queue.push(cid);
  } catch {
    return [];
  }

  let walked = 0;
  while (queue.length > 0) {
    if (++walked > WALK_NODE_CAP) {
      console.warn(
        `[findStateNodes] walk cap (${WALK_NODE_CAP}) exceeded for ${componentRootId}`,
      );
      break;
    }
    const id = queue.shift()!;
    let node: any;
    try {
      node = query.node(id).get();
    } catch {
      continue;
    }
    if (!node) continue;
    // Stop at nested component boundaries — those have their own state cards.
    if (node.data?.props?.type === "component") continue;
    descendantIds.push(id);
    for (const cid of node.data?.nodes ?? []) queue.push(cid);
  }

  // Second pass: build idOrAnchor → nodeId index across collected descendants.
  const idIndex = new Map<string, string>();
  for (const id of descendantIds) {
    const node = query.node(id).get();
    const props = node?.data?.props ?? {};
    if (typeof props.id === "string" && props.id.length > 0) {
      idIndex.set(props.id, id);
    }
    if (typeof props.anchor === "string" && props.anchor.length > 0) {
      idIndex.set(props.anchor, id);
    }
  }

  // Third pass: scan for action references and tabGroup membership.
  const seen = new Map<string, StateNodeRef>();

  for (const id of descendantIds) {
    const node = query.node(id).get();
    const props = node?.data?.props ?? {};

    // Action-driven states (show-hide, open-modal).
    const action = props.action;
    if (action && typeof action === "object") {
      if (action.type === "show-hide" && typeof action.target === "string") {
        const targetId = idIndex.get(action.target);
        if (targetId && targetId !== id && !seen.has(targetId)) {
          seen.set(targetId, {
            nodeId: targetId,
            kind: "show-hide",
            triggerNodeId: id,
          });
        }
      } else if (action.type === "open-modal" && typeof action.anchor === "string") {
        const targetId = idIndex.get(action.anchor);
        if (targetId && targetId !== id && !seen.has(targetId)) {
          seen.set(targetId, {
            nodeId: targetId,
            kind: "modal",
            triggerNodeId: id,
          });
        }
      }
    }

    // Tab panels — `props.tabGroup` is the durable signal (Tabs.tsx strips
    // the `hidden` className at runtime in editor mode, so className is not
    // reliable). Each tab pane becomes its own card.
    if (typeof props.tabGroup === "string" && props.tabGroup.length > 0) {
      if (!seen.has(id)) {
        seen.set(id, { nodeId: id, kind: "tab" });
      }
    }

    // CSS-only hidden subtrees — Dropdown panels (`hidden group-focus-within:
    // flex`), accordion details bodies, anything authored as "starts hidden,
    // shown by interaction" without an action wire. Tokenized match on
    // `hidden` so `hidden` alone counts and substrings like `hidden-md` don't.
    if (typeof props.className === "string") {
      const tokens = props.className.split(/\s+/);
      if (tokens.indexOf("hidden") >= 0 && !seen.has(id)) {
        seen.set(id, { nodeId: id, kind: "css-hidden" });
      }
    }
  }

  // Order tabs after modal/show-hide hits (in detection order). Among tabs,
  // sort by parent's child index so they appear in tab-strip order.
  const refs = [...seen.values()];
  const tabOrder = new Map<string, number>();
  for (const r of refs) {
    if (r.kind !== "tab") continue;
    try {
      const node = query.node(r.nodeId).get();
      const parentId = node?.data?.parent;
      if (!parentId) continue;
      const parent = query.node(parentId).get();
      const idx = parent?.data?.nodes?.indexOf(r.nodeId) ?? 0;
      tabOrder.set(r.nodeId, idx);
    } catch {
      // ignore
    }
  }
  refs.sort((a, b) => {
    if (a.kind === "tab" && b.kind === "tab") {
      return (tabOrder.get(a.nodeId) ?? 0) - (tabOrder.get(b.nodeId) ?? 0);
    }
    if (a.kind === "tab") return 1;
    if (b.kind === "tab") return -1;
    return 0;
  });
  return refs;
}
