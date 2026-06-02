import { useEditor, useNode } from "@craftjs/core";
import { useMemo } from "react";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { extractRootDataFromQuery } from "../../utils/page/pageManagement";
import { useMounted } from "../../utils/hooks/useMounted";
import type { RenderCtx } from "../../render/react/RenderCtx";

import { renderImageBody, ImageDefault, type ImageProps } from "./Image.body";
export { renderImageBody, ImageDefault, type ImageProps };

export const Image = (incomingProps: ImageProps) => {
  let props: any = { type: "cdn", loading: "lazy", fetchPriority: "low", ...incomingProps };
  const {
    connectors: { connect, drag },
    id,
  } = useNode();
  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const { isActive } = useEditor((_, q) => ({
    isActive: q.getEvent("selected").contains(id),
  }));
  const isMounted = useMounted();
  const { rootProps, pageMedia, pageIndex } = useMemo(
    () => extractRootDataFromQuery(query),
    [query]
  );
  props = setClonedProps(props, query);

  const ctx: RenderCtx = {
    id, enabled, isMounted, isActive, isHovered: false,
    hasChildNodes: false, isCanvasNode: false, name: "Image",
    connect, drag, setProp: () => {},
    rootProps, pageMedia, pageIndex,
  };
  return renderImageBody(props, ctx);
};

Image.craft = {
  displayName: "Image",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
