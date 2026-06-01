/** Pure body for Button. NO `@craftjs/core`. */
/* eslint-disable react-hooks/rules-of-hooks -- render*Body fns are invoked once from a wrapper component; hook order is preserved. Renamed to use* would change exported public-ish API across the SDK. */
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { TbPointer } from "../_emptyHintIcons";
import { Button as UiButton } from "@pagehub/ui";
import { addActionHandlers } from "../../utils/actions/dispatcher";
import { addCustomHandlers } from "../../utils/actions/customHandlers";
import { useShowHideVersion } from "../../utils/state/showHideStore";
import { applyStateModifiers } from "../../utils/conditions/stateModifiers";
import { buildClientContext } from "../../utils/conditions/context";
import { useItemContext } from "../../utils/itemContext";
import { applyAttrs } from "../../utils/applyAttrs";
import { useAnchors } from "../../utils/anchors/anchorContext";
import { resolveAnchorsInActions } from "../../utils/anchors/resolveAnchorsInAction";
import { useSDKSafe } from "../../core/context";
import { useUiCallbacks } from "../../render/contexts";
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
import { useResolvedIcon } from "../../utils/icons/iconResolver";
import { motionIt } from "../../utils/motion";
import { applyAnimation } from "../../utils/tailwind/tailwind";
import { replaceVariables } from "../../utils/design/variables";
import { useRuntimeVarsVersion } from "../../utils/design/RuntimeVarsContext";
import { resolvePageRef } from "../../utils/page/pageManagement";
import { EditorEmptyLeafHint } from "../../chrome/primitives/EditorEmptyLeafHint";
import { isVisuallyEmptyRichText } from "../../utils/isVisuallyEmptyRichText";
import { BaseSelectorProps, applyAriaProps } from "../selectors";
import type { IconPropInput, LegacyIconFields } from "../shared/iconProp";
import type { RenderCtx } from "../../render/RenderCtx";

export interface ButtonProps extends BaseSelectorProps, LegacyIconFields {
  text?: string;
  icon?: IconPropInput;
  url?: string;
  type?: string;
  action?: NodeAction | NodeAction[];
  click?: any;
}

export const defaultIcon = {
  position: "left" as const,
  size: "w-6 h-6",
  gap: "gap-2",
};

export function renderButtonBody(props: any, ctx: RenderCtx) {
  const router = useRouter();
  const itemContext = useItemContext();
  const anchors = useAnchors();
  useRuntimeVarsVersion();
  const sdk = useSDKSafe();
  const uiCallbacks = useUiCallbacks();

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
    baseClassName = applyStateModifiers(
      baseClassName,
      props.stateModifiers,
      buildClientContext(ctx.rootProps, itemContext, anchors),
      "Button",
      ctx.rootProps
    );
  }

  const prop: any = {
    ref: (r: any) => ctx.connect(ctx.drag(r)),
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
  const rawUrl = actionToHref(firstLink, ctx.pageIndex, router?.asPath);
  let resolvedUrl = rawUrl ? replaceVariables(rawUrl, ctx.rootProps, itemContext, anchors) : rawUrl;
  if (resolvedUrl && typeof resolvedUrl === "string" && resolvedUrl.startsWith("ref:")) {
    resolvedUrl = resolvePageRef(resolvedUrl, ctx.pageIndex, router?.asPath);
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
    if (!ctx.enabled && router?.asPath) {
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
  applyAttrs(prop, props.attrs, v => replaceVariables(v, ctx.rootProps, itemContext, anchors));
  if (typeof prop.href === "string" && prop.href.includes("{{")) {
    prop.href = replaceVariables(prop.href, ctx.rootProps, itemContext, anchors);
  }

  if (ctx.enabled && ele === "a") ele = "span";
  if (!ctx.enabled && isInternalLink && ele === "a") ele = Link;
  if (ctx.enabled && prop.type === "submit") {
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
    onAddToCart: sdk?.config.callbacks?.onAddToCart ?? uiCallbacks?.onAddToCart,
    resolvedLinkHref: typeof resolvedUrl === "string" ? resolvedUrl : null,
  };
  const needsJsDispatch =
    actions.length > 1 ||
    actions.some(a => isHandlerAction(a) || isAnchorAction(a)) ||
    (actions.length === 1 && !isLinkAction(actions[0]));
  if (needsJsDispatch) {
    addActionHandlers(prop, actions, ctx.enabled, actionCtx);
  }

  addCustomHandlers(prop, props.handlers, ctx.enabled, (props as any).handlerOptions);

  if (actions.length > 0 && !ctx.enabled) {
    prop["data-action"] = actions.map(a => a.type).join(" ");
  }

  if (ctx.enabled) {
    prop["data-bounding-box"] = ctx.enabled;
    if (ctx.isMounted) prop["node-id"] = ctx.id;
  }

  const iconSize = props.icon?.size || "w-6 h-6";
  const iconElement = useResolvedIcon(props.icon?.value, ctx.pageMedia);

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

  const labelHtml = replaceVariables(String(props.text ?? ""), ctx.rootProps, itemContext, anchors);
  const hasIconValue = !!props.icon?.value;
  const cn = prop.className || "";
  const looksStyledShape =
    /\brounded-full\b/.test(cn) ||
    (/\bbg-/.test(cn) && (/\bw-\S+/.test(cn) || /\bh-\S+/.test(cn) || /\bsize-\S+/.test(cn)));
  const isLeafEmpty =
    ctx.enabled &&
    ctx.isMounted &&
    !hasIconValue &&
    !looksStyledShape &&
    isVisuallyEmptyRichText(labelHtml);

  const content = isLeafEmpty ? (
    <EditorEmptyLeafHint
      selected={ctx.isActive}
      icon={<TbPointer aria-hidden />}
      idleLabel="Empty button"
      selectedLabel="Drop here or right-click"
    />
  ) : (
    <>
      {(props.icon?.position === "left" || props.icon?.position === "top") && iconSpan}
      {!props.icon?.only && props.text && replaceVariables(props.text, ctx.rootProps, itemContext, anchors)}
      {(props.icon?.position === "right" || props.icon?.position === "bottom") && iconSpan}
    </>
  );

  prop.children = content;

  const final = applyAnimation({ ...prop, key: `${ctx.id}` }, props, null, ctx.enabled);
  const renderComponent = ele === "button" || ele === "a" ? UiButton : ele;
  const finalProps = renderComponent === UiButton ? { ...final, variant: null, size: null } : final;
  return React.createElement(motionIt(props, renderComponent, ctx.enabled), finalProps);
}
