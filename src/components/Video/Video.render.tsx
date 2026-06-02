import { renderVideoBody, type VideoProps } from "./Video.body";
import { useTreeRoot, useWalkerNode } from "../../render/react/contexts";
import { makeWalkerCtx } from "../../render/react/RenderCtx";

export const VideoRender = (incomingProps: VideoProps) => {
  const props: any = {
    provider: "youtube",
    controls: true,
    playsInline: true,
    ...incomingProps,
  };
  const tree = useTreeRoot();
  const walker = useWalkerNode();
  const ctx = makeWalkerCtx({
    id: walker?.id ?? "",
    isCanvas: false,
    hasChildNodes: false,
    displayName: walker?.displayName ?? "Video",
    rootProps: tree?.rootProps ?? {},
    pageMedia: tree?.pageMedia ?? null,
    pageIndex: tree?.pageIndex ?? {},
  });
  return renderVideoBody(props, ctx);
};
