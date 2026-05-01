import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useEffect, useMemo, useRef } from "react";
import { injectDesignSystemVars } from "@/utils/design/designSystemVars";
import { resolveTheme, writeTheme } from "@/utils/design/resolveTheme";
import { DEFAULT_PALETTE, DEFAULT_DARK_PALETTE, DEFAULT_STYLE_GUIDE } from "@/utils/defaults";
import { getStyleSheets } from "@/utils/dom";
import { fonts } from "@/utils/tailwind";
import { DEFAULT_CUSTOM_FONTS } from "./defaults";
import type { CustomFont, PaletteColor, StyleGuideState } from "./types";
import { useDesignSystemUI } from "./useDesignSystemUI";
import { usePaletteState } from "./usePaletteState";
import { useStyleGuideState } from "./useStyleGuideState";
import { useTypographyState } from "./useTypographyState";

export { DEFAULT_CUSTOM_FONTS } from "./defaults";
export type { CustomFont, PaletteColor, StyleGuideState } from "./types";

/**
 * Composition root for the Design System editor panel.
 * Combines four pure-state slices and owns persistence (load / undo-sync /
 * CSS-var injection / debounced auto-save). Keeping the writeTheme call here —
 * not split across slices — preserves write coordination on ROOT.props.theme.
 */
export function useDesignSystem(isOpen: boolean) {
  const { actions } = useEditor();

  const ui = useDesignSystemUI();
  const palette = usePaletteState();
  const typography = useTypographyState();
  const styleGuide = useStyleGuideState();

  // Save tracking
  const isSaving = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedData = useRef<{
    palette: PaletteColor[];
    darkPalette?: PaletteColor[];
    darkModeEnabled?: boolean;
    styleGuide: StyleGuideState;
    typography?: CustomFont[];
  } | null>(null);

  // Subscribe to ROOT_NODE props (undo/redo)
  const rootNodeData = useEditor(state => {
    const rootNode = state.nodes[ROOT_NODE];
    return (rootNode?.data?.props || {}) as Record<string, unknown>;
  });

  const rootTheme = useMemo(
    () => resolveTheme(rootNodeData as Record<string, any>),
    [rootNodeData.theme]
  );

  // Stable JSON keys avoid infinite loops from new object refs
  const rootPaletteJson = useMemo(() => JSON.stringify(rootTheme.palette), [rootTheme.palette]);
  const rootDarkPaletteJson = useMemo(
    () => JSON.stringify(rootTheme.darkPalette),
    [rootTheme.darkPalette]
  );
  const rootStyleGuideJson = useMemo(
    () => JSON.stringify(rootTheme.styleGuide),
    [rootTheme.styleGuide]
  );
  const rootTypographyJson = useMemo(
    () => JSON.stringify(rootTheme.typography),
    [rootTheme.typography]
  );

  const loadFromRootNode = () => {
    try {
      // Palette
      if (rootTheme.palette && rootTheme.palette.length) {
        palette.setPalettes(rootTheme.palette as PaletteColor[]);
      } else {
        palette.setPalettes(DEFAULT_PALETTE);
      }

      // Dark palette
      if (rootTheme.darkPalette && rootTheme.darkPalette.length) {
        palette.setDarkPalettes(rootTheme.darkPalette as PaletteColor[]);
        palette.setDarkModeEnabled(true);
      } else {
        palette.setDarkPalettes(DEFAULT_DARK_PALETTE);
        palette.setDarkModeEnabled(!!rootTheme.darkModeEnabled);
      }

      // Typography
      if (rootTheme.typography && rootTheme.typography.length) {
        const migratedFonts = (rootTheme.typography as Record<string, unknown>[]).map(font => ({
          ...font,
          fontFamily: Array.isArray(font.fontFamily)
            ? (font.fontFamily as string[])[0]
            : font.fontFamily,
          letterSpacing: font.letterSpacing || "normal",
          textTransform: font.textTransform || "none",
        })) as CustomFont[];
        typography.setCustomFonts(migratedFonts);
      } else {
        typography.setCustomFonts([...DEFAULT_CUSTOM_FONTS]);
      }

      // Style guide
      const sg = (rootTheme.styleGuide || {}) as Record<string, string>;
      const def = DEFAULT_STYLE_GUIDE as Record<string, string>;
      const loaded: Record<string, string> = {};
      for (const key of Object.keys(DEFAULT_STYLE_GUIDE)) {
        loaded[key] = sg[key] || def[key];
      }
      styleGuide.setStyles(loaded as unknown as StyleGuideState);

      lastSavedData.current = {
        palette: rootTheme.palette as PaletteColor[],
        darkPalette: rootTheme.darkPalette as PaletteColor[],
        darkModeEnabled: !!rootTheme.darkModeEnabled,
        styleGuide: loaded as unknown as StyleGuideState,
        typography: rootTheme.typography as CustomFont[],
      };
    } catch (e) {
      console.error("Error loading design system:", e);
    }
  };

  // Load Google Fonts for preview
  useEffect(() => {
    const families = fonts
      .map(font => `family=${(font[0] as string).replace(/ +/g, "+")}:wght@400`)
      .join("&");

    const tokenFonts: string[] = [];
    const headingTok = typography.customFonts.find(t => t.name === "Heading");
    const bodyTok = typography.customFonts.find(t => t.name === "Body");
    if (headingTok?.fontFamily && !headingTok.fontFamily.startsWith("style:")) {
      tokenFonts.push(
        `family=${headingTok.fontFamily.replace(/ +/g, "+")}:wght@${headingTok.fontWeight || "400"}`
      );
    }
    if (bodyTok?.fontFamily && !bodyTok.fontFamily.startsWith("style:")) {
      tokenFonts.push(
        `family=${bodyTok.fontFamily.replace(/ +/g, "+")}:wght@${bodyTok.fontWeight || "400"}`
      );
    }

    const allFamilies = [...families.split("&"), ...tokenFonts].join("&");
    const href = `https://fonts.googleapis.com/css2?${allFamilies}&display=swap`;
    const sheetrefs = getStyleSheets();

    if (!sheetrefs.includes(href)) {
      const preloadLink = document.createElement("link");
      preloadLink.rel = "preload";
      preloadLink.as = "style";
      preloadLink.href = href;
      preloadLink.onload = function () {
        (this as HTMLLinkElement).onload = null;
        (this as HTMLLinkElement).rel = "stylesheet";
      };
      document.getElementsByTagName("HEAD")[0].appendChild(preloadLink);
    }
  }, []);

  // Load on open
  useEffect(() => {
    if (isOpen) loadFromRootNode();
  }, [isOpen]);

  // Sync from external changes (undo/redo)
  useEffect(() => {
    if (!isOpen || isSaving.current || !lastSavedData.current) return;

    const dataChanged =
      rootPaletteJson !== JSON.stringify(lastSavedData.current.palette) ||
      rootDarkPaletteJson !== JSON.stringify(lastSavedData.current.darkPalette) ||
      rootStyleGuideJson !== JSON.stringify(lastSavedData.current.styleGuide) ||
      rootTypographyJson !== JSON.stringify(lastSavedData.current.typography);

    if (dataChanged) {
      // Update lastSavedData BEFORE setting state to prevent re-triggering
      lastSavedData.current = {
        palette: rootTheme.palette as PaletteColor[],
        darkPalette: rootTheme.darkPalette as PaletteColor[],
        darkModeEnabled: !!rootTheme.darkModeEnabled,
        styleGuide: rootTheme.styleGuide as unknown as StyleGuideState,
        typography: rootTheme.typography as CustomFont[],
      };
      loadFromRootNode();
    }
  }, [rootPaletteJson, rootDarkPaletteJson, rootStyleGuideJson, rootTypographyJson]);

  // Keep the editor viewport/theme chrome in sync immediately while the panel is open.
  useEffect(() => {
    if (!isOpen) return;
    injectDesignSystemVars({
      palette: palette.palettes,
      darkPalette: palette.darkModeEnabled ? palette.darkPalettes : undefined,
      darkModeEnabled: palette.darkModeEnabled,
      styleGuide: styleGuide.styles as unknown as Record<string, any>,
      typography: typography.customFonts,
    });
  }, [
    isOpen,
    palette.palettes,
    palette.darkPalettes,
    palette.darkModeEnabled,
    typography.customFonts,
    styleGuide.styles,
  ]);

  // Debounced auto-save
  useEffect(() => {
    if (!isOpen || !lastSavedData.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      isSaving.current = true;
      try {
        actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
          writeTheme(props as Record<string, any>, {
            palette: palette.palettes,
            darkPalette: palette.darkModeEnabled ? palette.darkPalettes : undefined,
            styleGuide: styleGuide.styles as unknown as Record<string, any>,
            typography: typography.customFonts,
          });
        });
        lastSavedData.current = {
          palette: palette.palettes,
          darkPalette: palette.darkModeEnabled ? palette.darkPalettes : undefined,
          darkModeEnabled: palette.darkModeEnabled,
          styleGuide: styleGuide.styles,
          typography: typography.customFonts,
        };
      } catch (e) {
        console.error("Error saving design system:", e);
      }
      setTimeout(() => {
        isSaving.current = false;
      }, 100);
    }, 300);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    isOpen,
    palette.palettes,
    palette.darkPalettes,
    palette.darkModeEnabled,
    typography.customFonts,
    styleGuide.styles,
  ]);

  return {
    // Tab
    activeTab: ui.activeTab,
    setActiveTab: ui.setActiveTab,
    // Sections
    expandedSections: ui.expandedSections,
    toggleSection: ui.toggleSection,
    // Dark mode
    darkModeEnabled: palette.darkModeEnabled,
    colorMode: palette.colorMode,
    toggleDarkMode: palette.toggleDarkMode,
    disableDarkMode: palette.disableDarkMode,
    // Palette (active = light or dark based on colorMode)
    palettes: palette.activePalettes,
    setPalettes: palette.setActivePalettes,
    colorButtonRefs: palette.colorButtonRefs,
    getColorPreview: palette.getColorPreview,
    updateColor: palette.updateColor,
    openColorPicker: palette.openColorPicker,
    updateColorName: palette.updateColorName,
    addColor: palette.addColor,
    deleteColor: palette.deleteColor,
    lightPalettes: palette.palettes,
    darkPalettes: palette.darkPalettes,
    openColorPickerInMode: palette.openColorPickerInMode,
    updateColorNameInMode: palette.updateColorNameInMode,
    addColorInMode: palette.addColorInMode,
    deleteColorInMode: palette.deleteColorInMode,
    setColorMode: palette.setColorMode,
    // Typography
    customFonts: typography.customFonts,
    setCustomFonts: typography.setCustomFonts,
    updateFontName: typography.updateFontName,
    updateFontProperty: typography.updateFontProperty,
    addFont: typography.addFont,
    deleteFont: typography.deleteFont,
    // Styles (grouped)
    styles: styleGuide.styles,
    updateStyle: styleGuide.updateStyle,
    // Font pickers
    openFontPicker: typography.openFontPicker,
    setFontDialog: typography.setFontDialog,
    // Style color pickers
    inputBorderColorButtonRef: styleGuide.inputBorderColorButtonRef,
    inputBgColorButtonRef: styleGuide.inputBgColorButtonRef,
    inputTextColorButtonRef: styleGuide.inputTextColorButtonRef,
    inputPlaceholderColorButtonRef: styleGuide.inputPlaceholderColorButtonRef,
    inputFocusRingColorButtonRef: styleGuide.inputFocusRingColorButtonRef,
    linkColorButtonRef: styleGuide.linkColorButtonRef,
    linkHoverColorButtonRef: styleGuide.linkHoverColorButtonRef,
    openStyleColorPicker: styleGuide.openStyleColorPicker,
  };
}

export type UseDesignSystemReturn = ReturnType<typeof useDesignSystem>;
