import { useEditor, useNode } from "@craftjs/core";
import { useMemo } from "react";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { useScrollToSelected } from "../../core/componentHooks";
import { useMounted } from "../../utils/hooks/useMounted";
import { extractRootDataFromQuery } from "../../utils/page/pageManagement";
import type { RenderCtx } from "../../render/react/RenderCtx";

import {
  renderEmbedBody,
  resolveEmbedHTML,
  generateEmbedCode,
  EMBED_SERVICES,
  type EmbedService,
  type EmbedProps,
} from "./Embed.body";

export {
  renderEmbedBody,
  resolveEmbedHTML,
  generateEmbedCode,
  EMBED_SERVICES,
  type EmbedService,
  type EmbedProps,
};

export const Embed = (incomingProps: EmbedProps) => {
  let props: any = { canDelete: true, canEditName: true, service: "custom", ...incomingProps };
  const {
    connectors: { connect, drag },
    id,
  } = useNode();
  const { name } = useNode(node => ({
    name: node.data.custom.displayName || node.data.displayName,
  }));
  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const { isActive } = useEditor((_, q) => ({
    isActive: q.getEvent("selected").contains(id),
  }));
  useScrollToSelected(id, enabled);
  const isMounted = useMounted();
  const { rootProps, pageMedia, pageIndex } = useMemo(
    () => extractRootDataFromQuery(query),
    [query]
  );
  props = setClonedProps(props, query);

  const ctx: RenderCtx = {
    id, enabled, isMounted, isActive, isHovered: false,
    hasChildNodes: false, isCanvasNode: false, name,
    connect, drag, setProp: () => {},
    rootProps, pageMedia, pageIndex,
  };
  return renderEmbedBody(props, ctx);
};

Embed.craft = {
  displayName: "Embed",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
