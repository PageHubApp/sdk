import { useEditor, useNode, UserComponent } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { Button as UiButton } from "@pagehub/ui";

import { GoogleFontLoadedAtom } from "../utils/atoms";
import { addActionHandlers } from "../utils/clickControls";
import { migrateAction, actionToHref, actionTarget, isLinkAction, isHandlerAction, type NodeAction } from "../utils/action";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { resolveIcon } from "../utils/iconResolver";
import {
  registerMaterialSymbolIconUsage,
  unregisterMaterialSymbolIconUsage,
} from "../utils/materialSymbolsAutoLoad";
import { motionIt } from "../utils/lib";

import { applyAnimation } from "../utils/tailwind/tailwind";
import { replaceVariables } from "../utils/design/variables";
import { useScrollToSelected } from "./lib";

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



  const router = useRouter();

  props = setClonedProps(props, query);

  const [isMounted, setIsMounted] = useState(false);
  const googleFontLoaded = useAtomValue(GoogleFontLoadedAtom);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useScrollToSelected(id, enabled);

  const prop: any = {
    ref: r => connect(drag(r)),
    className: props.className || "",
  };

  // Auto-apply flex layout when icon is present so icon+text sit inline.
  // Only inject flex layout defaults if className does not already set display/flex.
  const hasIcon = !!props.icon?.value;
  if (hasIcon) {
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
  const resolvedUrl = actionToHref(action, query, router?.asPath);
  const target = actionTarget(action);

  const isInternalLink = resolvedUrl && typeof resolvedUrl === "string" && resolvedUrl.startsWith("/");
  let ele: any = resolvedUrl && typeof resolvedUrl === "string" ? "a" : "button";

  if (resolvedUrl && typeof resolvedUrl === "string") {
    prop.href = resolvedUrl;
    prop["data-button-link"] = "true";
    if (target) prop.target = target;
    if (/^https?:\/\//.test(resolvedUrl)) {
      prop.rel = "noopener noreferrer";
    }
  } else if (ele === "button") {
    prop.type = props.type || "button";
  }

  // Ensure icon-only buttons have accessible names (WCAG 4.1.2)
  if (props.icon?.only && !prop["aria-label"]) {
    prop["aria-label"] = props.text || "Button";
  }

  if (enabled && ele === "a") ele = "span";

  // Use Next.js Link for internal page links (SPA navigation)
  if (!enabled && isInternalLink && ele === "a") ele = Link;

  // Prevent submit buttons from submitting forms in edit mode
  if (enabled && prop.type === "submit") {
    prop.type = "button";
  }

  applyAriaProps(prop, props);

  // Attach JS handlers for open-modal, show-hide, scroll-to
  if (isHandlerAction(action)) {
    // For show-hide on buttons, force style method
    const actionForButton =
      action.type === "show-hide" ? { ...action, method: "style" as const } : action;
    addActionHandlers(prop, actionForButton, enabled);
  } else if (action?.type === "scroll-to") {
    addActionHandlers(prop, action, enabled);
  }

  // Tab button: mark with data attribute for active state tracking
  if (action?.type === "show-hide" && action.direction === "tab") {
    prop["data-tab-button"] = "true";
    if (!prop["data-tab-active"]) {
      prop["data-tab-active"] = "true";
    }
  }

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  // Extract size for font-size mapping (for Material Symbols)
  const iconSize = props.icon?.size || "w-6 h-6";
  // Map Tailwind width classes to text size classes for icon fonts
  const fontSizeMap = {
    "w-0": "text-[0px]",
    "w-px": "text-[1px]",
    "w-0.5": "text-[2px]",
    "w-1": "text-[4px]",
    "w-1.5": "text-[6px]",
    "w-2": "text-[8px]",
    "w-2.5": "text-[10px]",
    "w-3": "text-xs",
    "w-3.5": "text-[14px]",
    "w-4": "text-sm",
    "w-5": "text-base",
    "w-6": "text-xl",
    "w-7": "text-2xl",
    "w-8": "text-3xl",
    "w-9": "text-[36px]",
    "w-10": "text-4xl",
    "w-11": "text-[44px]",
    "w-12": "text-5xl",
    "w-14": "text-[56px]",
    "w-16": "text-6xl",
    "w-20": "text-7xl",
    "w-24": "text-8xl",
    "w-28": "text-[112px]",
    "w-32": "text-[128px]",
    "w-36": "text-[144px]",
    "w-40": "text-[160px]",
    "w-44": "text-[176px]",
    "w-48": "text-[192px]",
    "w-52": "text-[208px]",
    "w-56": "text-[224px]",
    "w-60": "text-[240px]",
    "w-64": "text-[256px]",
    "w-72": "text-[288px]",
    "w-80": "text-[320px]",
    "w-96": "text-[384px]",
  };
  const sizeKey = iconSize.split(" ")[0]; // Get first class (e.g., "w-6" from "w-6 h-6")
  const fontSize = fontSizeMap[sizeKey] || "text-xl";

  const isGoogleIcon = props.icon?.value?.startsWith("ref-google:");

  // Memoize icon resolution to avoid unnecessary calls
  const iconElement = useMemo(
    () => (props.icon?.value ? resolveIcon(props.icon.value, query) : null),
    [props.icon?.value, query]
  );

  const googleIconName =
    isGoogleIcon && typeof props.icon?.value === "string"
      ? props.icon.value.replace("ref-google:", "")
      : null;

  // Marketing / static-style previews (Frame enabled={false}) never run Background's font loader.
  // Register icon usage so one shared stylesheet covers all Buttons on the page.
  useEffect(() => {
    if (enabled || !googleIconName) return;
    registerMaterialSymbolIconUsage(googleIconName);
    return () => unregisterMaterialSymbolIconUsage(googleIconName);
  }, [enabled, googleIconName]);

  // Only show icon when font is loaded (prevents flash)
  // For Google icons, always wait for font (both editor and static)
  const shouldShowIcon = iconElement && (!isGoogleIcon || googleFontLoaded);

  // Memoize icon class to avoid re-joining on every render
  const iconClass = useMemo(
    () =>
      [
        iconSize,
        fontSize, // Add font-size for Material Symbols
        props.icon?.color || "fill-current",
        props.icon?.shadow,
        "flex",
        "items-center",
        "justify-center",
        isGoogleIcon && "google-icons", // Add google-icons class for Material Symbols
        isGoogleIcon && !shouldShowIcon && "opacity-0", // Hide text until font loads
      ]
        .filter(Boolean)
        .join(" "),
    [
      iconSize,
      fontSize,
      props.icon?.color,
      props.icon?.shadow,
      isGoogleIcon,
      shouldShowIcon,
    ]
  );

  // DRY: Create icon element once
  const iconSpan = shouldShowIcon && <span className={iconClass}>{iconElement}</span>;

  const content = (
    <>
      {(props.icon?.position === "left" || props.icon?.position === "top") && iconSpan}

      {!props.icon?.only && props.text && replaceVariables(props.text, query)}

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
  const renderComponent = (ele === "button" || ele === "a") ? UiButton : ele;

  // Suppress UiButton's built-in variant/size classes — className is the source of truth.
  const finalProps = renderComponent === UiButton
    ? { ...final, variant: null, size: null }
    : final;

  return React.createElement(motionIt(props, renderComponent, enabled), finalProps);
};

Button.craft = {
  displayName: "Button",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes => nodes.every(node => node.data?.name === "Button"),
  },
};
