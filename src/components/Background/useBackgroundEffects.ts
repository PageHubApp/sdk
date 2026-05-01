/**
 * Hook that manages all side-effects for the Background component:
 *  - Global link styles
 *  - Design-system CSS variable injection
 *
 * Header/footer snippet injection is now emitted via next/head in Background.tsx
 * (`chrome/static/runtime/InjectedHeadTags`) so scripts land in initial SSR HTML.
 *
 * Extracted from Background.tsx.
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useEffect } from "react";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "../../utils/defaults";
import { injectDesignSystemVars } from "../../utils/design/designSystemVars";
import { resolveTheme } from "../../utils/design/resolveTheme";

import type { ContainerProps, NamedColor } from "./Background";

interface UseBackgroundEffectsOptions {
  enabled: boolean;
  query: any;
  nodeCount: number;
  props: Partial<ContainerProps>;
  /** Craft node id — only ROOT may run document-wide theme / head injection */
  nodeId: string;
}

export function useBackgroundEffects({
  enabled,
  query,
  nodeCount,
  props,
  nodeId,
}: UseBackgroundEffectsOptions) {
  const isRootBackground = nodeId === ROOT_NODE;

  // ---- Global link styles ----
  useEffect(() => {
    if (typeof window === "undefined" || !isRootBackground) return;

    const head = document.getElementsByTagName("HEAD")[0];
    const styleId = "pagehub-link-styles";
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) head.removeChild(existingStyle);

    // Link underline/offset settings — injected at @layer base so utilities can override.
    // Link COLOR is handled by static CSS in styles.css using --link-color / --link-hover-color vars.
    const theme = resolveTheme(props);
    if (theme.styleGuide) {
      const underline = theme.styleGuide.linkUnderline;
      const offset = theme.styleGuide.linkUnderlineOffset;
      const rules: string[] = [];

      if (underline === "underline") rules.push("text-decoration: underline;");
      else if (underline === "no-underline") rules.push("text-decoration: none;");

      if (offset && offset !== "underline-offset-auto") {
        rules.push(`text-underline-offset: ${offset.replace("underline-offset-", "")}px;`);
      }

      if (rules.length || underline === "hover:underline") {
        const scope = enabled ? 'main[data-renderer="true"]' : ".pagehub-sdk-root";
        const linkStyles = `@layer base {
          ${rules.length ? `${scope} a { ${rules.join(" ")} }` : ""}
          ${underline === "hover:underline" ? `${scope} a:hover { text-decoration: underline; }` : ""}
        }`;
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = linkStyles;
        head.appendChild(style);
      }
    }

    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) head.removeChild(styleToRemove);
    };
  }, [props.theme, enabled, isRootBackground]);

  // ---- Design system CSS variables ----
  useEffect(() => {
    if (typeof window === "undefined" || !enabled || !isRootBackground) return;
    const t = resolveTheme(props);
    injectDesignSystemVars({
      palette: t.palette.length ? t.palette : DEFAULT_PALETTE,
      darkPalette: t.darkPalette || undefined,
      typography: t.typography || [],
      styleGuide:
        t.styleGuide && Object.keys(t.styleGuide).length ? t.styleGuide : DEFAULT_STYLE_GUIDE,
    });
  }, [props.theme, enabled]);
}
