import { renderButtonBody, defaultIcon, type ButtonProps } from "./Button.body";
import { normalizeIconProp } from "../shared/iconProp";
import { useTreeRoot, useWalkerNode } from "../../render/contexts";
import { makeWalkerCtx } from "../../render/RenderCtx";

export const ButtonRender = (incomingProps: ButtonProps) => {
  const icon = normalizeIconProp(incomingProps, defaultIcon);
  const props: any = {
    text: "Button", type: "button",
    ...incomingProps,
    icon: { ...defaultIcon, ...icon },
  };
  const tree = useTreeRoot();
  const walker = useWalkerNode();
  const ctx = makeWalkerCtx({
    id: walker?.id ?? "",
    isCanvas: false,
    hasChildNodes: false,
    displayName: walker?.displayName ?? "Button",
    rootProps: tree?.rootProps ?? {},
    pageMedia: tree?.pageMedia ?? null,
    pageIndex: tree?.pageIndex ?? {},
  });
  return renderButtonBody(props, ctx);
};
