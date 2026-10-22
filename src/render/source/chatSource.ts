/**
 * The site chat widget as HTML-first source: `AgentFloatingBubble`, `AgentChat` and the message list inside it.
 *
 * Live, `AgentChat` renders nothing until `/history` says chat is on, and its message list is a `Data` over the turns the
 * hook holds. In a file there is no hook, so the markup is a plain, hidden shell the runtime's `chat` chunk finishes:
 *
 *   <div class="contents" data-chat-bubble hidden>                 AgentFloatingBubble
 *     …trigger button + popover panel…
 *       <div id="agent-chat-<node id>" data-chat hidden>           AgentChat (`id` is its state-key prefix)
 *         <div data-chat-turns>                                    the message list
 *           <template data-chat-role="user">…row…</template>
 *           <template data-chat-role="assistant">…row…</template>
 *         </div>
 *
 * The chunk un-hides the shell once chat is available, writes `<id>:hasError|ended|sending|…` into the state store (the
 * preset's gates are `data-state-show` on those keys, resolved by anchors.ts) and clones the row for each message.
 * A row is the Data's own template child, emitted once with its `role` gate removed (the template says which role it
 * is) and `{{item.content}}` swapped for the `data-turn-text` slot the chunk fills.
 */
import { anchorsFor } from "../../utils/anchors/anchorScopes";
import { partitionDataChildIds } from "../../utils/data/emptySlot";
import type { StaticRenderContext } from "../../utils/staticHtml";
import type { SerializedNode, SerializedNodes } from "../static/types";
import { renderNodeToSource } from "./toSource";

const esc = (v: string) => v.replace(/"/g, "&quot;");
const tag = (name: string, attrs: Record<string, string | undefined>, inner: string) => {
  const a = Object.entries(attrs)
    .filter(([, v]) => v)
    .map(([k, v]) => ` ${k}="${esc(v!)}"`)
    .join("");
  return `<${name}${a}>${inner}</${name}>`;
};
const classOf = (props: Record<string, any>) => (typeof props.className === "string" ? props.className.trim() || undefined : undefined);

/** `AgentFloatingBubble`: a layout-free wrapper, hidden until the chat inside it is available. */
export function agentBubbleSource(_props: Record<string, any>, children: string): string {
  return tag("div", { class: "contents", "data-chat-bubble": "true", hidden: "hidden" }, children);
}

/** `AgentChat`: the panel root. Its `id` is the anchor every `{{anchor.chat}}` in the preset resolved to. */
export function agentChatSource(props: Record<string, any>, children: string, ctx: StaticRenderContext): string {
  const id = anchorsFor("AgentChat", String(ctx.renderingNodeId))!.chat;
  return tag("div", { class: classOf(props), id, "data-chat": "true", hidden: "hidden" }, children);
}

/** The role a template row is gated to (`item.role equals user`), or null when it carries no such gate. */
function rowRole(node: SerializedNode | undefined): "user" | "assistant" | null {
  const groups = node?.props?.conditionGroups;
  const cond = Array.isArray(groups) && groups.length === 1 && groups[0]?.conditions?.length === 1 ? groups[0].conditions[0] : null;
  const role = cond?.type === "item" && cond.key === "role" && (cond.operator ?? "equals") === "equals" ? cond.value : null;
  return role === "user" || role === "assistant" ? role : null;
}

const CONTENT_SPAN = /<span data-variable=\\"item\.content\\"[^>]*>\{\{\s*item\.content\s*\}\}<\/span>/g;
const CONTENT_TOKEN = /\{\{\s*item\.content\s*\}\}/g;
const SLOT = "<span data-turn-text></span>";

/** A copy of `nodes` where row `rowId` and its subtree read the chat runtime's slot instead of `item.content`, and the row has no role gate. */
function rowNodes(nodes: SerializedNodes, rowId: string): SerializedNodes {
  const out: SerializedNodes = { ...nodes };
  const visit = (id: string) => {
    const node = nodes[id];
    if (!node) return;
    let props = node.props || {};
    const json = JSON.stringify(props);
    if (json.includes("item.content")) props = JSON.parse(json.replace(CONTENT_SPAN, SLOT).replace(CONTENT_TOKEN, SLOT));
    if (id === rowId) {
      const { conditionGroups: _gate, ...rest } = props;
      props = rest;
    }
    out[id] = { ...node, props };
    for (const child of [...(node.nodes || []), ...Object.values(node.linkedNodes || {})]) visit(child);
  };
  visit(rowId);
  return out;
}

/** The chat's message list (`Data` with the `CHAT_TURNS_SCOPE` marker): one `<template>` per role for the runtime to clone. */
export function chatTurnsSource(props: Record<string, any>, ctx: StaticRenderContext): string {
  const nodes = (ctx as any).nodes as SerializedNodes;
  const self = nodes[String(ctx.renderingNodeId)];
  const childIds = Array.isArray(ctx.repeaterChildIds) ? ctx.repeaterChildIds : self?.nodes ?? [];
  const { templateChildIds } = partitionDataChildIds(childIds, id => nodes[id]?.custom?.dataRole);
  const templates = templateChildIds.flatMap(id => {
    const source = renderNodeToSource(id, rowNodes(nodes, id), ctx);
    // The nested walk set `ctx.nodes` to the row copy; the outer walk carries on with the real map.
    (ctx as any).nodes = nodes;
    return (rowRole(nodes[id]) ? [rowRole(nodes[id])!] : ["user", "assistant"]).map(role => tag("template", { "data-chat-role": role }, source));
  });
  return tag("div", { class: classOf(props), "data-chat-turns": "true" }, templates.join(""));
}
