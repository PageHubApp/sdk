import { renderMapPointBody, type MapPointProps } from "./MapPoint.body";
import { useTreeRoot, useWalkerNode } from "../../render/react/contexts";
import { makeWalkerCtx } from "../../render/react/RenderCtx";

export const MapPointRender = (props: MapPointProps) => {
  const tree = useTreeRoot();
  const walker = useWalkerNode();
  const ctx = makeWalkerCtx({
    id: walker?.id ?? "",
    isCanvas: false,
    hasChildNodes: false,
    displayName: "MapPoint",
    rootProps: tree?.rootProps ?? {},
    pageMedia: tree?.pageMedia ?? null,
    pageIndex: tree?.pageIndex ?? {},
  });
  return renderMapPointBody(props, ctx);
};
