import { useEditor, useNode } from "@craftjs/core";
import { getClonedState } from "../../utils/cloneState";
import { useMounted } from "../../utils/hooks/useMounted";
import type { RenderCtx } from "../../render/react/RenderCtx";

import { renderMapPathBody, type MapPathProps } from "./MapPath.body";
export { renderMapPathBody, type MapPathProps };

export const MapPath = ({
  path = "",
  color = "var(--color-primary)",
  weight = 4,
  opacity = 1,
  dashed = true,
  title = "",
  label = "",
  ...rest
}: MapPathProps) => {
  const props: any = { path, color, weight, opacity, dashed, title, label, ...rest };
  const {
    connectors: { connect, drag },
    id,
  } = useNode();
  const { enabled } = useEditor(state => getClonedState(props, state));
  const isMounted = useMounted();
  const ctx: RenderCtx = {
    id, enabled, isMounted, isActive: false, isHovered: false,
    hasChildNodes: false, isCanvasNode: false, name: "MapPath",
    connect, drag, setProp: () => {},
    rootProps: {}, pageMedia: null, pageIndex: {},
  };
  return renderMapPathBody(props, ctx);
};

MapPath.craft = {
  displayName: "MapPath",
  rules: {
    canDrag: () => true,
    canMoveIn: () => false,
  },
};
