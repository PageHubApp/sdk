import { useEditor, useNode } from "@craftjs/core";
import React from "react";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { extractRootDataFromQuery } from "../../utils/page/pageManagement";
import { useMounted } from "../../utils/hooks/useMounted";
import type { RenderCtx } from "../../render/RenderCtx";

import {
  renderVideoBody,
  type VideoProps,
  type VideoProvider,
} from "./Video.body";
export {
  renderVideoBody,
  type VideoProps,
  type VideoProvider,
};

export const Video = (incomingProps: VideoProps) => {
  let props: any = {
    canDelete: true,
    canEditName: true,
    provider: "youtube",
    controls: true,
    playsInline: true,
    ...incomingProps,
  };
  const {
    connectors: { connect, drag },
    id,
  } = useNode();
  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const { isActive } = useEditor((_, q) => ({
    isActive: q.getEvent("selected").contains(id),
  }));
  const isMounted = useMounted();
  const { rootProps, pageMedia, pageIndex } = React.useMemo(
    () => extractRootDataFromQuery(query),
    [query]
  );
  props = setClonedProps(props, query);

  const ctx: RenderCtx = {
    id, enabled, isMounted, isActive, isHovered: false,
    hasChildNodes: false, isCanvasNode: false, name: "Video",
    connect, drag, setProp: () => {},
    rootProps, pageMedia, pageIndex,
  };
  return renderVideoBody(props, ctx);
};

Video.craft = {
  displayName: "Video",
};
