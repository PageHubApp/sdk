import { useEditor, useNode, UserComponent } from "@craftjs/core";
import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { TbPointer } from "react-icons/tb";
import { Button as UiButton } from "@pagehub/ui";
import { addActionHandlers } from "../utils/clickControls";
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
import { resolveIcon } from "../utils/iconResolver";
import {
  registerMaterialSymbolIconUsage,
  unregisterMaterialSymbolIconUsage,
} from "../utils/materialSymbolsAutoLoad";
import {
  materialSymbolsOutlinedFontSpec,
  PH_MS_FONT_PENDING_CLASS,
  isMaterialSymbolsFontLoaded,
  markMaterialSymbolsFontLoadedIfReady,
  isMaterialSymbolsFontReady,
} from "../utils/materialSymbolsReveal";
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
  const itemContext = useItemContext();
  const sdk = useSDKSafe();

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
  // Start true if any prior Button already confirmed the font is loaded (e.g. conditional visibility swap).
  // Otherwise start false for Google icons — must match SSR (no document.fonts on server).
  const sharedFlagAtMount = isGoogleIcon && isMaterialSymbolsFontLoaded();
  const [materialSymbolsReady, setMaterialSymbolsReady] = useState(
    !isGoogleIcon || sharedFlagAtMount
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Viewer/static: ensure Material Symbols stylesheet exists before font detection (sync with FOUC #pagehub-auto-material-symbols).
  useLayoutEffect(() => {
    if (enabled || !googleIconName) return;
    registerMaterialSymbolIconUsage(googleIconName);
    return () => unregisterMaterialSymbolIconUsage(googleIconName);
  }, [enabled, googleIconName]);

  // useLayoutEffect: runs before paint so the pending class is removed before the browser renders
  useLayoutEffect(() => {
    if (!isGoogleIcon) {
      setMaterialSymbolsReady(true);
      return;
    }

    // Already confirmed loaded (shared flag) — skip all checks.
    if (isMaterialSymbolsFontLoaded()) {
      setMaterialSymbolsReady(true);
      return;
    }

    const desc = materialSymbolsOutlinedFontSpec(sizeKey);

    // Fast path: font actually loaded (registered face + check passes).
    if (markMaterialSymbolsFontLoadedIfReady(desc)) {
      setMaterialSymbolsReady(true);
      return;
    }

    // Slow path: font CSS may not have loaded yet (@font-face not registered).
    // Use multiple detection strategies since document.fonts.load() resolves
    // immediately with no result when no matching @font-face exists.
    setMaterialSymbolsReady(false);
    let cancelled = false;

    const reveal = () => {
      if (cancelled) return false;
      if (markMaterialSymbolsFontLoadedIfReady(desc)) {
        setMaterialSymbolsReady(true);
        return true;
      }
      return false;
    };

    // 1. Listen for font loading completions — catches delayed CSS → @font-face registration
    const onLoadingDone = () => {
      if (reveal()) cleanup();
    };
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.addEventListener("loadingdone", onLoadingDone);

      // 2. Try direct load (works when @font-face already registered; empty result until CSS registers faces)
      void document.fonts
        .load(desc)
        .then(loaded => {
          if (loaded.length === 0 && !isMaterialSymbolsFontReady(desc)) return;
          if (reveal()) cleanup();
        })
        .catch(() => {});
    }

    // 3. Local fallback: show ligatures so icon-only buttons are not blank forever — do NOT mark global loaded
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setMaterialSymbolsReady(true);
        cleanup();
      }
    }, 2500);

    const cleanup = () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (typeof document !== "undefined" && document.fonts) {
        document.fonts.removeEventListener("loadingdone", onLoadingDone);
      }
    };

    return cleanup;
  }, [isGoogleIcon, sizeKey, googleIconName]);

  // bfcache restore: re-check FontFaceSet without toggling pending on every visibility change
  useEffect(() => {
    if (!isGoogleIcon || typeof document === "undefined" || !document.fonts) return;

    const desc = materialSymbolsOutlinedFontSpec(sizeKey);
    let cancelled = false;

    const onPageShow = (e: PageTransitionEvent) => {
      if (cancelled || !e.persisted) return;
      if (markMaterialSymbolsFontLoadedIfReady(desc)) {
        setMaterialSymbolsReady(true);
        return;
      }
      void document.fonts
        .load(desc)
        .then(() => {
          if (!cancelled && markMaterialSymbolsFontLoadedIfReady(desc)) {
            setMaterialSymbolsReady(true);
          }
        })
        .catch(() => {});
    };

    window.addEventListener("pageshow", onPageShow);
    return () => {
      cancelled = true;
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

  const iconSize = iconSizeEarly;
  const fontSize = iconFontSizeMap[sizeKey] || "text-xl";

  // Memoize icon resolution to avoid unnecessary calls
  const iconElement = useMemo(
    () => (props.icon?.value ? resolveIcon(props.icon.value, query) : null),
    [props.icon?.value, query]
  );

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

  // Google icons: always render text so the browser applies the font in the background.
  // Use color:transparent to hide raw ligature text — when font loads and we reveal,
  // the glyph is already rendered. No insertion = no fallback-font-first-frame flash.
  const iconPendingStyle = isGoogleIcon && !materialSymbolsReady
    ? { color: "transparent" }
    : undefined;

  const iconSpan = iconElement && (
    <span className={iconClass} style={iconPendingStyle} aria-hidden="true">
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
