import { useEditor, useNode } from "@craftjs/core";
import React from "react";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { extractRootDataFromQuery } from "../../utils/page/pageManagement";
import { useScrollToSelected } from "../../core/componentHooks";
import { useMounted } from "../../utils/hooks/useMounted";
import type { RenderCtx } from "../../render/react/RenderCtx";

import { renderTextBody, type TextProps } from "./Text.body";
export { renderTextBody, type TextProps };

export const Text = (incomingProps: Partial<TextProps>) => {
  let props: any = { canDelete: true, ...incomingProps };
  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const {
    connectors: { connect, drag },
    id,
    actions: { setProp },
  } = useNode();
  useScrollToSelected(id, enabled);
  props = setClonedProps(props, query);
  const { rootProps, pageMedia, pageIndex } = React.useMemo(
    () => extractRootDataFromQuery(query),
    [query]
  );
  const isMounted = useMounted(!enabled);

  const ctx: RenderCtx = {
    id, enabled, isMounted, isActive: false, isHovered: false,
    hasChildNodes: false, isCanvasNode: false, name: "Text",
    connect, drag, setProp,
    rootProps, pageMedia, pageIndex, query,
  };
  return renderTextBody(props, ctx);
};

Text.craft = {
  displayName: "Text",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
