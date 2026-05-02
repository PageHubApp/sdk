import { useEditor, useNode } from "@craftjs/core";
import { getClonedState } from "../../utils/cloneState";
import { useMounted } from "../../utils/hooks/useMounted";
import type { RenderCtx } from "../../render/RenderCtx";

import { renderMapPointBody, type MapPointProps } from "./MapPoint.body";
export { renderMapPointBody, type MapPointProps };

export const MapPoint = ({
  lat = 0,
  lng = 0,
  title = "",
  description = "",
  ...rest
}: MapPointProps) => {
  const props: any = { lat, lng, title, description, ...rest };
  const {
    connectors: { connect, drag },
    id,
  } = useNode();
  const { enabled } = useEditor(state => getClonedState(props, state));
  const isMounted = useMounted();
  const ctx: RenderCtx = {
    id, enabled, isMounted, isActive: false, isHovered: false,
    hasChildNodes: false, isCanvasNode: false, name: "MapPoint",
    connect, drag, setProp: () => {},
    rootProps: {}, pageMedia: null, pageIndex: {},
  };
  return renderMapPointBody(props, ctx);
};

MapPoint.craft = {
  displayName: "MapPoint",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
