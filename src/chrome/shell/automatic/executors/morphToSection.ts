/**
 * Executor: morph Automatic → full Section + nested Content child.
 * Fires when parent is a page.
 */

import type { Executor } from "../automaticIntent";
import { SECTION_CLASSNAME } from "../constants";
import { buildContentChildTree } from "../helpers";

export const morphToSection: Executor<{ kind: "section"; parentId: string }> = (
  _intent,
  batch,
  ctx
) => {
  batch.setProp(ctx.nodeId, (props: any) => {
    props.type = "section";
    props.className = SECTION_CLASSNAME;
  });
  batch.setCustom(ctx.nodeId, (custom: any) => {
    custom.displayName = "Section";
  });
  const contentTree = buildContentChildTree(ctx.query);
  batch.addNodeTree(contentTree, ctx.nodeId);
};
