/**
 * Server-side auth pruning — the security core of members-only content.
 *
 * Removes every node whose `auth` conditions definitively fail for the
 * visitor, together with its whole subtree, BEFORE the tree is serialized
 * into HTML, `__NEXT_DATA__` or an API response. Client-side visibility can
 * only hide what was sent; this makes sure gated content is never sent.
 *
 * Only `auth` is treated as known. Every other condition type (url-param,
 * device, item, state, …) is indeterminate here, so a node that might still
 * be shown by a client-side rule is kept — see `hasUnprovableAuthGate` for
 * the editor warning about that case.
 *
 * Pure: shared by both walkers and the app, never mutates its input.
 */
import type { SerializedNodes } from "../../render/static/types";
import type { AuthState } from "../design/variables";
import { evaluateConditionGroups, evaluateSingleCondition, hasConditionType } from "./evaluate";
import { buildStaticContext } from "./context";
import type { Condition, ConditionContext, ConditionGroup } from "./types";

export interface PruneAuthGatedResult {
  nodes: SerializedNodes;
  /** Nodes dropped from the map, descendants included. */
  removed: number;
  /** Page nodes (`props.type === "page"`) the visitor may not see. They stay
   *  in the map with their children removed so the route can apply the
   *  page's fail action. */
  pageDenied: string[];
}

const LOGGED_OUT: AuthState = { status: "logged-out", customer: null };

/** `auth` conditions evaluate normally; everything else is unknown. */
function authOnly(cond: Condition, ctx: ConditionContext): boolean | null {
  return cond?.type === "auth" ? evaluateSingleCondition(cond, ctx) : null;
}

/** Every `auth` condition fails; everything else is unknown. */
function authAlwaysFails(cond: Condition): boolean | null {
  return cond?.type === "auth" ? false : null;
}

function authGroups(node: SerializedNodes[string] | undefined): ConditionGroup[] | null {
  const groups = node?.props?.conditionGroups;
  return hasConditionType(groups, "auth") ? (groups as ConditionGroup[]) : null;
}

/**
 * True when the groups carry an `auth` condition that can never hide the node
 * on the server: some OR path (an `any` group, or another group) can be
 * satisfied by a client-only condition alone, so the node is always sent.
 * The editor warns on this.
 */
export function hasUnprovableAuthGate(groups: ConditionGroup[] | null | undefined): boolean {
  if (!hasConditionType(groups, "auth")) return false;
  const ctx = buildStaticContext(null);
  return evaluateConditionGroups(groups as ConditionGroup[], ctx, authAlwaysFails) !== false;
}

function childIds(node: SerializedNodes[string] | undefined): string[] {
  if (!node) return [];
  const ids = Array.isArray(node.nodes) ? [...node.nodes] : [];
  if (node.linkedNodes && typeof node.linkedNodes === "object") {
    ids.push(...Object.values(node.linkedNodes));
  }
  return ids;
}

function collectSubtree(nodes: SerializedNodes, rootId: string, into: Set<string>): void {
  const stack = [rootId];
  while (stack.length) {
    const id = stack.pop()!;
    if (into.has(id)) continue;
    into.add(id);
    for (const child of childIds(nodes[id])) if (nodes[child]) stack.push(child);
  }
}

function withoutChildren(
  node: SerializedNodes[string],
  drop: Set<string>
): SerializedNodes[string] {
  const kids = Array.isArray(node.nodes) ? node.nodes : [];
  const linked = node.linkedNodes && typeof node.linkedNodes === "object" ? node.linkedNodes : null;
  const keptKids = kids.filter(id => !drop.has(id));
  const linkedChanged = !!linked && Object.values(linked).some(id => drop.has(id));
  if (keptKids.length === kids.length && !linkedChanged) return node;
  const next = { ...node, nodes: keptKids };
  if (linked) {
    next.linkedNodes = Object.fromEntries(
      Object.entries(linked).filter(([, id]) => !drop.has(id))
    );
  }
  return next;
}

/**
 * Strip the nodes `auth` may not see. `auth: null` means no session and is
 * treated as logged out, so a caller that forgets to resolve auth fails
 * closed.
 */
export function pruneAuthGatedNodes(
  nodes: SerializedNodes,
  auth: AuthState | null
): PruneAuthGatedResult {
  const ctx: ConditionContext = { ...buildStaticContext(null), auth: auth ?? LOGGED_OUT };
  const drop = new Set<string>();
  const pageDenied: string[] = [];

  for (const [id, node] of Object.entries(nodes || {})) {
    if (drop.has(id)) continue;
    const groups = authGroups(node);
    if (!groups || evaluateConditionGroups(groups, ctx, authOnly) !== false) continue;
    // A denied page (or ROOT) keeps its node so the route can see it, but
    // none of its content.
    const keepShell = id === "ROOT" || node?.props?.type === "page";
    if (keepShell) {
      if (id !== "ROOT") pageDenied.push(id);
      for (const child of childIds(node)) if (nodes[child]) collectSubtree(nodes, child, drop);
    } else {
      collectSubtree(nodes, id, drop);
    }
  }

  if (drop.size === 0) return { nodes: { ...nodes }, removed: 0, pageDenied };

  const out: SerializedNodes = {};
  for (const [id, node] of Object.entries(nodes)) {
    if (drop.has(id)) continue;
    out[id] = withoutChildren(node, drop);
  }
  return { nodes: out, removed: drop.size, pageDenied: pageDenied.filter(id => !drop.has(id)) };
}
