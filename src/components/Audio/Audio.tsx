import { useEditor, useNode } from "@craftjs/core";
import { useMemo } from "react";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { useMounted } from "../../utils/hooks/useMounted";
import { extractRootDataFromQuery } from "../../utils/page/pageManagement";
import type { RenderCtx } from "../../render/RenderCtx";

import { renderAudioBody, type AudioProps } from "./Audio.body";
export { renderAudioBody, type AudioProps };

export const Audio = (incomingProps: AudioProps) => {
  let props: AudioProps = {
    controls: true,
    autoPlay: false,
    loop: false,
    canDelete: true,
    canEditName: true,
    ...incomingProps,
  };

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
  return renderAudioBody(props, ctx);
};

Audio.craft = {
  displayName: "Audio",
};
