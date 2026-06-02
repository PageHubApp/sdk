import type { ContainerProps, ContainerRenderOptions } from "./Container.body";
import { renderContainerViewerBody } from "./Container.viewerBody";
import { useTreeRoot, useWalkerNode } from "../../render/react/contexts";
import { makeWalkerCtx } from "../../render/react/RenderCtx";

export function useContainerRenderWalker(
  incomingProps: Partial<ContainerProps>,
  opts?: ContainerRenderOptions
) {
  const tree = useTreeRoot();
  const walker = useWalkerNode();
  const ctx = makeWalkerCtx({
    id: walker?.id ?? "",
    isCanvas: walker?.isCanvas ?? false,
    hasChildNodes: (walker?.childIds?.length ?? 0) > 0,
    displayName: walker?.displayName ?? "Container",
    rootProps: tree?.rootProps ?? {},
    pageMedia: tree?.pageMedia ?? null,
    pageIndex: tree?.pageIndex ?? {},
  });
  return renderContainerViewerBody(incomingProps, ctx, opts);
}

export const ContainerRender = (props: Partial<ContainerProps>) =>
  useContainerRenderWalker(props);
