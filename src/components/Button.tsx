import { useEditor, useNode, UserComponent } from "@craftjs/core";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { TbPointer } from "react-icons/tb";
import { Button as UiButton } from "@pagehub/ui";
import { addActionHandlers, addCustomHandlers } from "../utils/clickControls";
import { useItemContext } from "../utils/itemContext";
import { applyAttrs } from "../utils/applyAttrs";
import { useSDKSafe } from "../core/context";
import {
  migrateAction,
  actionToHref,
  actionTarget,
  isLinkAction,
  isHandlerAction,
  type NodeAction,
} from "../utils/action";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { useResolvedIcon } from "../utils/iconResolver";
import { motionIt } from "../utils/lib";

import { applyAnimation } from "../utils/tailwind/tailwind";
import { replaceVariables } from "../utils/design/variables";
import { resolvePageRef } from "../utils/pageManagement";
import { useScrollToSelected } from "./componentHooks";

import { EditorEmptyLeafHint } from "../chrome/primitives/EditorEmptyLeafHint";
import { isVisuallyEmptyRichText } from "../utils/isVisuallyEmptyRichText";
import { BaseSelectorProps, applyAriaProps } from "./selectors";

interface IconProps {
  value?: string;
  only?: boolean;
  position?: string;
  size?: string;
  color?: string;
  gap?: string;
  shadow?: string;
}

export interface ButtonProps extends BaseSelectorProps {
  text?: string;
  icon?: IconProps;
  url?: string;
  type?: string;
  action?: NodeAction;
  click?: any; // Legacy — handled by migrateAction()
  defaultActive?: boolean;
}

const defaultIcon = {
  position: "left" as const,
  size: "w-6 h-6",
  gap: "gap-2",
};

export const Button: UserComponent<ButtonProps> = (incomingProps: ButtonProps) => {
  // Handle backward compatibility: convert old flat icon structure to nested
  let icon = incomingProps.icon;
  if (typeof icon === "string") {
    // Old format: icon is a string
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
    text: "Button",
    type: "button",
    ...incomingProps,
    // Properly merge nested icon object
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
  const sdk = useSDKSafe();

  props = setClonedProps(props, query);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useScrollToSelected(id, enabled);

  // Re-render when a variable value is edited via the popover
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

  // Auto-apply flex layout when icon is present so icon+text sit inline.
  // Skip if className already has `btn` — DaisyUI btn handles display/flex/gap.
  const hasIcon = !!props.icon?.value;
  const hasBtnClass = /\bbtn\b/.test(prop.className);
  if (hasIcon && !hasBtnClass) {
    const iconPosition = props.icon?.position || "left";
    const isVertical = iconPosition === "top" || iconPosition === "bottom";
    const defaults = [
      "flex",
      isVertical ? "flex-col" : "flex-row",
      "items-center",
      "justify-center",
      props.icon?.gap || "gap-2",
    ];
    if (defaults.length) {
      prop.className = prop.className + " " + defaults.join(" ");
    }
  }

  // Resolve action to href (handles link-url, link-page, email, phone, scroll-to)
  const action = migrateAction(props);
  const rawUrl = actionToHref(action, query, router?.asPath);
  let resolvedUrl = rawUrl ? replaceVariables(rawUrl, query, itemContext) : rawUrl;
  // If variable interpolation produced a ref: page link (e.g. ternary), resolve it now
  if (resolvedUrl && typeof resolvedUrl === "string" && resolvedUrl.startsWith("ref:")) {
    resolvedUrl = resolvePageRef(resolvedUrl, query, router?.asPath);
  }
  const target = actionTarget(action);

  const isInternalLink =
    resolvedUrl && typeof resolvedUrl === "string" && resolvedUrl.startsWith("/");
  let ele: any = resolvedUrl && typeof resolvedUrl === "string" ? "a" : "button";

  if (resolvedUrl && typeof resolvedUrl === "string") {
    prop.href = resolvedUrl;
    prop["data-button-link"] = "true";
    if (target) prop.target = target;
    if (/^https?:\/\//.test(resolvedUrl)) {
      prop.rel = "noopener noreferrer";
    }
    // Active link detection: compare current path with resolved href
    if (!enabled && router?.asPath) {
      const current = router.asPath.split(/[?#]/)[0].replace(/\/$/, "") || "/";
      const href = resolvedUrl.split(/[?#]/)[0].replace(/\/$/, "") || "/";
      if (current === href) {
        prop["aria-current"] = "page";
        prop["data-active"] = "true";
      }
    }
  } else if (ele === "button") {
    prop.type = props.type || "button";
  }

  // Ensure icon-only buttons have accessible names (WCAG 4.1.2)
  if (props.icon?.only && !prop["aria-label"]) {
    prop["aria-label"] = props.text || "Button";
  }

  // Pass through plain string attrs (data-*, role, etc.) so app URL/commerce hooks
  // and other runtime wiring can query the DOM. Resolves {{item.*}} templates
  // against the current item context so chips in a repeater get unique hrefs.
  applyAttrs(prop, props.attrs, v => replaceVariables(v, query, itemContext));
  // Also interpolate item vars into the href (action.href patterns like "?category={{item.slug}}")
  if (typeof prop.href === "string" && prop.href.includes("{{")) {
    prop.href = replaceVariables(prop.href, query, itemContext);
  }

  if (enabled && ele === "a") ele = "span";

  // Use Next.js Link for internal page links (SPA navigation)
  if (!enabled && isInternalLink && ele === "a") ele = Link;

  // Prevent submit buttons from submitting forms in edit mode
  if (enabled && prop.type === "submit") {
    prop.type = "button";
  }

  applyAriaProps(prop, props);

  // Attach JS handlers for open-modal, show-hide, scroll-to, add-to-cart
  const actionCtx = { itemContext, onAddToCart: sdk?.config.callbacks?.onAddToCart };
  if (isHandlerAction(action)) {
    // For show-hide on buttons, force style method
    const actionForButton =
      action.type === "show-hide" ? { ...action, method: "style" as const } : action;
    addActionHandlers(prop, actionForButton, enabled, actionCtx);
  } else if (action?.type === "scroll-to") {
    addActionHandlers(prop, action, enabled, actionCtx);
  }

  addCustomHandlers(prop, props.handlers, enabled);

  // Stamp data-action for runtime discovery (e.g. CartProvider badge injection on toggle-cart)
  if (action?.type && !enabled) {
    prop["data-action"] = action.type;
  }

  // Tab button: mark with data attribute for active state tracking
  if (action?.type === "show-hide" && action.direction === "tab") {
    prop["data-tab-button"] = "true";
    prop["data-tab-active"] = props.defaultActive === true ? "true" : "false";
  }

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  const iconSize = props.icon?.size || "w-6 h-6";
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
    [iconSize, props.icon?.color, props.icon?.shadow],
  );

  const iconSpan = iconElement && (
    <span className={iconClass} aria-hidden="true">
      {iconElement}
    </span>
  );

  const labelHtml = replaceVariables(String(props.text ?? ""), query, itemContext);
  const hasIconValue = !!props.icon?.value;
  const isLeafEmpty = enabled && isMounted && !hasIconValue && isVisuallyEmptyRichText(labelHtml);

  const content = isLeafEmpty ? (
    <EditorEmptyLeafHint
      selected={isActive}
      icon={<TbPointer aria-hidden />}
      idleLabel="Empty button"
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

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  const final = applyAnimation({ ...prop, key: `${id}` }, props, null, enabled);

  // Use @pagehub/ui Button for actual button/link renders.
  // Keep "span" for editor mode and Link for Next.js internal navigation.
  const renderComponent = ele === "button" || ele === "a" ? UiButton : ele;

  // Suppress UiButton's built-in variant/size classes — className is the source of truth.
  const finalProps = renderComponent === UiButton ? { ...final, variant: null, size: null } : final;

  return React.createElement(motionIt(props, renderComponent, enabled), finalProps);
};

Button.craft = {
  displayName: "Button",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes => nodes.every(node => node.data?.name === "Button"),
  },
};
