import { renderImageBody, type ImageProps } from "./Image.body";
import { useTreeRoot, useWalkerNode } from "../../render/react/contexts";
import { makeWalkerCtx } from "../../render/react/RenderCtx";

export const ImageRender = (incomingProps: ImageProps) => {
  const props: any = { type: "cdn", loading: "lazy", fetchPriority: "low", ...incomingProps };
  const tree = useTreeRoot();
  const walker = useWalkerNode();
  const ctx = makeWalkerCtx({
    id: walker?.id ?? "",
    isCanvas: false,
    hasChildNodes: false,
    displayName: walker?.displayName ?? "Image",
    rootProps: tree?.rootProps ?? {},
    pageMedia: tree?.pageMedia ?? null,
    pageIndex: tree?.pageIndex ?? {},
    parentClassName: walker?.parentClassName,
  });
  return renderImageBody(props, ctx);
};
