// @ts-nocheck
import { ROOT_NODE, useEditor } from "@craftjs/core";
import { useEffect, useRef, useState } from "react";
import {
  TbChevronDown,
  TbChevronRight,
  TbPalette,
  TbPlus,
  TbRuler,
  TbTrash,
  TbTypography,
} from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { resolveColorForDisplay } from "utils/design/colorSystem";
import { DEFAULT_PALETTE, DEFAULT_STYLE_GUIDE } from "utils/defaults";
import { toPaletteCSSVarName } from "utils/design/designSystemVars";
import { getStyleSheets } from "utils/lib";
import { fonts } from "utils/tailwind";
import { FloatingPanel } from "../FloatingPanel";
import { ColorPickerAtom } from "../Toolbar/Tools/ColorPickerDialog";
import { FontFamilyDialogAtom } from "../Toolbar/Tools/FontFamilyDialog";

interface DesignSystemSidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

/**
 * Design System Modal - Full-featured modal for managing colors, typography, and style guide settings
 * Replaces the old sidebar implementation with a centered modal dialog
 */
export const DesignSystemSidebar = ({ isOpen, onClose }: DesignSystemSidebarProps) => {
  const { actions, query } = useEditor();
  const [activeTab, setActiveTab] = useState<"colors" | "styles" | "typography">("colors");
  const [fontDialog, setFontDialog] = useAtomState(FontFamilyDialogAtom);
  const [colorDialog, setColorDialog] = useAtomState(ColorPickerAtom);

  const headingFontButtonRef = useRef<HTMLButtonElement>(null);
  const bodyFontButtonRef = useRef<HTMLButtonElement>(null);
  const colorButtonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});
  const inputBorderColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputBgColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputTextColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputPlaceholderColorButtonRef = useRef<HTMLButtonElement>(null);
  const inputFocusRingColorButtonRef = useRef<HTMLButtonElement>(null);
  const linkColorButtonRef = useRef<HTMLButtonElement>(null);
  const linkHoverColorButtonRef = useRef<HTMLButtonElement>(null);

  // Collapsible section state
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    spacing: true,
    typography: true,
    effects: false,
    forms: false,
    links: false,
  });

  // Color Palette State
  const [pallets, setPallets] = useState(DEFAULT_PALETTE);

  // Typography State
  const [customFonts, setCustomFonts] = useState([
    {
      name: "Caption",
      fontFamily: "Inter",
      fontSize: "0.875rem",
      fontWeight: "400",
      lineHeight: "1.4",
      letterSpacing: "normal",
      textTransform: "none",
    },
  ]);

  // Style Guide State
  const [borderRadius, setBorderRadius] = useState(DEFAULT_STYLE_GUIDE.borderRadius);
  const [buttonPadding, setButtonPadding] = useState(DEFAULT_STYLE_GUIDE.buttonPadding);
  const [containerPadding, setContainerPadding] = useState(DEFAULT_STYLE_GUIDE.containerPadding);
  const [sectionGap, setSectionGap] = useState(DEFAULT_STYLE_GUIDE.sectionGap);
  const [containerGap, setContainerGap] = useState(DEFAULT_STYLE_GUIDE.containerGap);
  const [contentWidth, setContentWidth] = useState(DEFAULT_STYLE_GUIDE.contentWidth);
  const [headingFont, setHeadingFont] = useState(DEFAULT_STYLE_GUIDE.headingFont);
  const [headingFontFamily, setHeadingFontFamily] = useState(DEFAULT_STYLE_GUIDE.headingFontFamily);
  const [bodyFont, setBodyFont] = useState(DEFAULT_STYLE_GUIDE.bodyFont);
  const [bodyFontFamily, setBodyFontFamily] = useState(DEFAULT_STYLE_GUIDE.bodyFontFamily);
  const [shadowStyle, setShadowStyle] = useState(DEFAULT_STYLE_GUIDE.shadowStyle);

  // Form Input State
  const [inputBorderWidth, setInputBorderWidth] = useState(DEFAULT_STYLE_GUIDE.inputBorderWidth);
  const [inputBorderColor, setInputBorderColor] = useState(DEFAULT_STYLE_GUIDE.inputBorderColor);
  const [inputBorderRadius, setInputBorderRadius] = useState(DEFAULT_STYLE_GUIDE.inputBorderRadius);
  const [inputPadding, setInputPadding] = useState(DEFAULT_STYLE_GUIDE.inputPadding);
  const [inputBgColor, setInputBgColor] = useState(DEFAULT_STYLE_GUIDE.inputBgColor);
  const [inputTextColor, setInputTextColor] = useState(DEFAULT_STYLE_GUIDE.inputTextColor);
  const [inputPlaceholderColor, setInputPlaceholderColor] = useState(
    DEFAULT_STYLE_GUIDE.inputPlaceholderColor
  );
  const [inputFocusRing, setInputFocusRing] = useState(DEFAULT_STYLE_GUIDE.inputFocusRing);
  const [inputFocusRingColor, setInputFocusRingColor] = useState(
    DEFAULT_STYLE_GUIDE.inputFocusRingColor
  );

  // Link State
  const [linkColor, setLinkColor] = useState(DEFAULT_STYLE_GUIDE.linkColor);
  const [linkHoverColor, setLinkHoverColor] = useState(DEFAULT_STYLE_GUIDE.linkHoverColor);
  const [linkUnderline, setLinkUnderline] = useState(DEFAULT_STYLE_GUIDE.linkUnderline);
  const [linkUnderlineOffset, setLinkUnderlineOffset] = useState(
    DEFAULT_STYLE_GUIDE.linkUnderlineOffset
  );

  // Track if we're currently saving
  const isSaving = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedData = useRef<any>(null);

  // Subscribe to ROOT_NODE changes (for undo/redo and other updates)
  const rootNodeData = useEditor(state => {
    const rootNode = state.nodes[ROOT_NODE];
    return rootNode?.data?.props || {};
  });

  // Load Google Fonts for preview
  useEffect(() => {
    // Load all font families with Google Fonts CSS2 API for better performance
    const families = fonts
      .map(font => {
        const family = font[0].replace(/ +/g, "+");
        return `family=${family}:wght@400`;
      })
      .join("&");

    // Add the current style guide font families with proper weights
    const styleGuideFonts = [];
    if (headingFontFamily && !headingFontFamily.startsWith("style:")) {
      // Convert Tailwind font weight classes to numeric values
      const headingWeight =
        headingFont === "font-bold"
          ? "700"
          : headingFont === "font-semibold"
            ? "600"
            : headingFont === "font-medium"
              ? "500"
              : headingFont === "font-normal"
                ? "400"
                : "400";
      styleGuideFonts.push(`family=${headingFontFamily.replace(/ +/g, "+")}:wght@${headingWeight}`);
    }
    if (bodyFontFamily && !bodyFontFamily.startsWith("style:")) {
      // Convert Tailwind font weight classes to numeric values
      const bodyWeight =
        bodyFont === "font-bold"
          ? "700"
          : bodyFont === "font-semibold"
            ? "600"
            : bodyFont === "font-medium"
              ? "500"
              : bodyFont === "font-normal"
                ? "400"
                : "400";
      styleGuideFonts.push(`family=${bodyFontFamily.replace(/ +/g, "+")}:wght@${bodyWeight}`);
    }

    const allFamilies = [...families.split("&"), ...styleGuideFonts].join("&");

    const sheetrefs = getStyleSheets();
    let href = `https://fonts.googleapis.com/css2?${allFamilies}`;
    href += "&display=swap";

    if (!sheetrefs.includes(href)) {
      const head = document.getElementsByTagName("HEAD")[0];

      // Use preload pattern for faster font loading
      const preloadLink = document.createElement("link");
      preloadLink.rel = "preload";
      preloadLink.as = "style";
      preloadLink.href = href;

      // Convert to stylesheet after loading
      preloadLink.onload = function () {
        (this as HTMLLinkElement).onload = null;
        (this as HTMLLinkElement).rel = "stylesheet";
      };

      head.appendChild(preloadLink);
    }
  }, []);

  // Load current values from ROOT_NODE when panel opens
  useEffect(() => {
    if (isOpen) {
      try {
        // Load palette
        if (rootNodeData.pallet && Array.isArray(rootNodeData.pallet)) {
          setPallets(rootNodeData.pallet);
        } else {
          setPallets(DEFAULT_PALETTE);
        }

        // Load typography
        if (rootNodeData.typography && Array.isArray(rootNodeData.typography)) {
          // Ensure backward compatibility by adding default values for new properties
          const migratedFonts = rootNodeData.typography.map((font: any) => ({
            ...font,
            // Normalize fontFamily to always be a string (fix for legacy array data)
            fontFamily: Array.isArray(font.fontFamily) ? font.fontFamily[0] : font.fontFamily,
            letterSpacing: font.letterSpacing || "normal",
            textTransform: font.textTransform || "none",
          }));
          setCustomFonts(migratedFonts);
        } else {
          setCustomFonts([
            {
              name: "Caption Font",
              fontFamily: "Inter",
              fontSize: "0.875rem",
              fontWeight: "400",
              lineHeight: "1.4",
              letterSpacing: "normal",
              textTransform: "none",
            },
          ]);
        }

        // Load style guide
        const styleGuide = rootNodeData.styleGuide || {};
        setBorderRadius(styleGuide.borderRadius || DEFAULT_STYLE_GUIDE.borderRadius);
        setButtonPadding(styleGuide.buttonPadding || DEFAULT_STYLE_GUIDE.buttonPadding);
        setContainerPadding(styleGuide.containerPadding || DEFAULT_STYLE_GUIDE.containerPadding);
        setSectionGap(styleGuide.sectionGap || DEFAULT_STYLE_GUIDE.sectionGap);
        setContainerGap(styleGuide.containerGap || DEFAULT_STYLE_GUIDE.containerGap);
        setContentWidth(styleGuide.contentWidth || DEFAULT_STYLE_GUIDE.contentWidth);
        setHeadingFont(styleGuide.headingFont || DEFAULT_STYLE_GUIDE.headingFont);
        setHeadingFontFamily(styleGuide.headingFontFamily || DEFAULT_STYLE_GUIDE.headingFontFamily);
        setBodyFont(styleGuide.bodyFont || DEFAULT_STYLE_GUIDE.bodyFont);
        setBodyFontFamily(styleGuide.bodyFontFamily || DEFAULT_STYLE_GUIDE.bodyFontFamily);
        setShadowStyle(styleGuide.shadowStyle || DEFAULT_STYLE_GUIDE.shadowStyle);
        setInputBorderWidth(styleGuide.inputBorderWidth || DEFAULT_STYLE_GUIDE.inputBorderWidth);
        setInputBorderColor(styleGuide.inputBorderColor || DEFAULT_STYLE_GUIDE.inputBorderColor);
        setInputBorderRadius(styleGuide.inputBorderRadius || DEFAULT_STYLE_GUIDE.inputBorderRadius);
        setInputPadding(styleGuide.inputPadding || DEFAULT_STYLE_GUIDE.inputPadding);
        setInputBgColor(styleGuide.inputBgColor || DEFAULT_STYLE_GUIDE.inputBgColor);
        setInputTextColor(styleGuide.inputTextColor || DEFAULT_STYLE_GUIDE.inputTextColor);
        setInputPlaceholderColor(
          styleGuide.inputPlaceholderColor || DEFAULT_STYLE_GUIDE.inputPlaceholderColor
        );
        setInputFocusRing(styleGuide.inputFocusRing || DEFAULT_STYLE_GUIDE.inputFocusRing);
        setInputFocusRingColor(
          styleGuide.inputFocusRingColor || DEFAULT_STYLE_GUIDE.inputFocusRingColor
        );
        setLinkColor(styleGuide.linkColor || DEFAULT_STYLE_GUIDE.linkColor);
        setLinkHoverColor(styleGuide.linkHoverColor || DEFAULT_STYLE_GUIDE.linkHoverColor);
        setLinkUnderline(styleGuide.linkUnderline || DEFAULT_STYLE_GUIDE.linkUnderline);
        setLinkUnderlineOffset(
          styleGuide.linkUnderlineOffset || DEFAULT_STYLE_GUIDE.linkUnderlineOffset
        );

        // Store what we loaded
        lastSavedData.current = {
          pallet: rootNodeData.pallet,
          styleGuide: rootNodeData.styleGuide,
        };
      } catch (e) {
        console.error("Error loading design system:", e);
      }
    }
  }, [isOpen]);

  // Only update from external changes (undo/redo) - not from our own saves
  useEffect(() => {
    if (isOpen && !isSaving.current && lastSavedData.current) {
      // Check if the data actually changed from what we last saved
      const dataChanged =
        JSON.stringify(rootNodeData.pallet) !== JSON.stringify(lastSavedData.current.pallet) ||
        JSON.stringify(rootNodeData.styleGuide) !==
          JSON.stringify(lastSavedData.current.styleGuide);

      if (dataChanged) {
        try {
          // Load palette
          if (rootNodeData.pallet && Array.isArray(rootNodeData.pallet)) {
            setPallets(rootNodeData.pallet);
          } else {
            setPallets(DEFAULT_PALETTE);
          }

          // Load style guide
          const styleGuide = rootNodeData.styleGuide || {};
          setBorderRadius(styleGuide.borderRadius || DEFAULT_STYLE_GUIDE.borderRadius);
          setButtonPadding(styleGuide.buttonPadding || DEFAULT_STYLE_GUIDE.buttonPadding);
          setContainerPadding(styleGuide.containerPadding || DEFAULT_STYLE_GUIDE.containerPadding);
          setSectionGap(styleGuide.sectionGap || DEFAULT_STYLE_GUIDE.sectionGap);
          setContainerGap(styleGuide.containerGap || DEFAULT_STYLE_GUIDE.containerGap);
          setContentWidth(styleGuide.contentWidth || DEFAULT_STYLE_GUIDE.contentWidth);
          setHeadingFont(styleGuide.headingFont || DEFAULT_STYLE_GUIDE.headingFont);
          setHeadingFontFamily(
            styleGuide.headingFontFamily || DEFAULT_STYLE_GUIDE.headingFontFamily
          );
          setBodyFont(styleGuide.bodyFont || DEFAULT_STYLE_GUIDE.bodyFont);
          setBodyFontFamily(styleGuide.bodyFontFamily || DEFAULT_STYLE_GUIDE.bodyFontFamily);
          setShadowStyle(styleGuide.shadowStyle || DEFAULT_STYLE_GUIDE.shadowStyle);
          setInputBorderWidth(styleGuide.inputBorderWidth || DEFAULT_STYLE_GUIDE.inputBorderWidth);
          setInputBorderColor(styleGuide.inputBorderColor || DEFAULT_STYLE_GUIDE.inputBorderColor);
          setInputBorderRadius(
            styleGuide.inputBorderRadius || DEFAULT_STYLE_GUIDE.inputBorderRadius
          );
          setInputPadding(styleGuide.inputPadding || DEFAULT_STYLE_GUIDE.inputPadding);
          setInputBgColor(styleGuide.inputBgColor || DEFAULT_STYLE_GUIDE.inputBgColor);
          setInputTextColor(styleGuide.inputTextColor || DEFAULT_STYLE_GUIDE.inputTextColor);
          setInputPlaceholderColor(
            styleGuide.inputPlaceholderColor || DEFAULT_STYLE_GUIDE.inputPlaceholderColor
          );
          setInputFocusRing(styleGuide.inputFocusRing || DEFAULT_STYLE_GUIDE.inputFocusRing);
          setInputFocusRingColor(
            styleGuide.inputFocusRingColor || DEFAULT_STYLE_GUIDE.inputFocusRingColor
          );
          setLinkColor(styleGuide.linkColor || DEFAULT_STYLE_GUIDE.linkColor);
          setLinkHoverColor(styleGuide.linkHoverColor || DEFAULT_STYLE_GUIDE.linkHoverColor);
          setLinkUnderline(styleGuide.linkUnderline || DEFAULT_STYLE_GUIDE.linkUnderline);
          setLinkUnderlineOffset(
            styleGuide.linkUnderlineOffset || DEFAULT_STYLE_GUIDE.linkUnderlineOffset
          );

          // Update last saved data
          lastSavedData.current = {
            pallet: rootNodeData.pallet,
            typography: rootNodeData.typography,
            styleGuide: rootNodeData.styleGuide,
          };
        } catch (e) {
          console.error("Error loading design system:", e);
        }
      }
    }
  }, [rootNodeData]);

  // Debounced auto-save when values change
  useEffect(() => {
    if (isOpen && lastSavedData.current) {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout to save after 300ms of no changes
      saveTimeoutRef.current = setTimeout(() => {
        isSaving.current = true;

        try {
          const newData = {
            pallet: pallets,
            typography: customFonts,
            styleGuide: {
              borderRadius,
              buttonPadding,
              containerPadding,
              sectionGap,
              containerGap,
              contentWidth,
              headingFont,
              headingFontFamily,
              bodyFont,
              bodyFontFamily,
              shadowStyle,
              inputBorderWidth,
              inputBorderColor,
              inputBorderRadius,
              inputPadding,
              inputBgColor,
              inputTextColor,
              inputPlaceholderColor,
              inputFocusRing,
              inputFocusRingColor,
              linkColor,
              linkHoverColor,
              linkUnderline,
              linkUnderlineOffset,
            },
          };

          actions.setProp(ROOT_NODE, props => {
            props.pallet = newData.pallet;
            props.typography = newData.typography;
            props.styleGuide = newData.styleGuide;
          });

          // Update last saved data
          lastSavedData.current = newData;
        } catch (e) {
          console.error("Error saving design system:", e);
        }

        // Reset saving flag after a short delay
        setTimeout(() => {
          isSaving.current = false;
        }, 100);
      }, 300);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    isOpen,
    pallets,
    customFonts,
    borderRadius,
    buttonPadding,
    containerPadding,
    sectionGap,
    containerGap,
    contentWidth,
    headingFont,
    headingFontFamily,
    bodyFont,
    bodyFontFamily,
    shadowStyle,
    inputBorderWidth,
    inputBorderColor,
    inputBorderRadius,
    inputPadding,
    inputBgColor,
    inputTextColor,
    inputPlaceholderColor,
    inputFocusRing,
    inputFocusRingColor,
    linkColor,
    linkHoverColor,
    linkUnderline,
    linkUnderlineOffset,
  ]);

  // Helper to convert Tailwind color to hex for preview
  const getColorPreview = (colorValue: any): string => {
    // Handle null/undefined
    if (!colorValue) {
      return "#3b82f6";
    }

    // Convert to string if it's not already
    const colorStr = typeof colorValue === "string" ? colorValue : String(colorValue);

    // Use the color system utility for resolving colors
    const resolved = resolveColorForDisplay(colorStr, "", pallets);
    return resolved.backgroundColor || "#3b82f6";
  };

  const updateColor = (index: number, color: any) => {
    const newPallets = [...pallets];

    // Convert color to string format
    let colorValue: string;
    if (typeof color === "string") {
      colorValue = color;
    } else if (color && typeof color === "object") {
      // Handle {type, value} format from color picker
      if (color.value) {
        if (typeof color.value === "string") {
          // If it's a palette reference like "palette:Primary", resolve it to the actual color
          if (color.value.startsWith("palette:")) {
            const paletteName = color.value.replace("palette:", "").trim();
            const paletteColor = pallets.find(p => p.name === paletteName);
            colorValue = paletteColor ? paletteColor.color : color.value;
          } else {
            colorValue = color.value;
          }
        } else if (color.value.r !== undefined) {
          // RGBA object
          colorValue = `rgba(${color.value.r},${color.value.g},${color.value.b},${color.value.a})`;
        } else {
          colorValue = String(color.value);
        }
      } else if (color.r !== undefined) {
        // Direct RGBA object
        colorValue = `rgba(${color.r},${color.g},${color.b},${color.a})`;
      } else {
        colorValue = String(color);
      }
    } else {
      colorValue = String(color);
    }

    newPallets[index] = { ...newPallets[index], color: colorValue };
    setPallets(newPallets);
  };

  const openColorPicker = (index: number) => {
    const buttonRef = colorButtonRefs.current[index];
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setColorDialog({
        enabled: true,
        value: pallets[index].color,
        prefix: "",
        changed: (value: any) => {
          updateColor(index, value);
        },
        e: rect,
        mode: "picker", // Only show picker mode in design system
        propKey: "pallet-design-system", // Identify this as palette editing
      });
    }
  };

  const updateColorName = (index: number, name: string) => {
    const newPallets = [...pallets];
    newPallets[index] = { ...newPallets[index], name };
    setPallets(newPallets);
  };

  const addColor = () => {
    setPallets([...pallets, { name: "New Color", color: "#3b82f6" }]);
  };

  const deleteColor = (index: number) => {
    const newPallets = pallets.filter((_, i) => i !== index);
    setPallets(newPallets);
  };

  // Typography management functions
  const updateFontName = (index: number, name: string) => {
    const newFonts = [...customFonts];
    newFonts[index] = { ...newFonts[index], name };
    setCustomFonts(newFonts);
  };

  const updateFontProperty = (index: number, property: string, value: string) => {
    const newFonts = [...customFonts];
    // Ensure fontFamily is always stored as a string, not an array
    const finalValue = property === "fontFamily" && Array.isArray(value) ? value[0] : value;
    newFonts[index] = { ...newFonts[index], [property]: finalValue };
    setCustomFonts(newFonts);
  };

  const addFont = () => {
    setCustomFonts([
      ...customFonts,
      {
        name: "New Font",
        fontFamily: "Inter",
        fontSize: "1rem",
        fontWeight: "400",
        lineHeight: "1.5",
        letterSpacing: "normal",
        textTransform: "none",
      },
    ]);
  };

  const deleteFont = (index: number) => {
    const newFonts = customFonts.filter((_, i) => i !== index);
    setCustomFonts(newFonts);
  };

  // Font picker handlers
  const openHeadingFontPicker = () => {
    if (headingFontButtonRef.current) {
      const rect = headingFontButtonRef.current.getBoundingClientRect();
      // Convert string to array format for the dialog
      const currentFont = headingFontFamily ? headingFontFamily.split(", ") : [];
      setFontDialog({
        enabled: true,
        value: currentFont,
        originalValue: currentFont, // Store original value for reset on cancel
        changed: (value: any) => {
          // Store as comma-separated string
          setHeadingFontFamily(Array.isArray(value) ? value.join(", ") : value);
        },
        preview: (value: any) => {
          // Temporarily preview the font without saving
          const fontFamily = Array.isArray(value) ? value.join(", ") : value;
          setHeadingFontFamily(fontFamily);
        },
        e: rect,
      });
    }
  };

  const openBodyFontPicker = () => {
    if (bodyFontButtonRef.current) {
      const rect = bodyFontButtonRef.current.getBoundingClientRect();
      // Convert string to array format for the dialog
      const currentFont = bodyFontFamily ? bodyFontFamily.split(", ") : [];
      setFontDialog({
        enabled: true,
        value: currentFont,
        originalValue: currentFont, // Store original value for reset on cancel
        changed: (value: any) => {
          // Store as comma-separated string
          setBodyFontFamily(Array.isArray(value) ? value.join(", ") : value);
        },
        preview: (value: any) => {
          // Temporarily preview the font without saving
          const fontFamily = Array.isArray(value) ? value.join(", ") : value;
          setBodyFontFamily(fontFamily);
        },
        e: rect,
      });
    }
  };

  const openInputBorderColorPicker = () => {
    if (inputBorderColorButtonRef.current) {
      const rect = inputBorderColorButtonRef.current.getBoundingClientRect();
      setColorDialog({
        enabled: true,
        value: inputBorderColor,
        prefix: "",
        changed: (value: any) => {
          // Just save the color value without prefix
          let colorValue = value.value || value;
          if (typeof colorValue === "string") {
            setInputBorderColor(colorValue);
          }
        },
        e: rect,
      });
    }
  };

  const openInputBgColorPicker = () => {
    if (inputBgColorButtonRef.current) {
      const rect = inputBgColorButtonRef.current.getBoundingClientRect();
      setColorDialog({
        enabled: true,
        value: inputBgColor,
        prefix: "",
        changed: (value: any) => {
          let colorValue = value.value || value;
          if (typeof colorValue === "string") {
            setInputBgColor(colorValue);
          }
        },
        e: rect,
      });
    }
  };

  const openInputTextColorPicker = () => {
    if (inputTextColorButtonRef.current) {
      const rect = inputTextColorButtonRef.current.getBoundingClientRect();
      setColorDialog({
        enabled: true,
        value: inputTextColor,
        prefix: "",
        changed: (value: any) => {
          let colorValue = value.value || value;
          if (typeof colorValue === "string") {
            setInputTextColor(colorValue);
          }
        },
        e: rect,
      });
    }
  };

  const openInputPlaceholderColorPicker = () => {
    if (inputPlaceholderColorButtonRef.current) {
      const rect = inputPlaceholderColorButtonRef.current.getBoundingClientRect();
      setColorDialog({
        enabled: true,
        value: inputPlaceholderColor,
        prefix: "",
        changed: (value: any) => {
          let colorValue = value.value || value;
          if (typeof colorValue === "string") {
            setInputPlaceholderColor(colorValue);
          }
        },
        e: rect,
      });
    }
  };

  const openInputFocusRingColorPicker = () => {
    if (inputFocusRingColorButtonRef.current) {
      const rect = inputFocusRingColorButtonRef.current.getBoundingClientRect();
      setColorDialog({
        enabled: true,
        value: inputFocusRingColor,
        prefix: "",
        changed: (value: any) => {
          // Just save the color value without prefix
          let colorValue = value.value || value;
          if (typeof colorValue === "string") {
            setInputFocusRingColor(colorValue);
          }
        },
        e: rect,
      });
    }
  };

  const openLinkColorPicker = () => {
    if (linkColorButtonRef.current) {
      const rect = linkColorButtonRef.current.getBoundingClientRect();
      setColorDialog({
        enabled: true,
        value: linkColor,
        prefix: "",
        changed: (value: any) => {
          let colorValue = value.value || value;
          if (typeof colorValue === "string") {
            setLinkColor(colorValue);
          }
        },
        e: rect,
      });
    }
  };

  const openLinkHoverColorPicker = () => {
    if (linkHoverColorButtonRef.current) {
      const rect = linkHoverColorButtonRef.current.getBoundingClientRect();
      setColorDialog({
        enabled: true,
        value: linkHoverColor,
        prefix: "",
        changed: (value: any) => {
          let colorValue = value.value || value;
          if (typeof colorValue === "string") {
            setLinkHoverColor(colorValue);
          }
        },
        e: rect,
      });
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const CollapsibleSection = ({
    title,
    section,
    children,
  }: {
    title: string;
    section: string;
    children: React.ReactNode;
  }) => (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => toggleSection(section)}
        className="flex w-full items-center justify-between bg-muted px-3 py-2 text-left transition-colors hover:bg-muted/80"
      >
        <span className="text-sm font-semibold text-muted-foreground">{title}</span>
        {expandedSections[section] ? (
          <TbChevronDown className="text-muted-foreground" size={18} />
        ) : (
          <TbChevronRight className="text-muted-foreground" size={18} />
        )}
      </button>
      {expandedSections[section] && (
        <div className="space-y-3 bg-background p-3 text-foreground">{children}</div>
      )}
    </div>
  );

  return (
    <FloatingPanel
      isOpen={isOpen}
      onClose={onClose}
      title="Design System"
      icon={<TbPalette className="size-4" />}
      storageKey="design-system"
      defaultWidth={450}
      defaultHeight={640}
      minWidth={350}
      maxWidth={700}
      minHeight={400}
      edges={["e", "s", "se"]}
      initialPosition={{ x: 40, y: 40 }}
      zIndex={100}
    >
          {/* Tabs */}
          <div className="flex border-b border-border bg-muted">
            <button
              onClick={() => setActiveTab("colors")}
              className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "colors"
                  ? "border-b-2 border-primary bg-background text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TbPalette size={18} />
              Colors
            </button>
            <button
              onClick={() => setActiveTab("styles")}
              className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "styles"
                  ? "border-b-2 border-primary bg-background text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TbRuler size={18} />
              Styles
            </button>
            <button
              onClick={() => setActiveTab("typography")}
              className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-medium transition-colors ${
                activeTab === "typography"
                  ? "border-b-2 border-primary bg-background text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TbTypography size={18} />
              Typography
            </button>
          </div>

          {/* Content */}
          <div className="scrollbar min-h-0 flex-1 overflow-y-auto bg-background text-foreground">
            {/* Colors Tab */}
            {activeTab === "colors" && (
              <div className="space-y-3 p-6">
                <div className="grid grid-cols-2 gap-2">
                  {pallets.map((pallet, index) => (
                    <div key={index} className="group flex items-center gap-2">
                      <button
                        ref={el => {
                          colorButtonRefs.current[index] = el;
                        }}
                        onClick={() => openColorPicker(index)}
                        className="size-8 shrink-0 cursor-pointer rounded-lg border-2 border-border transition-colors hover:border-primary"
                        style={{ backgroundColor: getColorPreview(pallet.color) }}
                        title="Click to change color"
                      />
                      <div className="min-w-0 flex-1">
                        <input
                          type="text"
                          value={pallet.name}
                          onChange={e => updateColorName(index, e.target.value)}
                          className="w-full border-b border-transparent bg-transparent px-1 py-0.5 pb-0 text-sm font-medium text-foreground hover:border-primary focus:border-ring focus:outline-none"
                          placeholder="Color name"
                        />
                        <div
                          className="cursor-pointer px-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                          onClick={() => {
                            navigator.clipboard.writeText(toPaletteCSSVarName(pallet.name));
                          }}
                          title="Click to copy CSS variable"
                        >
                          {toPaletteCSSVarName(pallet.name)}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteColor(index)}
                        className="p-1 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                        title="Delete color"
                      >
                        <TbTrash size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Color Button */}
                <button
                  onClick={addColor}
                  className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-2 rounded-lg border border-border bg-accent px-3 py-2 text-sm text-accent-foreground transition-colors hover:bg-accent"
                >
                  <TbPlus size={16} />
                  Add Color
                </button>
              </div>
            )}

            {/* Styles Tab */}
            {activeTab === "styles" && (
              <div className="space-y-0">
                <CollapsibleSection title="Spacing & Layout" section="spacing">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Button Padding (x y)
                    </label>
                    <select
                      value={buttonPadding}
                      onChange={e => setButtonPadding(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="0.75rem 0.25rem">Small</option>
                      <option value="1rem 0.5rem">Medium</option>
                      <option value="1.5rem 0.75rem">Large</option>
                      <option value="2rem 1rem">XL</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Container Padding (x y)
                    </label>
                    <select
                      value={containerPadding}
                      onChange={e => setContainerPadding(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="1rem 1rem">Small (1rem)</option>
                      <option value="1.5rem 1.5rem">Medium (1.5rem)</option>
                      <option value="2rem 2rem">Large (2rem)</option>
                      <option value="3rem 3rem">XL (3rem)</option>
                      <option value="2rem 1rem">Wide (2rem x 1rem y)</option>
                      <option value="1rem 2rem">Tall (1rem x 2rem y)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Section Gap
                    </label>
                    <select
                      value={sectionGap}
                      onChange={e => setSectionGap(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="2rem">Small (2rem)</option>
                      <option value="3rem">Medium (3rem)</option>
                      <option value="4rem">Large (4rem)</option>
                      <option value="6rem">XL (6rem)</option>
                      <option value="8rem">2XL (8rem)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Container Gap
                    </label>
                    <select
                      value={containerGap}
                      onChange={e => setContainerGap(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="0.5rem">XS (0.5rem)</option>
                      <option value="1rem">Small (1rem)</option>
                      <option value="1.5rem">Medium (1.5rem)</option>
                      <option value="2rem">Large (2rem)</option>
                      <option value="3rem">XL (3rem)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Content Width
                    </label>
                    <select
                      value={contentWidth}
                      onChange={e => setContentWidth(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="48rem">Small (48rem)</option>
                      <option value="56rem">Medium (56rem)</option>
                      <option value="64rem">Large (64rem)</option>
                      <option value="72rem">XL (72rem)</option>
                      <option value="80rem">2XL (80rem)</option>
                      <option value="100%">Full Width</option>
                    </select>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Effects & Borders" section="effects">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Border Radius
                    </label>
                    <select
                      value={borderRadius}
                      onChange={e => setBorderRadius(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="0">None</option>
                      <option value="0.125rem">Small</option>
                      <option value="0.25rem">Default</option>
                      <option value="0.375rem">Medium</option>
                      <option value="0.5rem">Large</option>
                      <option value="0.75rem">XL</option>
                      <option value="1rem">2XL</option>
                      <option value="9999px">Full</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Shadow Style
                    </label>
                    <select
                      value={shadowStyle}
                      onChange={e => setShadowStyle(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="shadow-none">None</option>
                      <option value="shadow-sm">Small</option>
                      <option value="shadow">Default</option>
                      <option value="shadow-md">Medium</option>
                      <option value="shadow-lg">Large</option>
                      <option value="shadow-xl">XL</option>
                      <option value="shadow-2xl">2XL</option>
                    </select>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Form Inputs" section="forms">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Input Padding
                    </label>
                    <select
                      value={inputPadding}
                      onChange={e => setInputPadding(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="0.5rem 0.25rem">Small</option>
                      <option value="0.75rem 0.5rem">Medium</option>
                      <option value="1rem 0.5rem">Large</option>
                      <option value="1rem 0.75rem">XL</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Border Width
                    </label>
                    <select
                      value={inputBorderWidth}
                      onChange={e => setInputBorderWidth(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="0">None</option>
                      <option value="1px">1px</option>
                      <option value="2px">2px</option>
                      <option value="4px">4px</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Border Color
                    </label>
                    <button
                      ref={inputBorderColorButtonRef}
                      onClick={openInputBorderColorPicker}
                      className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <div
                        className="size-4 rounded-lg border border-border"
                        style={{
                          backgroundColor: getColorPreview(inputBorderColor),
                        }}
                      />
                      <span className="flex-1 truncate">{inputBorderColor}</span>
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Border Radius
                    </label>
                    <select
                      value={inputBorderRadius}
                      onChange={e => setInputBorderRadius(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="0">None</option>
                      <option value="0.125rem">Small</option>
                      <option value="0.25rem">Default</option>
                      <option value="0.375rem">Medium</option>
                      <option value="0.5rem">Large</option>
                      <option value="0.75rem">XL</option>
                      <option value="9999px">Full</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Background Color
                    </label>
                    <button
                      ref={inputBgColorButtonRef}
                      onClick={openInputBgColorPicker}
                      className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <div
                        className="size-4 rounded-lg border border-border"
                        style={{ backgroundColor: getColorPreview(inputBgColor) }}
                      />
                      <span className="flex-1 truncate">{inputBgColor}</span>
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Text Color
                    </label>
                    <button
                      ref={inputTextColorButtonRef}
                      onClick={openInputTextColorPicker}
                      className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <div
                        className="size-4 rounded-lg border border-border"
                        style={{ backgroundColor: getColorPreview(inputTextColor) }}
                      />
                      <span className="flex-1 truncate">{inputTextColor}</span>
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Placeholder Color
                    </label>
                    <button
                      ref={inputPlaceholderColorButtonRef}
                      onClick={openInputPlaceholderColorPicker}
                      className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <div
                        className="size-4 rounded-lg border border-border"
                        style={{
                          backgroundColor: getColorPreview(inputPlaceholderColor),
                        }}
                      />
                      <span className="flex-1 truncate">{inputPlaceholderColor}</span>
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Focus Ring Size
                    </label>
                    <select
                      value={inputFocusRing}
                      onChange={e => setInputFocusRing(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="0">None</option>
                      <option value="1px">1px</option>
                      <option value="2px">2px</option>
                      <option value="3px">3px (Default)</option>
                      <option value="4px">4px</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Focus Ring Color
                    </label>
                    <button
                      ref={inputFocusRingColorButtonRef}
                      onClick={openInputFocusRingColorPicker}
                      className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <div
                        className="size-4 rounded-lg border border-border"
                        style={{
                          backgroundColor: getColorPreview(inputFocusRingColor),
                        }}
                      />
                      <span className="flex-1 truncate">{inputFocusRingColor}</span>
                    </button>
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title="Links" section="links">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Link Color
                    </label>
                    <button
                      ref={linkColorButtonRef}
                      onClick={openLinkColorPicker}
                      className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <div
                        className="size-4 rounded-lg border border-border"
                        style={{ backgroundColor: getColorPreview(linkColor) }}
                      />
                      <span className="flex-1 truncate">{linkColor}</span>
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Link Hover Color
                    </label>
                    <button
                      ref={linkHoverColorButtonRef}
                      onClick={openLinkHoverColorPicker}
                      className="flex w-full items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <div
                        className="size-4 rounded-lg border border-border"
                        style={{ backgroundColor: getColorPreview(linkHoverColor) }}
                      />
                      <span className="flex-1 truncate">{linkHoverColor}</span>
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Link Underline
                    </label>
                    <select
                      value={linkUnderline}
                      onChange={e => setLinkUnderline(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="no-underline">None</option>
                      <option value="underline">Always</option>
                      <option value="hover:underline">On Hover</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Underline Offset
                    </label>
                    <select
                      value={linkUnderlineOffset}
                      onChange={e => setLinkUnderlineOffset(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="underline-offset-auto">Auto</option>
                      <option value="underline-offset-1">1px</option>
                      <option value="underline-offset-2">2px</option>
                      <option value="underline-offset-4">4px</option>
                      <option value="underline-offset-8">8px</option>
                    </select>
                  </div>
                </CollapsibleSection>
              </div>
            )}

            {/* Typography Tab */}
            {activeTab === "typography" && (
              <div className="space-y-0">
                {/* Type Section - Moved from Styles tab */}
                <CollapsibleSection title="Type" section="typography">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Heading Font Weight
                    </label>
                    <select
                      value={headingFont}
                      onChange={e => setHeadingFont(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="font-normal">Normal</option>
                      <option value="font-medium">Medium</option>
                      <option value="font-semibold">Semibold</option>
                      <option value="font-bold">Bold</option>
                      <option value="font-extrabold">Extra Bold</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Heading Font Family
                    </label>
                    <button
                      ref={headingFontButtonRef}
                      onClick={openHeadingFontPicker}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ fontFamily: headingFontFamily }}
                    >
                      {headingFontFamily || "Select font..."}
                    </button>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Body Font Weight
                    </label>
                    <select
                      value={bodyFont}
                      onChange={e => setBodyFont(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="font-thin">Thin</option>
                      <option value="font-extralight">Extra Light</option>
                      <option value="font-light">Light</option>
                      <option value="font-normal">Normal</option>
                      <option value="font-medium">Medium</option>
                      <option value="font-semibold">Semibold</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      Body Font Family
                    </label>
                    <button
                      ref={bodyFontButtonRef}
                      onClick={openBodyFontPicker}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                      style={{ fontFamily: bodyFontFamily }}
                    >
                      {bodyFontFamily || "Select font..."}
                    </button>
                  </div>
                </CollapsibleSection>

                {/* Custom Fonts Section */}
                <div className="space-y-3 p-6">
                  {/* Add Font Button - Top */}
                  <button
                    onClick={addFont}
                    className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-accent px-3 py-2 text-sm text-accent-foreground transition-colors hover:bg-accent"
                  >
                    <TbPlus size={16} />
                    Add Font
                  </button>

                  {/* Font List */}
                  {customFonts.map((font, index) => (
                    <div
                      key={index}
                      className="group space-y-3 rounded-lg border border-border bg-card p-3"
                    >
                      {/* Font Name */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={font.name}
                          onChange={e => updateFontName(index, e.target.value)}
                          className="flex-1 border-b border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-card-foreground hover:border-primary focus:border-ring focus:outline-none"
                          placeholder="Font name"
                        />
                        <button
                          onClick={() => deleteFont(index)}
                          className="p-1 text-destructive opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          title="Delete font"
                        >
                          <TbTrash size={16} />
                        </button>
                      </div>

                      {/* Font Properties */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Font Family */}
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Font Family
                          </label>
                          <button
                            onClick={e => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setFontDialog({
                                enabled: true,
                                value: font.fontFamily ? [font.fontFamily] : [],
                                originalValue: font.fontFamily ? [font.fontFamily] : [], // Store original value for reset on cancel
                                changed: (value: any) => {
                                  const fontFamily = Array.isArray(value) ? value[0] : value;
                                  updateFontProperty(index, "fontFamily", fontFamily);
                                },
                                preview: (value: any) => {
                                  // Temporarily preview the font without saving
                                  const fontFamily = Array.isArray(value) ? value[0] : value;
                                  updateFontProperty(index, "fontFamily", fontFamily);
                                },
                                e: rect,
                              });
                            }}
                            className="w-full rounded-lg border border-border bg-background px-2 py-1 text-left text-xs text-foreground hover:bg-muted focus:outline-none focus:ring-1 focus:ring-ring"
                            style={{ fontFamily: font.fontFamily }}
                          >
                            {font.fontFamily || "Select font family"}
                          </button>
                        </div>

                        {/* Font Size */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Font Size
                          </label>
                          <select
                            value={font.fontSize}
                            onChange={e => updateFontProperty(index, "fontSize", e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="0.625rem">XS (0.625rem)</option>
                            <option value="0.75rem">SM (0.75rem)</option>
                            <option value="0.875rem">Base- (0.875rem)</option>
                            <option value="1rem">Base (1rem)</option>
                            <option value="1.125rem">LG (1.125rem)</option>
                            <option value="1.25rem">XL (1.25rem)</option>
                            <option value="1.5rem">2XL (1.5rem)</option>
                            <option value="1.875rem">3XL (1.875rem)</option>
                            <option value="2rem">4XL (2rem)</option>
                            <option value="2.25rem">4XL+ (2.25rem)</option>
                            <option value="3rem">5XL (3rem)</option>
                            <option value="3.75rem">6XL (3.75rem)</option>
                            <option value="4.5rem">7XL (4.5rem)</option>
                            <option value="6rem">8XL (6rem)</option>
                            <option value="8rem">9XL (8rem)</option>
                          </select>
                        </div>

                        {/* Font Weight */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Font Weight
                          </label>
                          <select
                            value={font.fontWeight}
                            onChange={e => updateFontProperty(index, "fontWeight", e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="100">Thin (100)</option>
                            <option value="200">Extra Light (200)</option>
                            <option value="300">Light (300)</option>
                            <option value="400">Normal (400)</option>
                            <option value="500">Medium (500)</option>
                            <option value="600">Semi Bold (600)</option>
                            <option value="700">Bold (700)</option>
                            <option value="800">Extra Bold (800)</option>
                            <option value="900">Black (900)</option>
                          </select>
                        </div>

                        {/* Line Height */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Line Height
                          </label>
                          <select
                            value={font.lineHeight}
                            onChange={e => updateFontProperty(index, "lineHeight", e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="1">None (1)</option>
                            <option value="1.15">Tight (1.15)</option>
                            <option value="1.2">Snug (1.2)</option>
                            <option value="1.25">Compact (1.25)</option>
                            <option value="1.375">Normal- (1.375)</option>
                            <option value="1.5">Normal (1.5)</option>
                            <option value="1.625">Relaxed (1.625)</option>
                            <option value="1.75">Loose (1.75)</option>
                            <option value="2">Extra (2)</option>
                          </select>
                        </div>

                        {/* Letter Spacing */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Letter Spacing
                          </label>
                          <select
                            value={font.letterSpacing || "normal"}
                            onChange={e =>
                              updateFontProperty(index, "letterSpacing", e.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="-0.05em">Tighter (-0.05em)</option>
                            <option value="-0.025em">Tight (-0.025em)</option>
                            <option value="normal">Normal (0)</option>
                            <option value="0.025em">Wide (0.025em)</option>
                            <option value="0.05em">Wider (0.05em)</option>
                            <option value="0.1em">Widest (0.1em)</option>
                          </select>
                        </div>

                        {/* Text Transform */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">
                            Text Transform
                          </label>
                          <select
                            value={font.textTransform || "none"}
                            onChange={e =>
                              updateFontProperty(index, "textTransform", e.target.value)
                            }
                            className="w-full rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          >
                            <option value="none">None</option>
                            <option value="uppercase">UPPERCASE</option>
                            <option value="lowercase">lowercase</option>
                            <option value="capitalize">Capitalize</option>
                          </select>
                        </div>
                      </div>

                      {/* Font Preview */}
                      <div className="rounded-lg bg-muted p-2">
                        <div
                          style={{
                            fontFamily: font.fontFamily,
                            fontSize: font.fontSize,
                            fontWeight: font.fontWeight,
                            lineHeight: font.lineHeight,
                            letterSpacing: font.letterSpacing || "normal",
                            textTransform: (font.textTransform ||
                              "none") as React.CSSProperties["textTransform"],
                          }}
                          className="text-sm text-muted-foreground"
                        >
                          The quick brown fox jumps over the lazy dog
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Font Button - Bottom */}
                  <button
                    onClick={addFont}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-accent px-3 py-2 text-sm text-accent-foreground transition-colors hover:bg-accent"
                  >
                    <TbPlus size={16} />
                    Add Font
                  </button>
                </div>
              </div>
            )}
          </div>
    </FloatingPanel>
  );
};
