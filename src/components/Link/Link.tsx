import { useEditor, useNode, UserComponent } from "@craftjs/core";
import { useMemo } from "react";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { extractRootDataFromQuery } from "../../utils/page/pageManagement";
import { useScrollToSelected } from "../../core/componentHooks";
import { useMounted } from "../../utils/hooks/useMounted";
import type { RenderCtx } from "../../render/RenderCtx";

import { renderLinkBody, defaultIcon, type LinkProps } from "./Link.body";
export { renderLinkBody, defaultIcon, type LinkProps };

export const Link: UserComponent<LinkProps> = (incomingProps: LinkProps) => {
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
  let props: any = {
    canDelete: true,
    canEditName: true,
    text: "Link",
    ...incomingProps,
    icon: { ...defaultIcon, ...icon },
  };
  const {
    connectors: { connect, drag },
    id,
  } = useNode();
  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const { isActive } = useEditor((_, q) => ({
    isActive: q.getEvent("selected").contains(id),
  }));
  props = setClonedProps(props, query);
  const isMounted = useMounted();
  const { rootProps, pageMedia, pageIndex } = useMemo(
    () => extractRootDataFromQuery(query),
    [query]
  );
  useScrollToSelected(id, enabled);

  const ctx: RenderCtx = {
    id, enabled, isMounted, isActive, isHovered: false,
    hasChildNodes: false, isCanvasNode: false, name: "Link",
    connect, drag, setProp: () => {},
    rootProps, pageMedia, pageIndex,
  };
  return renderLinkBody(props, ctx);
};

Link.craft = {
  displayName: "Link",
  rules: {
    canDrag: () => true,
  },
};
