import { useEditor, useNode, UserComponent } from "@craftjs/core";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { TbPointer } from "react-icons/tb";
import { Button as UiButton } from "@pagehub/ui";
import { ROOT_NODE } from "@craftjs/utils";
import { addActionHandlers, addCustomHandlers } from "../../utils/actions";
import { useShowHideVersion } from "../../utils/state/showHideStore";
import { applyStateModifiers } from "../../utils/conditions/stateModifiers";
import { buildClientContext } from "../../utils/conditions/context";
import { useItemContext } from "../../utils/itemContext";
import { applyAttrs } from "../../utils/applyAttrs";
import { useAnchors } from "../../utils/anchors/anchorContext";
import { resolveAnchorsInActions } from "../../utils/anchors/resolveAnchorsInAction";
import { useSDKSafe } from "../../core/context";
import {
  migrateActions,
  actionToHref,
  actionTarget,
  isLinkAction,
  isHandlerAction,
  isAnchorAction,
  findLinkAction,
  type NodeAction,
} from "../../utils/action";
import { getClonedState, setClonedProps } from "../../utils/cloneState";
import { useResolvedIcon } from "../../utils/icons/iconResolver";
import { motionIt } from "../../utils/motion";
import { useMounted } from "../../utils/hooks";

import { applyAnimation } from "../../utils/tailwind/tailwind";
import { replaceVariables } from "../../utils/design/variables";
import { useRuntimeVarsVersion } from "../../utils/design/RuntimeVarsContext";
import { resolvePageRef } from "../../utils/page/pageManagement";
import { useScrollToSelected } from "../componentHooks";

import { LazyEditorEmptyLeafHint as EditorEmptyLeafHint } from "../LazyEditorEmptyLeafHint";
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

export interface ButtonProps extends BaseSelectorProps {
  text?: string;
  icon?: IconProps;
  url?: string;
  type?: string;
  action?: NodeAction | NodeAction[];
  click?: any; // Legacy — handled by migrateActions()
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
  const anchors = useAnchors();
  useRuntimeVarsVersion();
  const sdk = useSDKSafe();

  props = setClonedProps(props, query);
  const isMounted = useMounted();

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

  // Subscribe to global state changes so author bindings rerender on state writes.
  useShowHideVersion();

  let baseClassName = props.className || "";
  if (Array.isArray(props.stateModifiers) && props.stateModifiers.length > 0) {
    let rootProps: any = null;
    try {
      rootProps = query.node(ROOT_NODE).get()?.data?.props ?? null;
    } catch {
      /* root may be unavailable in isolated previews */
    }
    baseClassName = applyStateModifiers(
      baseClassName,
      props.stateModifiers,
      buildClientContext(rootProps, itemContext, anchors),
      "Button",
      rootProps
    );
  }

  const prop: any = {
    ref: r => connect(drag(r)),
    className: baseClassName,
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

  // Resolve actions; first link in the chain drives the visible <a href>.
  // Anchor tokens (`{{anchor.X}}`) in target/key/anchor/value/field/dismissTarget
  // are expanded against the nearest <AnchorProvider> so per-instance wrappers
  // (AgentFloatingBubble, CartDrawer, …) can reference their own ids without
  // tree-mutation hacks.
  const actions = resolveAnchorsInActions(migrateActions(props), anchors) as NodeAction[];
  const firstLink = findLinkAction(actions);
  const rawUrl = actionToHref(firstLink, query, router?.asPath);
  let resolvedUrl = rawUrl ? replaceVariables(rawUrl, query, itemContext, anchors) : rawUrl;
  if (resolvedUrl && typeof resolvedUrl === "string" && resolvedUrl.startsWith("ref:")) {
    resolvedUrl = resolvePageRef(resolvedUrl, query, router?.asPath);
  }
  const target = actionTarget(firstLink);

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
  applyAttrs(prop, props.attrs, v => replaceVariables(v, query, itemContext, anchors));
  // Also interpolate item vars into the href (action.href patterns like "?category={{item.slug}}")
  if (typeof prop.href === "string" && prop.href.includes("{{")) {
    prop.href = replaceVariables(prop.href, query, itemContext, anchors);
  }

  if (enabled && ele === "a") ele = "span";

  // Use Next.js Link for internal page links (SPA navigation)
  if (!enabled && isInternalLink && ele === "a") ele = Link;

  // Prevent submit buttons from submitting forms in edit mode
  if (enabled && prop.type === "submit") {
    prop.type = "button";
  }

  applyAriaProps(prop, props);

  // Attach JS handlers for the action chain. Skip the JS hop for the cheap
  // single-non-anchor-link case — `<a href>` lets the browser navigate
  // natively. Multi-action chains, anchor links, and any handler-action
  // (modal/cart/show-hide/etc.) all route through `addActionHandlers`,
  // which composes one onClick that fires every entry in array order.
  const actionCtx = {
    itemContext,
    onAddToCart: sdk?.config.callbacks?.onAddToCart,
    resolvedLinkHref: typeof resolvedUrl === "string" ? resolvedUrl : null,
  };
  const needsJsDispatch =
    actions.length > 1 ||
    actions.some(a => isHandlerAction(a) || isAnchorAction(a)) ||
    // Single non-anchor link with no other actions → browser handles it.
    (actions.length === 1 && !isLinkAction(actions[0]));
  if (needsJsDispatch) {
    addActionHandlers(prop, actions, enabled, actionCtx);
  }

  addCustomHandlers(prop, props.handlers, enabled);

  // Stamp data-action for runtime discovery (e.g. CartProvider badge injection
  // on toggle-cart). Whitespace-separated for multi-action chains so attribute
  // word-match selectors (`[data-action~='toggle-cart']`) still resolve.
  if (actions.length > 0 && !enabled) {
    prop["data-action"] = actions.map(a => a.type).join(" ");
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
    [iconSize, props.icon?.color, props.icon?.shadow]
  );

  const iconSpan = iconElement && (
    <span className={iconClass} aria-hidden="true">
      {iconElement}
    </span>
  );

  const labelHtml = replaceVariables(String(props.text ?? ""), query, itemContext, anchors);
  const hasIconValue = !!props.icon?.value;
  // A button styled as a dot / pill / shape (rounded-full, or sized + bg-*) is
  // intentional chrome — typically a carousel dot, pagination indicator, or
  // status pip. Don't flag it as empty just because it has no text/icon.
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
      idleLabel="Empty button"
      selectedLabel="Drop here or right-click"
    />
  ) : (
    <>
      {(props.icon?.position === "left" || props.icon?.position === "top") && iconSpan}

      {!props.icon?.only && props.text && replaceVariables(props.text, query, itemContext, anchors)}

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
