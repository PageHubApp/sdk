import { renderLinkBody, defaultIcon, type LinkProps } from "./Link.body";
import { normalizeIconProp } from "../shared/iconProp";
import { useTreeRoot, useWalkerNode } from "../../render/contexts";
import { makeWalkerCtx } from "../../render/RenderCtx";

export const LinkRender = (incomingProps: LinkProps) => {
  const icon = normalizeIconProp(incomingProps, defaultIcon);
  const props: any = {
    text: "Link",
    ...incomingProps,
    icon: { ...defaultIcon, ...icon },
  };
  const tree = useTreeRoot();
  const walker = useWalkerNode();
  const ctx = makeWalkerCtx({
    id: walker?.id ?? "",
    isCanvas: false,
    hasChildNodes: false,
    displayName: walker?.displayName ?? "Link",
    rootProps: tree?.rootProps ?? {},
    pageMedia: tree?.pageMedia ?? null,
    pageIndex: tree?.pageIndex ?? {},
  });
  return renderLinkBody(props, ctx);
};
