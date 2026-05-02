import { renderEmbedBody, type EmbedProps } from "./Embed.body";
import { useTreeRoot, useWalkerNode } from "../../render/contexts";
import { makeWalkerCtx } from "../../render/RenderCtx";

export const EmbedRender = (incomingProps: EmbedProps) => {
  const props: any = { service: "custom", ...incomingProps };
  const tree = useTreeRoot();
  const walker = useWalkerNode();
  const ctx = makeWalkerCtx({
    id: walker?.id ?? "",
    isCanvas: walker?.isCanvas ?? false,
    hasChildNodes: (walker?.childIds?.length ?? 0) > 0,
    displayName: walker?.displayName ?? "Embed",
    rootProps: tree?.rootProps ?? {},
    pageMedia: tree?.pageMedia ?? null,
    pageIndex: tree?.pageIndex ?? {},
  });
  return renderEmbedBody(props, ctx);
};
