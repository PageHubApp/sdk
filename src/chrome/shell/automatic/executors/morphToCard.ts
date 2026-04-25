/**
 * Executor: morph Automatic → Card surface.
 * Fires when nested in a container whose grandparent is section/page.
 */

import type { Executor } from "../automaticIntent";
import { CARD_CLASSNAME } from "../constants";

export const morphToCard: Executor<{ kind: "card"; parentId: string }> = (
  _intent,
  batch,
  ctx
) => {
  batch.setProp(ctx.nodeId, (props: any) => {
    const cls = props.className || "";
    if (!cls.includes("card") && !cls.includes("bg-base-200")) {
      props.className = CARD_CLASSNAME;
    }
  });
  batch.setCustom(ctx.nodeId, (custom: any) => {
    custom.displayName = "Card";
  });
};
