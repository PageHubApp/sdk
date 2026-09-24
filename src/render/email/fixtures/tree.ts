/**
 * Test helper: build a serialized node map from a nested spec.
 *
 * `tree([n("Container", { className: "flex flex-row" }, [n("Text", { text: "Hi" })])])`
 * → `{ ROOT, n1, n2 }` with parents / children wired. ROOT carries `rootProps`.
 */

import type { SerializedNodes } from "../../static/types";

export interface NodeSpec {
  type: string;
  props: Record<string, any>;
  kids: NodeSpec[];
}

export const n = (type: string, props: Record<string, any> = {}, kids: NodeSpec[] = []): NodeSpec => ({
  type,
  props,
  kids,
});

export function tree(children: NodeSpec[], rootProps: Record<string, any> = {}): SerializedNodes {
  const nodes: SerializedNodes = {
    ROOT: {
      type: { resolvedName: "Background" },
      isCanvas: true,
      props: { type: "background", ...rootProps },
      parent: null,
      nodes: [],
      linkedNodes: {},
    },
  };
  let count = 0;
  const add = (parent: string, spec: NodeSpec): void => {
    const id = `n${++count}`;
    nodes[id] = {
      type: { resolvedName: spec.type },
      isCanvas: spec.type === "Container",
      props: spec.props,
      parent,
      nodes: [],
      linkedNodes: {},
    };
    nodes[parent].nodes.push(id);
    spec.kids.forEach(k => add(id, k));
  };
  children.forEach(c => add("ROOT", c));
  return nodes;
}
