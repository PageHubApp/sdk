import { renderTextBody, type TextProps } from "./Text.body";
import { useTreeRoot, useWalkerNode } from "../../render/react/contexts";
import { makeWalkerCtx } from "../../render/react/RenderCtx";

export const TextRender = (incomingProps: Partial<TextProps>) => {
  const props: any = { ...incomingProps };
  const tree = useTreeRoot();
  const walker = useWalkerNode();
  const ctx = makeWalkerCtx({
    id: walker?.id ?? "",
    isCanvas: false,
    hasChildNodes: false,
    displayName: walker?.displayName ?? "Text",
    rootProps: tree?.rootProps ?? {},
    pageMedia: tree?.pageMedia ?? null,
    pageIndex: tree?.pageIndex ?? {},
  });
  return renderTextBody(props, ctx);
};
