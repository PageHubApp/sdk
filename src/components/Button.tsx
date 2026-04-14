import { useEditor, useNode, UserComponent } from "@craftjs/core";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useMemo, useState } from "react";
import { TbPointer } from "react-icons/tb";
import { Button as UiButton } from "@pagehub/ui";
import { addActionHandlers } from "../utils/clickControls";
import {
  migrateAction,
  actionToHref,
  actionTarget,
  isLinkAction,
  isHandlerAction,
  type NodeAction,
} from "../utils/action";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { resolveIcon } from "../utils/iconResolver";
import {
  registerMaterialSymbolIconUsage,
  unregisterMaterialSymbolIconUsage,
} from "../utils/materialSymbolsAutoLoad";
import {
  materialSymbolsOutlinedFontSpec,
  PH_MS_FONT_PENDING_CLASS,
} from "../utils/materialSymbolsReveal";
import { motionIt } from "../utils/lib";

import { applyAnimation } from "../utils/tailwind/tailwind";
import { replaceVariables } from "../utils/design/variables";
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

/** Tailwind width token on icon.size → text-* for Material Symbols glyph scale */
const iconFontSizeMap: Record<string, string> = {
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

  props = setClonedProps(props, query);

  const iconSizeEarly = props.icon?.size || "w-6 h-6";
  const sizeKey = iconSizeEarly.split(" ")[0];
  const isGoogleIcon = props.icon?.value?.startsWith("ref-google:");
  const googleIconName =
    isGoogleIcon && typeof props.icon?.value === "string"
      ? props.icon.value.replace("ref-google:", "")
      : null;

  const [isMounted, setIsMounted] = useState(false);
  /** Google ligature icons: hide until Font Loading API reports the face (keeps slot via size classes). */
  const [materialSymbolsReady, setMaterialSymbolsReady] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isGoogleIcon) {
      setMaterialSymbolsReady(true);
      return;
    }

    setMaterialSymbolsReady(false);
    let cancelled = false;
    const desc = materialSymbolsOutlinedFontSpec(sizeKey);

    const revealIfCheckPasses = () => {
      if (cancelled || typeof document === "undefined" || !document.fonts) return false;
      if (document.fonts.check(desc)) {
        setMaterialSymbolsReady(true);
        return true;
      }
      return false;
    };

    const timer = window.setTimeout(() => {
      if (!cancelled) revealIfCheckPasses();
    }, 2500);

    if (typeof document === "undefined" || !document.fonts) {
      setMaterialSymbolsReady(true);
      window.clearTimeout(timer);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    void document.fonts
      .load(desc)
      .then(() => {
        if (revealIfCheckPasses()) window.clearTimeout(timer);
      })
      .catch(() => {
        /* Do not reveal on failure — avoids raw ligature text until load succeeds or timeout check passes. */
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isGoogleIcon, sizeKey, googleIconName]);

  // Tab background / bfcache: FontFaceSet can report loaded while paint still uses fallback; re-load + check.
  useEffect(() => {
    if (!isGoogleIcon || typeof document === "undefined" || !document.fonts) return;

    const desc = materialSymbolsOutlinedFontSpec(sizeKey);
    let cancelled = false;

    const retryIfFontMissing = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (document.fonts.check(desc)) {
        setMaterialSymbolsReady(true);
        return;
      }
      setMaterialSymbolsReady(false);
      void document.fonts
        .load(desc)
        .then(() => {
          if (!cancelled && document.fonts.check(desc)) setMaterialSymbolsReady(true);
        })
        .catch(() => {});
    };

    const onVisibility = () => retryIfFontMissing();
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) retryIfFontMissing();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [isGoogleIcon, sizeKey]);

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
  const resolvedUrl = actionToHref(action, query, router?.asPath);
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
    prop["data-tab-active"] = props.defaultActive === true ? "true" : "false";
  }

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  const iconSize = iconSizeEarly;
  const fontSize = iconFontSizeMap[sizeKey] || "text-xl";

  // Memoize icon resolution to avoid unnecessary calls
  const iconElement = useMemo(
    () => (props.icon?.value ? resolveIcon(props.icon.value, query) : null),
    [props.icon?.value, query]
  );

  // Marketing / static-style previews (Frame enabled={false}) never run Background's font loader.
  // Register icon usage so one shared stylesheet covers all Buttons on the page.
  useEffect(() => {
    if (enabled || !googleIconName) return;
    registerMaterialSymbolIconUsage(googleIconName);
    return () => unregisterMaterialSymbolIconUsage(googleIconName);
  }, [enabled, googleIconName]);

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
        isGoogleIcon && !materialSymbolsReady && PH_MS_FONT_PENDING_CLASS,
      ]
        .filter(Boolean)
        .join(" "),
    [iconSize, fontSize, props.icon?.color, props.icon?.shadow, isGoogleIcon, materialSymbolsReady]
  );

  // Always mount icon span for Google icons so width/height utilities reserve space
  const iconSpan = iconElement && (
    <span className={iconClass} aria-hidden="true">
      {iconElement}
    </span>
  );

  const labelHtml = replaceVariables(String(props.text ?? ""), query);
  const hasIconValue = !!props.icon?.value;
  const isLeafEmpty = enabled && isMounted && !hasIconValue && isVisuallyEmptyRichText(labelHtml);

  const content = isLeafEmpty ? (
    <EditorEmptyLeafHint
      selected={isActive}
      icon={<TbPointer aria-hidden />}
      idleLabel="Empty button"
      selectedDetail="Add label or icon in settings"
    />
  ) : (
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
