/**
 * `features.maxReusableComponents` — counting ROOT's component containers and
 * deciding whether the editor may make one more.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { resolveConfig } from "../../../config";
import {
  canAddReusableComponent,
  componentCapMessage,
  countEditorReusableComponents,
  countReusableComponents,
  editorAtComponentCap,
} from "./componentCap";

const callbacks = { onSave: async () => {}, onLoad: async () => null } as any;

/** A minimal CraftJS `query` over `{ id: { type, nodes } }`. */
function fakeQuery(nodes: Record<string, { type?: string; nodes?: string[] }>) {
  return {
    node: (id: string) => ({
      get: () => {
        const n = nodes[id];
        if (!n) throw new Error(`no node ${id}`);
        return { data: { props: { type: n.type }, nodes: n.nodes || [] } };
      },
    }),
  };
}

test("countReusableComponents: counts only type component", () => {
  const types: Record<string, string> = { a: "component", b: "page", c: "component", d: "header" };
  assert.equal(countReusableComponents(["a", "b", "c", "d"], id => types[id]), 2);
  assert.equal(countReusableComponents([], () => "component"), 0);
  assert.equal(countReusableComponents(null, () => "component"), 0);
});

test("canAddReusableComponent: no cap never blocks", () => {
  assert.equal(canAddReusableComponent(50, undefined), true);
  assert.equal(canAddReusableComponent(50, null), true);
});

test("canAddReusableComponent: blocks at and past the cap", () => {
  assert.equal(canAddReusableComponent(0, 1), true);
  assert.equal(canAddReusableComponent(1, 1), false);
  assert.equal(canAddReusableComponent(2, 1), false);
  assert.equal(canAddReusableComponent(0, 0), false);
});

test("countEditorReusableComponents: reads ROOT's children through query", () => {
  const q = fakeQuery({
    ROOT: { nodes: ["page1", "comp1", "comp2"] },
    page1: { type: "page" },
    comp1: { type: "component" },
    comp2: { type: "component" },
  });
  assert.equal(countEditorReusableComponents(q), 2);
  assert.equal(countEditorReusableComponents(null), 0);
  // A dangling child id doesn't throw or count.
  assert.equal(
    countEditorReusableComponents(fakeQuery({ ROOT: { nodes: ["gone", "c"] }, c: { type: "component" } })),
    1
  );
});

test("editorAtComponentCap: true only with a cap that's reached", () => {
  const q = fakeQuery({ ROOT: { nodes: ["c"] }, c: { type: "component" } });
  assert.equal(editorAtComponentCap(q, 1), true);
  assert.equal(editorAtComponentCap(q, 2), false);
  assert.equal(editorAtComponentCap(q, null), false);
  assert.equal(editorAtComponentCap(q, undefined), false);
});

test("componentCapMessage names the cap and the way out", () => {
  assert.equal(
    componentCapMessage(1),
    "Reusable components are 1 per site on this plan. Delete one to make another, or upgrade the site's plan."
  );
  assert.match(componentCapMessage(5), /are 5 per site/);
});

test("resolveConfig: maxReusableComponents defaults to no cap; a host's value survives", () => {
  assert.equal(resolveConfig({ callbacks } as any).features.maxReusableComponents, null);
  const capped = resolveConfig({ callbacks, features: { maxReusableComponents: 1 } } as any);
  assert.equal(capped.features.maxReusableComponents, 1);
});
