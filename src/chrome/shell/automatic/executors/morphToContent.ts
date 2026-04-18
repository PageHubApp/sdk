/**
 * Executor: morph Automatic → Content wrapper (centered max-w).
 * Fires when parent is a section.
 */

import type { Executor } from "../automaticIntent";
import { CONTENT_CLASSNAME } from "../constants";

export const morphToContent: Executor<{ kind: "content"; parentId: string }> = (
  _intent,
  batch,
  ctx
) => {
  batch.setProp(ctx.nodeId, (props: any) => {
    props.className = CONTENT_CLASSNAME;
  });
  batch.setCustom(ctx.nodeId, (custom: any) => {
    custom.displayName = "Content";
  });
};
