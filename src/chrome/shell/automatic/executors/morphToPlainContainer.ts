/**
 * Executor: rename Automatic → plain Container. No className or props change.
 * Fallback when no other detector matches — user isn't punished for weird drops.
 */

import type { Executor } from "../automaticIntent";

export const morphToPlainContainer: Executor<{
  kind: "plainContainer";
  parentId: string;
}> = (_intent, batch, ctx) => {
  batch.setCustom(ctx.nodeId, (custom: any) => {
    custom.displayName = "Container";
  });
};
