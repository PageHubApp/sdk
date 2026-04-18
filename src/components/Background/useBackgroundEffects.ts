/**
 * Hook that manages all side-effects for the Background component:
 *  - Material Symbols icon font loading
 *  - Header / footer snippet injection
 *  - Global link styles
 *  - Design-system CSS variable injection
 *
 * Extracted from Background.tsx.
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useEffect, useRef } from "react";
import { getMaterialSymbolsUrlFromNodes } from "../../utils/data/collectGoogleIcons";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "../../utils/defaults";
import { injectDesignSystemVars } from "../../utils/design/designSystemVars";
import { resolveTheme } from "../../utils/design/resolveTheme";
import { isCssValid, isJsValid } from "../../utils/lib";

import type { ContainerProps, NamedColor } from "../Background";
import { addElementsToHead } from "./headInjection";

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

  // ---- Material Symbols icon font loading ----
  const prevFontUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !isRootBackground) return;

    try {
      // Use raw editor state instead of getSerializedNodes() to avoid
      // CraftJS invariant error when a node has an undefined component type.
      const rawNodes = query.getState().nodes;
      const propsMap: Record<string, { props?: Record<string, any> }> = {};
      for (const [id, node] of Object.entries(rawNodes)) {
        if ((node as any)?.data?.props) {
          propsMap[id] = { props: (node as any).data.props };
        }
      }
      const fontUrl = getMaterialSymbolsUrlFromNodes(propsMap);

      if (fontUrl && fontUrl !== prevFontUrlRef.current) {
        const fontId = "google-icons";
        let link = document.getElementById(fontId) as HTMLLinkElement | null;
        if (!link) {
          link = document.createElement("link");
          link.id = fontId;
          link.rel = "stylesheet";
          document.head.appendChild(link);
        }
        if (link.getAttribute("href") !== fontUrl) link.href = fontUrl;
        prevFontUrlRef.current = fontUrl;
      } else if (!fontUrl && prevFontUrlRef.current) {
        const existingFont = document.getElementById("google-icons");
        if (existingFont) existingFont.remove();
        prevFontUrlRef.current = null;
      }
    } catch (error) {
      console.error("Error loading Material Symbols:", error);
    }
  }, [enabled, query, nodeCount, isRootBackground]);

  // ---- Header snippet injection ----
  useEffect(() => {
    if (!enabled || !isRootBackground) return;
    const head = document.getElementsByTagName("head")[0];
    const elements = addElementsToHead(props.header, head, isCssValid, isJsValid);
    return () => {
      elements?.forEach(el => head.removeChild(el));
    };
  }, [props.header, enabled, isRootBackground]);

  // ---- Footer snippet injection ----
  useEffect(() => {
    if (!enabled || !isRootBackground) return;
    const head = (document.querySelector(".pagehub-sdk-root") || document.body) as HTMLElement;
    const elements = addElementsToHead(props.footer, head, isCssValid, isJsValid);
    return () => {
      elements?.forEach(el => head.removeChild(el));
    };
  }, [props.footer, enabled, isRootBackground]);

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
