import { renderIconBody, type IconProps } from "./Icon.body";
import { useResolvedIcon } from "../../utils/icons/iconResolver";
import { useTreeRoot, useWalkerNode } from "../../render/contexts";
import { makeWalkerCtx } from "../../render/RenderCtx";

export const IconRender = (props: IconProps) => {
  const tree = useTreeRoot();
  const walker = useWalkerNode();
  const iconElement = useResolvedIcon(props.value, tree?.pageMedia ?? null);
  const ctx = makeWalkerCtx({
    id: walker?.id ?? "",
    isCanvas: false,
    hasChildNodes: false,
    displayName: walker?.displayName ?? "Icon",
    rootProps: tree?.rootProps ?? {},
    pageMedia: tree?.pageMedia ?? null,
    pageIndex: tree?.pageIndex ?? {},
  });
  return renderIconBody(props, ctx, iconElement);
};
