import { useEditor, useNode, UserComponent } from "@craftjs/core";
import NextLink from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { TbPointer } from "react-icons/tb";
import { addCustomHandlers } from "../../utils/actions/customHandlers";
import { addActionHandlers } from "../../utils/actions/dispatcher";
import { useItemContext } from "../../utils/itemContext";
import { applyAttrs } from "../../utils/applyAttrs";
import {
  migrateActions,
  actionToHref,
  actionTarget,
  isLinkAction,
  isAnchorAction,
  isHandlerAction,
  findLinkAction,
  type NodeAction,
} from "../../utils/action";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { useResolvedIcon } from "../../utils/icons/iconResolver";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import { replaceVariables } from "../../utils/design/variables";
import { useRuntimeVarsVersion } from "../../utils/design/RuntimeVarsContext";
import { resolvePageRef } from "../../utils/page/pageManagement";
import { useScrollToSelected } from "../componentHooks";
import { useMounted } from "../../utils/hooks/useMounted";

import { EditorEmptyLeafHint } from "../../chrome/primitives/EditorEmptyLeafHint";
import { isVisuallyEmptyRichText } from "../../utils/isVisuallyEmptyRichText";
import { BaseSelectorProps, applyAriaProps } from "../selectors";

interface IconProps {
  value?: string;
  only?: boolean;
  position?: string;
  size?: string;
  color?: string;
  gap?: string;
  shadow?: string;
}

export interface LinkProps extends BaseSelectorProps {
  text?: string;
  icon?: IconProps;
  action?: NodeAction | NodeAction[];
}

const defaultIcon = {
  position: "left" as const,
  size: "w-4 h-4",
  gap: "gap-1.5",
};

export const Link: UserComponent<LinkProps> = (incomingProps: LinkProps) => {
  let icon = incomingProps.icon;
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
    icon: {
      ...defaultIcon,
      ...icon,
    },
  };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { query, enabled } = useEditor(state => getClonedState(props, state));
  const { isActive } = useEditor((_, q) => ({
    isActive: q.getEvent("selected").contains(id),
  }));

  const router = useRouter();
  const itemContext = useItemContext();
  useRuntimeVarsVersion();

  props = setClonedProps(props, query);
  const isMounted = useMounted();

  useScrollToSelected(id, enabled);

  const [, forceUpdate] = useState(0);
  const hasVariables = typeof props.text === "string" && props.text.includes("{{");
  useEffect(() => {
    if (!hasVariables) return;
    const handler = () => forceUpdate(n => n + 1);
    document.addEventListener("pagehub:variable-changed", handler);
    return () => document.removeEventListener("pagehub:variable-changed", handler);
  }, [hasVariables]);

  const prop: any = {
    ref: r => connect(drag(r)),
    className: props.className || "",
  };

  // Auto flex layout when icon is present so icon+text sit inline.
  const hasIcon = !!props.icon?.value;
  if (hasIcon) {
    const iconPosition = props.icon?.position || "left";
    const isVertical = iconPosition === "top" || iconPosition === "bottom";
    const defaults = [
      "inline-flex",
      isVertical ? "flex-col" : "flex-row",
      "items-center",
      props.icon?.gap || "gap-1.5",
    ];
    prop.className = prop.className + " " + defaults.join(" ");
  }

  const actions = migrateActions(props);
  const firstLink = findLinkAction(actions);
  const rawUrl = actionToHref(firstLink, query, router?.asPath);
  let resolvedUrl = rawUrl ? replaceVariables(rawUrl, query, itemContext) : rawUrl;
  if (resolvedUrl && typeof resolvedUrl === "string" && resolvedUrl.startsWith("ref:")) {
    resolvedUrl = resolvePageRef(resolvedUrl, query, router?.asPath);
  }
  const target = actionTarget(firstLink);

  const isInternalLink =
    resolvedUrl && typeof resolvedUrl === "string" && resolvedUrl.startsWith("/");
  let ele: any = "a";

  if (resolvedUrl && typeof resolvedUrl === "string") {
    prop.href = resolvedUrl;
    if (target) prop.target = target;
    if (/^https?:\/\//.test(resolvedUrl)) {
      prop.rel = "noopener noreferrer";
    }
    if (!enabled && router?.asPath) {
      const current = router.asPath.split(/[?#]/)[0].replace(/\/$/, "") || "/";
      const href = resolvedUrl.split(/[?#]/)[0].replace(/\/$/, "") || "/";
      if (current === href) {
        prop["aria-current"] = "page";
        prop["data-active"] = "true";
      }
    }
  }

  if (props.icon?.only && !prop["aria-label"]) {
    prop["aria-label"] = props.text || "Link";
  }

  applyAttrs(prop, props.attrs, v => replaceVariables(v, query, itemContext));
  if (typeof prop.href === "string" && prop.href.includes("{{")) {
    prop.href = replaceVariables(prop.href, query, itemContext);
  }

  if (enabled) ele = "span";
  if (!enabled && isInternalLink) ele = NextLink;

  applyAriaProps(prop, props);

  // Multi-action chains, anchor links, and any handler-action route through
  // `addActionHandlers`. Single non-anchor link → browser navigates natively.
  const actionCtx = {
    itemContext,
    resolvedLinkHref: typeof resolvedUrl === "string" ? resolvedUrl : null,
  };
  const needsJsDispatch =
    actions.length > 1 ||
    actions.some(a => isHandlerAction(a) || isAnchorAction(a)) ||
    (actions.length === 1 && !isLinkAction(actions[0]));
  if (needsJsDispatch) {
    addActionHandlers(prop, actions, enabled, actionCtx);
  }

  addCustomHandlers(prop, props.handlers, enabled);

  if (actions.length > 0 && !enabled) {
    prop["data-action"] = actions.map(a => a.type).join(" ");
  }

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  const iconSize = props.icon?.size || "w-4 h-4";
  const iconElement = useResolvedIcon(props.icon?.value, query);

  const iconClass = useMemo(
    () =>
      [
        iconSize,
        props.icon?.color || "fill-current",
        props.icon?.shadow,
        "flex",
        "items-center",
        "justify-center",
      ]
        .filter(Boolean)
        .join(" "),
    [iconSize, props.icon?.color, props.icon?.shadow]
  );

  const iconSpan = iconElement && (
    <span className={iconClass} aria-hidden="true">
      {iconElement}
    </span>
  );

  const labelHtml = replaceVariables(String(props.text ?? ""), query, itemContext);
  const hasIconValue = !!props.icon?.value;
  // Styled-shape links (carousel dots, pagination pips) are intentional chrome.
  const cn = prop.className || "";
  const looksStyledShape =
    /\brounded-full\b/.test(cn) ||
    (/\bbg-/.test(cn) && (/\bw-\S+/.test(cn) || /\bh-\S+/.test(cn) || /\bsize-\S+/.test(cn)));
  const isLeafEmpty =
    enabled &&
    isMounted &&
    !hasIconValue &&
    !looksStyledShape &&
    isVisuallyEmptyRichText(labelHtml);

  const content = isLeafEmpty ? (
    <EditorEmptyLeafHint
      selected={isActive}
      icon={<TbPointer aria-hidden />}
      idleLabel="Empty link"
      selectedLabel="Drop here or right-click"
    />
  ) : (
    <>
      {(props.icon?.position === "left" || props.icon?.position === "top") && iconSpan}
      {!props.icon?.only && props.text && replaceVariables(props.text, query, itemContext)}
      {(props.icon?.position === "right" || props.icon?.position === "bottom") && iconSpan}
    </>
  );

  prop.children = content;

  const final = applyAnimation({ ...prop, key: `${id}` }, props, null, enabled);

  return React.createElement(motionIt(props, ele, enabled), final);
};

Link.craft = {
  displayName: "Link",
  rules: {
    canDrag: () => true,
  },
};
