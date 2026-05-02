import { renderButtonBody, defaultIcon, type ButtonProps } from "./Button.body";
import { useTreeRoot, useWalkerNode } from "../../render/contexts";
import { makeWalkerCtx } from "../../render/RenderCtx";

export const ButtonRender = (incomingProps: ButtonProps) => {
  let icon: any = incomingProps.icon;
  if (typeof icon === "string") {
    icon = {
      value: icon,
      position: (incomingProps as any).iconPosition || defaultIcon.position,
      size: (incomingProps as any).iconSize || defaultIcon.size,
      color: (incomingProps as any).iconColor,
      gap: (incomingProps as any).iconGap || defaultIcon.gap,
      shadow: (incomingProps as any).iconShadow,
      only: (incomingProps as any).iconOnly,
    };
  }
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
