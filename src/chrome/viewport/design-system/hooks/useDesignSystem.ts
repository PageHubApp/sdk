import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAtomState } from "@zedux/react";
import { resolveColorForDisplay } from "@/utils/design/colorSystem";
import { colorToOklch, oklchToHex } from "@/utils/design/contentColor";
import { DEFAULT_PALETTE, DEFAULT_DARK_PALETTE, DEFAULT_STYLE_GUIDE } from "@/utils/defaults";
import { injectDesignSystemVars } from "@/utils/design/designSystemVars";
import { resolveTheme, writeTheme } from "@/utils/design/resolveTheme";
import { getStyleSheets } from "@/utils/lib";
import { fonts } from "@/utils/tailwind";
import { ColorPickerAtom } from "../../../toolbar/dialogs/ColorPickerDialog";
import { FontFamilyDialogAtom } from "../../../toolbar/dialogs/FontFamilyDialog";

// ─── Types ───

export interface PaletteColor {
  name: string;
  color: string;
}

export interface CustomFont {
  name: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
}

export interface StyleGuideState {
  radiusBox: string;
  radiusField: string;
  radiusSelector: string;
  sizeField: string;
  sizeSelector: string;
  depth: string;
  noise: string;
  buttonPadding: string;
  containerPadding: string;
  sectionGap: string;
  containerGap: string;
  contentWidth: string;
  // Spatial scale
  spaceXs: string;
  spaceSm: string;
  spaceMd: string;
  spaceLg: string;
  spaceXl: string;
  spacingDensity: string;
  headingFont: string;
  headingFontFamily: string;
  bodyFont: string;
  bodyFontFamily: string;
  shadowStyle: string;
  // Form inputs
  border: string;
  inputBorderColor: string;
  inputPadding: string;
  inputBgColor: string;
  inputTextColor: string;
  inputPlaceholderColor: string;
  inputFocusRing: string;
  inputFocusRingColor: string;
  // Links
  linkColor: string;
  linkHoverColor: string;
  linkUnderline: string;
  linkUnderlineOffset: string;
}

const DEFAULT_CUSTOM_FONTS: CustomFont[] = [
  {
    name: "Caption",
    fontFamily: "Inter",
    fontSize: "0.875rem",
    fontWeight: "400",
    lineHeight: "1.4",
    letterSpacing: "normal",
    textTransform: "none",
  },
];

// ─── Hook ───

export function useDesignSystem(isOpen: boolean) {
  const { actions, query } = useEditor();
  const [fontDialog, setFontDialog] = useAtomState(FontFamilyDialogAtom);
  const [colorDialog, setColorDialog] = useAtomState(ColorPickerAtom);

  // Tab state
  const [activeTab, setActiveTab] = useState<"colors" | "styles" | "typography">("colors");

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    spacing: true,
    spatial: false,
    typography: true,
    effects: false,
    sizing: false,
    forms: false,
    links: false,
    breakpoints: false,
  });

  // ─── Domain state (grouped) ───
  const [palettes, setPalettes] = useState<PaletteColor[]>(DEFAULT_PALETTE);
  const [darkPalettes, setDarkPalettes] = useState<PaletteColor[]>(DEFAULT_DARK_PALETTE);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  /** Which palette the Colors tab is editing: "light" or "dark" */
  const [colorMode, setColorMode] = useState<"light" | "dark">("light");
  const [customFonts, setCustomFonts] = useState<CustomFont[]>(DEFAULT_CUSTOM_FONTS);
  const [styles, setStyles] = useState<StyleGuideState>({
    ...DEFAULT_STYLE_GUIDE,
  } as StyleGuideState);

  // ─── Refs ───
  const headingFontButtonRef = useRef<HTMLButtonElement>(null);
  const bodyFontButtonRef = useRef<HTMLButtonElement>(null);
  const colorButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const inputBorderColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputBgColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputTextColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputPlaceholderColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputFocusRingColorButtonRef = useRef<HTMLButtonElement>(null);
  const linkColorButtonRef = useRef<HTMLButtonElement>(null);
  const linkHoverColorButtonRef = useRef<HTMLButtonElement>(null);

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

  // Subscribe to ROOT_NODE changes (undo/redo)
  const rootNodeData = useEditor(state => {
    const rootNode = state.nodes[ROOT_NODE];
    return (rootNode?.data?.props || {}) as Record<string, unknown>;
  });

  // Resolve theme from ROOT
  const rootTheme = useMemo(
    () => resolveTheme(rootNodeData as Record<string, any>),
    [rootNodeData.theme]
  );

  // Stable JSON keys for dependency tracking (avoids infinite loops from new object refs)
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

  // ─── Style field updater ───
  const updateStyle = <K extends keyof StyleGuideState>(key: K, value: StyleGuideState[K]) => {
    setStyles(prev => ({ ...prev, [key]: value }));
  };

  // ─── Load from ROOT_NODE ───
  const loadFromRootNode = () => {
    try {
      // Palette
      if (rootTheme.palette && rootTheme.palette.length) {
        setPalettes(rootTheme.palette as PaletteColor[]);
      } else {
        setPalettes(DEFAULT_PALETTE);
      }

      // Dark palette
      if (rootTheme.darkPalette && rootTheme.darkPalette.length) {
        setDarkPalettes(rootTheme.darkPalette as PaletteColor[]);
        setDarkModeEnabled(true);
      } else {
        setDarkPalettes(DEFAULT_DARK_PALETTE);
        setDarkModeEnabled(!!rootTheme.darkModeEnabled);
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
        setCustomFonts(migratedFonts);
      } else {
        setCustomFonts([...DEFAULT_CUSTOM_FONTS]);
      }

      // Style guide
      const sg = (rootTheme.styleGuide || {}) as Record<string, string>;
      const def = DEFAULT_STYLE_GUIDE as Record<string, string>;
      const loaded: Record<string, string> = {};
      for (const key of Object.keys(DEFAULT_STYLE_GUIDE)) {
        loaded[key] = sg[key] || def[key];
      }
      setStyles(loaded as unknown as StyleGuideState);

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

  // ─── Active palette (switches based on colorMode) ───
  const activePalettes = colorMode === "dark" ? darkPalettes : palettes;
  const setActivePalettes = colorMode === "dark" ? setDarkPalettes : setPalettes;
  const getPalettesForMode = (mode: "light" | "dark") =>
    mode === "dark" ? darkPalettes : palettes;
  const setPalettesForMode = (
    mode: "light" | "dark",
    next: PaletteColor[] | ((prev: PaletteColor[]) => PaletteColor[])
  ) => {
    if (mode === "dark") {
      setDarkPalettes(next as any);
    } else {
      setPalettes(next as any);
    }
  };

  // ─── Color helpers ───
  const getColorPreview = (colorValue: unknown): string => {
    if (!colorValue) return "#3b82f6";
    const colorStr = typeof colorValue === "string" ? colorValue : String(colorValue);
    // oklch → hex for the color swatch display
    if (colorStr.startsWith("oklch(")) return oklchToHex(colorStr);
    const resolved = resolveColorForDisplay(colorStr, "", activePalettes);
    return resolved.backgroundColor || "#3b82f6";
  };

  const updateColor = (index: number, color: unknown) => {
    const newPalettes = [...activePalettes];
    let colorValue: string;
    if (typeof color === "string") {
      colorValue = color;
    } else if (color && typeof color === "object") {
      const c = color as Record<string, unknown>;
      if (c.value) {
        if (typeof c.value === "string") {
          if ((c.value as string).startsWith("palette:")) {
            const paletteName = (c.value as string).replace("palette:", "").trim();
            const paletteColor = palettes.find(p => p.name === paletteName);
            colorValue = paletteColor ? paletteColor.color : (c.value as string);
          } else {
            colorValue = c.value as string;
          }
        } else if ((c.value as Record<string, number>).r !== undefined) {
          const rgba = c.value as Record<string, number>;
          colorValue = `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
        } else {
          colorValue = String(c.value);
        }
      } else if ((c as Record<string, number>).r !== undefined) {
        const rgba = c as Record<string, number>;
        colorValue = `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
      } else {
        colorValue = String(color);
      }
    } else {
      colorValue = String(color);
    }

    // Store as oklch natively
    newPalettes[index] = { ...newPalettes[index], color: colorToOklch(colorValue) };
    setActivePalettes(newPalettes);
  };

  const openColorPicker = (index: number) => {
    const buttonRef = colorButtonRefs.current[index];
    if (!buttonRef) return;
    const rect = buttonRef.getBoundingClientRect();
    setColorDialog({
      enabled: true,
      value: activePalettes[index].color.startsWith("oklch(")
        ? oklchToHex(activePalettes[index].color)
        : activePalettes[index].color,
      prefix: "",
      changed: (value: unknown) => updateColor(index, value),
      e: rect,
      mode: "picker",
      propKey: "theme-design-system",
    });
  };

  const updateColorName = (index: number, name: string) => {
    const newPalettes = [...activePalettes];
    newPalettes[index] = { ...newPalettes[index], name };
    setActivePalettes(newPalettes);
  };

  const addColor = () =>
    setActivePalettes([...activePalettes, { name: "New Color", color: "oklch(62% 0.214 259)" }]);
  const deleteColor = (index: number) =>
    setActivePalettes(activePalettes.filter((_, i) => i !== index));

  const openColorPickerInMode = (mode: "light" | "dark", index: number) => {
    const buttonRef = colorButtonRefs.current[index];
    if (!buttonRef) return;
    const palettesForMode = getPalettesForMode(mode);
    const rect = buttonRef.getBoundingClientRect();
    setColorDialog({
      enabled: true,
      value: palettesForMode[index].color.startsWith("oklch(")
        ? oklchToHex(palettesForMode[index].color)
        : palettesForMode[index].color,
      prefix: "",
      changed: (value: unknown) => {
        const current = getPalettesForMode(mode);
        const newPalettes = [...current];
        let colorValue: string;
        if (typeof value === "string") {
          colorValue = value;
        } else if (value && typeof value === "object") {
          const c = value as Record<string, unknown>;
          if (c.value) {
            if (typeof c.value === "string") {
              if ((c.value as string).startsWith("palette:")) {
                const paletteName = (c.value as string).replace("palette:", "").trim();
                const paletteColor = palettes.find(p => p.name === paletteName);
                colorValue = paletteColor ? paletteColor.color : (c.value as string);
              } else {
                colorValue = c.value as string;
              }
            } else if ((c.value as Record<string, number>).r !== undefined) {
              const rgba = c.value as Record<string, number>;
              colorValue = `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
            } else {
              colorValue = String(c.value);
            }
          } else if ((c as Record<string, number>).r !== undefined) {
            const rgba = c as Record<string, number>;
            colorValue = `rgba(${rgba.r},${rgba.g},${rgba.b},${rgba.a})`;
          } else {
            colorValue = String(value);
          }
        } else {
          colorValue = String(value);
        }
        newPalettes[index] = { ...newPalettes[index], color: colorToOklch(colorValue) };
        setPalettesForMode(mode, newPalettes);
      },
      e: rect,
      mode: "picker",
      propKey: "theme-design-system",
    });
  };

  const updateColorNameInMode = (mode: "light" | "dark", index: number, name: string) => {
    const current = getPalettesForMode(mode);
    const newPalettes = [...current];
    newPalettes[index] = { ...newPalettes[index], name };
    setPalettesForMode(mode, newPalettes);
  };

  const addColorInMode = (mode: "light" | "dark") => {
    const current = getPalettesForMode(mode);
    setPalettesForMode(mode, [{ name: "New Color", color: "oklch(62% 0.214 259)" }, ...current]);
  };

  const deleteColorInMode = (mode: "light" | "dark", index: number) => {
    const current = getPalettesForMode(mode);
    setPalettesForMode(
      mode,
      current.filter((_, i) => i !== index)
    );
  };

  const toggleDarkMode = () => {
    if (!darkModeEnabled) {
      // Enabling dark mode — seed with only core semantic tokens that typically change.
      // Colors not listed here inherit their light-mode value automatically.
      const DARK_SEED_NAMES = new Set([
        "Primary",
        "Primary Content",
        "Secondary",
        "Secondary Content",
        "Accent",
        "Accent Content",
        "Neutral",
        "Neutral Content",
        "Base 100",
        "Base 200",
        "Base 300",
        "Base Content",
        "Error",
        "Error Content",
        "Info",
        "Info Content",
        "Success",
        "Success Content",
        "Warning",
        "Warning Content",
        "Border",
        "Input",
        "Ring",
      ]);
      const seeded = palettes.filter(p => DARK_SEED_NAMES.has(p.name)).map(p => ({ ...p }));
      setDarkPalettes(seeded.length > 0 ? seeded : palettes.map(p => ({ ...p })));
      setDarkModeEnabled(true);
      setColorMode("dark");
    } else {
      setColorMode(prev => (prev === "dark" ? "light" : "dark"));
    }
  };

  const disableDarkMode = () => {
    setDarkModeEnabled(false);
    setColorMode("light");
  };

  // ─── Typography helpers ───
  const updateFontName = (index: number, name: string) => {
    const newFonts = [...customFonts];
    newFonts[index] = { ...newFonts[index], name };
    setCustomFonts(newFonts);
  };

  const updateFontProperty = (index: number, property: string, value: string) => {
    const newFonts = [...customFonts];
    const finalValue =
      property === "fontFamily" && Array.isArray(value) ? (value as unknown as string[])[0] : value;
    newFonts[index] = { ...newFonts[index], [property]: finalValue };
    setCustomFonts(newFonts);
  };

  const addFont = () => {
    setCustomFonts([
      {
        name: "New Font",
        fontFamily: "Inter",
        fontSize: "1rem",
        fontWeight: "400",
        lineHeight: "1.5",
        letterSpacing: "normal",
        textTransform: "none",
      },
      ...customFonts,
    ]);
  };

  const deleteFont = (index: number) => setCustomFonts(customFonts.filter((_, i) => i !== index));

  // ─── Font picker helpers ───
  const openFontPicker = (
    buttonRef: React.RefObject<HTMLButtonElement>,
    currentFamily: string,
    onChanged: (family: string) => void
  ) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const currentFont = currentFamily ? currentFamily.split(", ") : [];
    setFontDialog({
      enabled: true,
      value: currentFont,
      originalValue: currentFont,
      changed: (value: unknown) => {
        onChanged(Array.isArray(value) ? (value as string[]).join(", ") : (value as string));
      },
      preview: (value: unknown) => {
        onChanged(Array.isArray(value) ? (value as string[]).join(", ") : (value as string));
      },
      e: rect,
    });
  };

  const openHeadingFontPicker = () =>
    openFontPicker(headingFontButtonRef, styles.headingFontFamily, v =>
      updateStyle("headingFontFamily", v)
    );

  const openBodyFontPicker = () =>
    openFontPicker(bodyFontButtonRef, styles.bodyFontFamily, v => updateStyle("bodyFontFamily", v));

  // ─── Style color picker helper (reusable for all color buttons in styles tab) ───
  const openStyleColorPicker = (
    buttonRef: React.RefObject<HTMLButtonElement>,
    currentValue: string,
    setter: (value: string) => void
  ) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setColorDialog({
      enabled: true,
      value: currentValue,
      prefix: "",
      changed: (value: unknown) => {
        const v = (value as Record<string, unknown>)?.value || value;
        if (typeof v === "string") setter(v);
      },
      e: rect,
    });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // ─── Effects ───

  // Load Google Fonts for preview
  useEffect(() => {
    const families = fonts
      .map(font => `family=${(font[0] as string).replace(/ +/g, "+")}:wght@400`)
      .join("&");

    const styleGuideFonts: string[] = [];
    const weightMap: Record<string, string> = {
      "font-bold": "700",
      "font-semibold": "600",
      "font-medium": "500",
      "font-normal": "400",
    };

    if (styles.headingFontFamily && !styles.headingFontFamily.startsWith("style:")) {
      styleGuideFonts.push(
        `family=${styles.headingFontFamily.replace(/ +/g, "+")}:wght@${weightMap[styles.headingFont] || "400"}`
      );
    }
    if (styles.bodyFontFamily && !styles.bodyFontFamily.startsWith("style:")) {
      styleGuideFonts.push(
        `family=${styles.bodyFontFamily.replace(/ +/g, "+")}:wght@${weightMap[styles.bodyFont] || "400"}`
      );
    }

    const allFamilies = [...families.split("&"), ...styleGuideFonts].join("&");
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
      palette: palettes,
      darkPalette: darkModeEnabled ? darkPalettes : undefined,
      darkModeEnabled,
      styleGuide: styles as unknown as Record<string, any>,
      typography: customFonts,
    });
  }, [isOpen, palettes, darkPalettes, darkModeEnabled, customFonts, styles]);

  // Debounced auto-save
  useEffect(() => {
    if (!isOpen || !lastSavedData.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      isSaving.current = true;
      try {
        actions.setProp(ROOT_NODE, (props: Record<string, unknown>) => {
          writeTheme(props as Record<string, any>, {
            palette: palettes,
            darkPalette: darkModeEnabled ? darkPalettes : undefined,
            styleGuide: styles as unknown as Record<string, any>,
            typography: customFonts,
          });
        });
        lastSavedData.current = {
          palette: palettes,
          darkPalette: darkModeEnabled ? darkPalettes : undefined,
          darkModeEnabled,
          styleGuide: styles,
          typography: customFonts,
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
  }, [isOpen, palettes, darkPalettes, darkModeEnabled, customFonts, styles]);

  return {
    // Tab
    activeTab,
    setActiveTab,
    // Sections
    expandedSections,
    toggleSection,
    // Dark mode
    darkModeEnabled,
    colorMode,
    toggleDarkMode,
    disableDarkMode,
    // Palette (active = light or dark based on colorMode)
    palettes: activePalettes,
    setPalettes: setActivePalettes,
    colorButtonRefs,
    getColorPreview,
    updateColor,
    openColorPicker,
    updateColorName,
    addColor,
    deleteColor,
    lightPalettes: palettes,
    darkPalettes,
    openColorPickerInMode,
    updateColorNameInMode,
    addColorInMode,
    deleteColorInMode,
    setColorMode,
    // Typography
    customFonts,
    setCustomFonts,
    updateFontName,
    updateFontProperty,
    addFont,
    deleteFont,
    // Styles (grouped)
    styles,
    updateStyle,
    // Font pickers
    headingFontButtonRef,
    bodyFontButtonRef,
    openHeadingFontPicker,
    openBodyFontPicker,
    openFontPicker,
    setFontDialog,
    // Style color pickers
    inputBorderColorButtonRef,
    inputBgColorButtonRef,
    inputTextColorButtonRef,
    inputPlaceholderColorButtonRef,
    inputFocusRingColorButtonRef,
    linkColorButtonRef,
    linkHoverColorButtonRef,
    openStyleColorPicker,
  };
}

export type UseDesignSystemReturn = ReturnType<typeof useDesignSystem>;
