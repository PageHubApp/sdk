/**
 * Executor: morph Automatic → Segment (sub-group inside a Card).
 * Tighter gap than the parent card so titles/subtitles stack tighter than card sections.
 */

import type { Executor } from "../automaticIntent";
import { SEGMENT_CLASSNAME } from "../constants";

export const morphToSegment: Executor<{ kind: "segment"; parentId: string }> = (
  _intent,
  batch,
  ctx
) => {
  batch.setProp(ctx.nodeId, (props: any) => {
    props.className = SEGMENT_CLASSNAME;
  });
  batch.setCustom(ctx.nodeId, (custom: any) => {
    custom.displayName = "Segment";
  });
};
