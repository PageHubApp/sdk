/**
 * Hook that manages all side-effects for the Background component:
 *  - Material Symbols icon font loading
 *  - Header / footer snippet injection
 *  - Global link styles
 *  - Design-system CSS variable injection
 *
 * Extracted from Background.tsx.
 */
import { useEffect, useRef } from "react";
import { getMaterialSymbolsUrlFromNodes } from "../../utils/data/collectGoogleIcons";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "../../utils/defaults";
import { injectDesignSystemVars } from "../../utils/design/designSystemVars";
import { resolveTheme } from "../../utils/design/resolveTheme";
import { GoogleFontLoadedAtom, useSetAtomState } from "../../utils/atoms";
import { isCssValid, isJsValid } from "../../utils/lib";
import { addElementsToHead } from "./headInjection";
import type { ContainerProps, NamedColor } from "../Background";

interface UseBackgroundEffectsOptions {
  enabled: boolean;
  query: any;
  nodeCount: number;
  props: Partial<ContainerProps>;
}

export function useBackgroundEffects({
  enabled,
  query,
  nodeCount,
  props,
}: UseBackgroundEffectsOptions) {
  const setGoogleFontLoaded = useSetAtomState(GoogleFontLoadedAtom);

  // ---- Material Symbols icon font loading ----
  const prevFontUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled) return;

    try {
      const nodes = query.getSerializedNodes();
      const fontUrl = getMaterialSymbolsUrlFromNodes(nodes);

      if (fontUrl && fontUrl !== prevFontUrlRef.current) {
        const fontId = "google-icons";
        const existingFont = document.getElementById(fontId);
        if (existingFont) existingFont.remove();

        const link = document.createElement("link");
        link.id = fontId;
        link.rel = "stylesheet";
        link.href = fontUrl;
        link.onload = () => setGoogleFontLoaded(true);
        document.head.appendChild(link);
        prevFontUrlRef.current = fontUrl;
      } else if (!fontUrl && prevFontUrlRef.current) {
        const existingFont = document.getElementById("google-icons");
        if (existingFont) existingFont.remove();
        setGoogleFontLoaded(false);
        prevFontUrlRef.current = null;
      }
    } catch (error) {
      console.error("Error loading Material Symbols:", error);
    }
  }, [enabled, query, nodeCount, setGoogleFontLoaded]);

  // ---- Header snippet injection ----
  useEffect(() => {
    if (!enabled) return;
    const head = document.getElementsByTagName("head")[0];
    const elements = addElementsToHead(props.header, head, isCssValid, isJsValid);
    return () => {
      elements?.forEach(el => head.removeChild(el));
    };
  }, [props.header, enabled]);

  // ---- Footer snippet injection ----
  useEffect(() => {
    if (!enabled) return;
    const head = (document.querySelector(".pagehub-sdk-root") || document.body) as HTMLElement;
    const elements = addElementsToHead(props.footer, head, isCssValid, isJsValid);
    return () => {
      elements?.forEach(el => head.removeChild(el));
    };
  }, [props.footer, enabled]);

  // ---- Global link styles ----
  useEffect(() => {
    if (typeof window === "undefined") return;

    const head = document.getElementsByTagName("HEAD")[0];
    const styleId = "pagehub-link-styles";
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) head.removeChild(existingStyle);

    const theme = resolveTheme(props);
    if (theme.styleGuide) {
      const resolveLinkColor = (colorValue: string | undefined): string => {
        if (!colorValue) return "inherit";
        if (colorValue.startsWith("palette:")) {
          const paletteName = colorValue.replace("palette:", "");
          const paletteColor = (theme.palette as NamedColor[]).find(
            p => p.name === paletteName,
          );
          if (paletteColor) return resolveLinkColor(paletteColor.color);
        }
        if (
          colorValue.includes("-") &&
          !colorValue.startsWith("#") &&
          !colorValue.startsWith("rgb")
        ) {
          const colorMap: Record<string, string> = {
            "blue-500": "#3b82f6",
            "purple-500": "#a855f7",
            "orange-500": "#f97316",
            "gray-500": "#6b7280",
            "gray-900": "#111827",
            "gray-50": "#f9fafb",
            "gray-600": "#4b5563",
            white: "#ffffff",
            black: "#000000",
          };
          return colorMap[colorValue] || colorValue;
        }
        return colorValue;
      };

      const selector = enabled
        ? 'main[data-renderer="true"] a:not([class*="no-style"]):not([data-button-link])'
        : 'a:not([class*="no-style"]):not([data-button-link])';

      const linkStyles = `
        ${selector} {
          color: ${resolveLinkColor(theme.styleGuide.linkColor)};
          ${theme.styleGuide.linkUnderline === "underline" ? "text-decoration: underline;" : theme.styleGuide.linkUnderline === "no-underline" ? "text-decoration: none;" : ""};
          ${theme.styleGuide.linkUnderlineOffset && theme.styleGuide.linkUnderlineOffset !== "underline-offset-auto" ? `text-underline-offset: ${theme.styleGuide.linkUnderlineOffset.replace("underline-offset-", "")}px;` : ""};
          transition: color 150ms ease-in-out;
        }
        ${selector}:hover {
          color: ${resolveLinkColor(theme.styleGuide.linkHoverColor)};
          ${theme.styleGuide.linkUnderline === "hover:underline" ? "text-decoration: underline;" : ""};
        }
      `;

      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = linkStyles;
      head.appendChild(style);
    }

    return () => {
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) head.removeChild(styleToRemove);
    };
  }, [props.theme]);

  // ---- Design system CSS variables ----
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;
    const t = resolveTheme(props);
    injectDesignSystemVars({
      palette: t.palette.length ? t.palette : DEFAULT_PALETTE,
      darkPalette: t.darkPalette || undefined,
      typography: t.typography || [],
      styleGuide: t.styleGuide && Object.keys(t.styleGuide).length ? t.styleGuide : DEFAULT_STYLE_GUIDE,
    });
  }, [props.theme, enabled]);

  // ---- Modifier CSS utilities ----
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;
    const modifiers = props.modifiers;
    if (!modifiers || typeof modifiers !== "object") return;

    const rules: string[] = [];
    for (const mods of Object.values(modifiers) as any[]) {
      if (!Array.isArray(mods)) continue;
      for (const mod of mods) {
        if (mod.name && mod.classes) {
          rules.push(`@utility ${mod.name} { @apply ${mod.classes}; }`);
        }
      }
    }
    if (rules.length === 0) return;

    const id = "modifier-utilities";
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = id;
      el.setAttribute("type", "text/tailwindcss");
      document.head.appendChild(el);
    }
    el.textContent = rules.join("\n");
  }, [props.modifiers, enabled]);
}
