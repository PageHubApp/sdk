import assert from "node:assert/strict";
import { test } from "node:test";
import { blockToSource, type BlockStructure } from "./block";
import { resolveAnchorScopes } from "./anchors";

const item = (key: string, value: string) => [{ logic: "all", conditions: [{ type: "item", key, operator: "equals", value }] }];
const flag = (name: string, operator: string) => [{ logic: "all", conditions: [{ type: "state", key: `{{anchor.chat}}:${name}`, operator, value: "" }] }];

/** The shape of the "Chat bubble" preset, trimmed to what the converter reads. */
const bubble = (): BlockStructure => ({
  type: "AgentFloatingBubble",
  children: [
    { type: "Button", props: { text: "", action: [{ type: "show-hide", target: "{{anchor.panel}}", direction: "show", trigger: "click", method: "class" }] } },
    {
      type: "Container",
      props: { id: "{{anchor.panel}}", className: "fixed hidden" },
      children: [
        {
          type: "AgentChat",
          props: { className: "flex flex-col" },
          children: [
            { type: "Text", props: { tagName: "div", text: "<p>{{state.{{anchor.chat}}:assistantName}}</p>" } },
            { type: "Container", props: { conditionGroups: flag("hasError", "exists") }, children: [{ type: "Text", props: { tagName: "div", text: "<p>{{state.{{anchor.chat}}:error}}</p>" } }] },
            {
              type: "Data",
              props: { dataSource: { scope: "turns" }, className: "overflow-y-auto" },
              children: [
                { type: "Container", props: { className: "justify-end", conditionGroups: item("role", "user") }, children: [{ type: "Text", props: { tagName: "div", text: "<p>{{item.content}}</p>", className: "mine" } }] },
                { type: "Container", props: { className: "justify-start", conditionGroups: item("role", "assistant") }, children: [{ type: "Text", props: { tagName: "div", text: "<p>{{item.content}}</p>", className: "theirs" } }] },
              ],
            },
            {
              type: "Container",
              props: { conditionGroups: flag("ended", "not-exists") },
              children: [
                { type: "FormElement", props: { type: "textarea", name: "agentMessage" } },
                { type: "Button", props: { text: "", action: [{ type: "agent-send", field: "agentMessage" }] } },
              ],
            },
          ],
        },
      ],
    },
  ],
});

test("anchors resolve to the real per-instance ids: the trigger's commandfor is the panel's id", () => {
  const { source } = blockToSource(bubble());
  const panelId = /id="(agent-bubble-[^"]+)"/.exec(source)![1];
  assert.equal(panelId, "agent-bubble-blk_0");
  assert.match(source, new RegExp(`commandfor="${panelId}" command="show-popover"`));
  assert.ok(!source.includes("{{anchor."), "no anchor token is left");
  assert.match(source, /popover="manual"/);
});

test("the AgentChat root is a hidden shell whose id prefixes its state keys", () => {
  const { source } = blockToSource(bubble());
  const chatId = /id="(agent-chat-[^"]+)" data-chat="true" hidden="hidden"/.exec(source)?.[1];
  assert.ok(chatId, source);
  assert.match(source, /^<div class="contents" data-chat-bubble="true" hidden="hidden">/);
  // the error banner and the composer are gated on that prefix, as runtime state (not reported, not Liquid)
  assert.ok(source.includes(`data-state-show="${chatId}:hasError"`));
  assert.ok(source.includes(`data-state-show="!${chatId}:ended"`));
  assert.ok(!source.includes("report:"));
});

test("a bare {{state.<chat key>}} in a Text follows the state store", () => {
  const { source } = blockToSource(bubble());
  const chatId = /id="(agent-chat-[^"]+)"/.exec(source)![1];
  assert.ok(source.includes(`data-state-text="${chatId}:assistantName"`));
  assert.ok(source.includes(`data-state-text="${chatId}:error"`));
});

test("the message list is one <template> per role, ungated, with the slot the runtime fills", () => {
  const { source } = blockToSource(bubble());
  assert.ok(source.includes('<div class="overflow-y-auto" data-chat-turns="true">'), source);
  assert.match(source, /<template data-chat-role="user"><div class="justify-end"><div class="mine"><span data-turn-text><\/span><\/div><\/div><\/template>/);
  assert.match(source, /<template data-chat-role="assistant"><div class="justify-start"><div class="theirs"><span data-turn-text><\/span><\/div><\/div><\/template>/);
  assert.ok(!source.includes("item.role") && !source.includes("item.content"), "no per-row Liquid is left");
  assert.ok(!source.includes("{% for"), "no loop");
});

test("the composer's Send carries data-chat-send with the field name", () => {
  const { source } = blockToSource(bubble());
  assert.match(source, /<textarea[^>]*name="agentMessage"/);
  assert.match(source, /<button[^>]*data-chat-send="agentMessage"/);
});

test("agent-send with no field names the default composer field", () => {
  const { source } = blockToSource({ type: "Button", props: { text: "Send", action: [{ type: "agent-send" }] } });
  assert.match(source, /data-chat-send="agentMessage"/);
});

test("two bubbles in one tree get different ids; each trigger points at its own panel", () => {
  const twin = (title: string): BlockStructure => ({
    type: "AgentFloatingBubble",
    children: [
      { type: "Button", props: { text: title, action: [{ type: "show-hide", target: "{{anchor.panel}}", direction: "show", method: "class" }] } },
      { type: "Container", props: { id: "{{anchor.panel}}" } },
    ],
  });
  const { source } = blockToSource({ type: "Container", children: [twin("one"), twin("two")] });
  const ids = [...source.matchAll(/\sid="(agent-bubble-[^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, 2, source);
  for (const id of ids) assert.ok(source.includes(`commandfor="${id}"`), id);
});

test("resolveAnchorScopes: nearest scope wins, tokens outside any scope become empty, input is untouched", () => {
  const nodes: any = {
    ROOT: { type: "Container", props: { id: "{{anchor.panel}}" }, nodes: ["b", "c"] },
    b: { type: { resolvedName: "CartDrawer" }, props: {}, nodes: ["bi"] },
    bi: { type: "Container", props: { id: "{{anchor.panel}}-x" }, nodes: [] },
    c: { type: { resolvedName: "AgentFloatingBubble" }, props: {}, nodes: ["ci"] },
    ci: { type: "Container", props: { id: "{{anchor.panel}}" }, nodes: [] },
  };
  const before = JSON.stringify(nodes);
  const out = resolveAnchorScopes(nodes);
  assert.equal(out.ROOT.props.id, "");
  assert.equal(out.bi.props.id, "cart-drawer-b-x");
  assert.equal(out.ci.props.id, "agent-bubble-c");
  assert.equal(JSON.stringify(nodes), before);
});
