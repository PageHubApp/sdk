/**
 * `{{anchor.<name>}}` and the chat widget, resolved once for the whole tree before any emitter runs.
 *
 * Live, a wrapper (`AgentFloatingBubble`, `AgentChat`, `CartDrawer`, `CheckoutBanner`) opens an anchor scope for its subtree
 * and descendants write `{{anchor.panel}}` in an `id`, an action `target`, a `state` condition key or a text binding. The
 * static walker resolves them per node as it descends (`resolvePropAnchors` in render/static/walker.ts). The source
 * emitters have no such scope, so a bare token reached the file as `commandfor="{{anchor.panel}}"` and a state gate on
 * `{{anchor.chat}}:hasError` was reported as unconverted.
 *
 * `resolveAnchorScopes` walks ROOT down, keeps the scope the same way (`ANCHOR_SCOPES`, nearest wins), and returns a node
 * map where every string already holds the real, per-instance id. Because it runs first, everything downstream sees real
 * strings: the invoker-target scan in `convertSite` (a trigger's `commandfor` and its panel's `id` are the same string),
 * `stateShowExpr` (`agent-chat-<id>:hasError` is a plain state key) and the emitters themselves.
 *
 * Two chat-specific rewrites ride the same walk, because only here is the enclosing chat known:
 *   - a `Data` with `dataSource.scope: "turns"` under an `AgentChat` becomes `CHAT_TURNS_SCOPE` (the message list the
 *     runtime draws; see chatSource.ts), not a loop over a Liquid `item.turns` that does not exist;
 *   - a `Text` that read `{{state.<chat key>}}` gets its bare token wrapped in the `data-variable` span the Text emitter
 *     turns into `data-state-text`, so the title and the error message follow the state store.
 */
import { anchorsFor, type AnchorMap } from "../../utils/anchors/anchorScopes";
import type { SerializedNode, SerializedNodes } from "../static/types";

/** The `dataSource.scope` marker for the chat's message list. */
export const CHAT_TURNS_SCOPE = "chat:turns";

const TOKEN = /\{\{anchor\.([a-zA-Z0-9_-]+)\}\}/g;
/** An existing `data-variable` state span (left alone) or a bare `{{state.<key>}}` (wrapped). */
const STATE_TOKEN = /(<span\b[^>]*\bdata-variable="state\.[^"]*"[^>]*>[^<]*<\/span>)|\{\{\s*state\.([^}\s|]+)\s*\}\}/g;

const typeOf = (node: SerializedNode): string => {
  const t: any = node.type;
  return (typeof t === "string" ? t : t?.resolvedName) || (node as any).displayName || "Container";
};

/** Every string in `props` with its anchor tokens replaced (an unknown name is "", as `resolveAnchors` does). */
function resolveProps(props: Record<string, any>, anchors: AnchorMap): Record<string, any> {
  const json = JSON.stringify(props);
  if (!json || !json.includes("{{anchor.")) return props;
  return JSON.parse(json.replace(TOKEN, (_, name: string) => anchors[name] ?? ""));
}

const wrapStateTokens = (text: string) =>
  text.replace(STATE_TOKEN, (m, span: string | undefined, key: string | undefined) => (span ? m : `<span data-variable="state.${key}" class="variable-node">${m}</span>`));

export function resolveAnchorScopes(nodes: SerializedNodes, rootId = "ROOT"): SerializedNodes {
  if (!nodes[rootId]) return nodes;
  const out: SerializedNodes = { ...nodes };
  const seen = new Set<string>();

  const walk = (id: string, scope: AnchorMap) => {
    const node = nodes[id];
    if (!node || seen.has(id)) return;
    seen.add(id);
    const type = typeOf(node);
    let props = node.props || {};
    const hadAnchor = JSON.stringify(props).includes("{{anchor.");
    if (hadAnchor) props = resolveProps(props, scope);
    if (type === "Text" && hadAnchor && typeof props.text === "string") props = { ...props, text: wrapStateTokens(props.text) };
    if (type === "Data" && props.dataSource?.scope === "turns" && scope.chat) props = { ...props, dataSource: { ...props.dataSource, scope: CHAT_TURNS_SCOPE } };
    if (props !== node.props) out[id] = { ...node, props };
    const own = anchorsFor(type, id);
    const inner = own ? { ...scope, ...own } : scope;
    for (const child of [...(node.nodes || []), ...Object.values(node.linkedNodes || {})]) walk(child, inner);
  };

  walk(rootId, {});
  return out;
}
