import { useEditor } from "@craftjs/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtomState } from "@zedux/react";
import { GoogleIconDialogAtom } from "../../dialogAtoms";
import googleIcons from "utils/googleIcons.json";
import { getMediaContent, getStyleSheets } from "utils/lib";
import iconList from "utils/icons.json";

export const GOOGLE_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "action", label: "Action" },
  { id: "alert", label: "Alert" },
  { id: "av", label: "Audio/Video" },
  { id: "communication", label: "Communication" },
  { id: "content", label: "Content" },
  { id: "device", label: "Device" },
  { id: "editor", label: "Editor" },
  { id: "file", label: "File" },
  { id: "hardware", label: "Hardware" },
  { id: "home", label: "Home" },
  { id: "image", label: "Image" },
  { id: "maps", label: "Maps" },
  { id: "navigation", label: "Navigation" },
  { id: "notification", label: "Notification" },
  { id: "places", label: "Places" },
  { id: "social", label: "Social" },
  { id: "toggle", label: "Toggle" },
];

export const ICON_STYLES = [
  { id: "outlined", label: "Outlined", fill: 0 },
  { id: "filled", label: "Filled", fill: 1 },
];

export const SVG_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "solid", label: "Solid" },
  { id: "regular", label: "Regular" },
  { id: "brands", label: "Brands" },
];

// Grid config
export const COLUMN_COUNT = 5;
export const COLUMN_WIDTH = 68;
export const ROW_HEIGHT = 70;
export const CONTAINER_WIDTH = 359;
export const VISIBLE_ROWS = 6;

export function useIconDialog() {
  const [dialog, setDialog] = useAtomState(GoogleIconDialogAtom);
  const { query } = useEditor();

  const getInitialTab = (): "google" | "media" | "icons" => {
    if (dialog.value?.startsWith("ref-image:")) return "media";
    if (dialog.value?.startsWith("ref-icon:")) return "icons";
    return "google";
  };

  const [activeTab, setActiveTab] = useState<"google" | "media" | "icons">(getInitialTab());
  const [selectedIcon, setSelectedIcon] = useState(dialog.value);

  // Google state
  const [category, setCategory] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [iconStyle, setIconStyle] = useState("outlined");
  const [fill, setFill] = useState(0);
  const [weight, setWeight] = useState(400);
  const [grade, setGrade] = useState(0);
  const [opticalSize, setOpticalSize] = useState(24);
  const [fontLoaded, setFontLoaded] = useState(false);

  // SVG state
  const [svgCategory, setSvgCategory] = useState("all");
  const [svgSearchValue, setSvgSearchValue] = useState("");

  // Media state
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);

  // Keyboard nav
  const [focusedIconIndex, setFocusedIconIndex] = useState(0);
  const [focusedSvgIconIndex, setFocusedSvgIconIndex] = useState(0);
  const gridRef = useRef<any>(null);
  const svgGridRef = useRef<any>(null);

  // Client hydration guard
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  // ─── Filtered icons ───

  const _icons = useMemo(() => {
    if (category === "all") {
      let all: string[] = [];
      Object.values(googleIcons).forEach(cat => { all = [...all, ...cat]; });
      return all;
    }
    return (googleIcons as Record<string, string[]>)[category] || [];
  }, [category]);

  const filteredIcons = useMemo(() => {
    if (!searchValue) return _icons;
    return _icons.filter(icon => icon.search(new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")) > -1);
  }, [_icons, searchValue]);

  const svgIcons = useMemo(() => {
    if (svgCategory === "all") return [...(iconList as Record<string, string[]>).regular, ...(iconList as Record<string, string[]>).brands, ...(iconList as Record<string, string[]>).solid];
    return (iconList as Record<string, string[]>)[svgCategory] || [];
  }, [svgCategory]);

  const filteredSvgIcons = useMemo(() => {
    if (!svgSearchValue) return svgIcons;
    return svgIcons.filter(i => i.search(new RegExp(svgSearchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")) > -1);
  }, [svgIcons, svgSearchValue]);

  const rowCount = Math.ceil(filteredIcons.length / COLUMN_COUNT);
  const svgRowCount = Math.ceil(filteredSvgIcons.length / COLUMN_COUNT);

  // ─── Effects ───

  useEffect(() => {
    if (dialog.enabled) setActiveTab(getInitialTab());
  }, [dialog.value, dialog.enabled]);

  useEffect(() => {
    if (dialog.enabled) setSelectedIcon(dialog.value);
    else {
      setFontLoaded(false);
      setActiveTab("google");
      setSearchValue("");
      setSvgSearchValue("");
      setShowMediaBrowser(false);
    }
  }, [dialog.enabled, dialog.value]);

  // Load Google Material Symbols font
  useEffect(() => {
    if (!dialog.enabled) return;
    const href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";
    const sheetrefs = getStyleSheets();
    if (!sheetrefs.includes(href)) {
      const preloadLink = document.createElement("link");
      preloadLink.rel = "preload";
      preloadLink.as = "style";
      preloadLink.href = href;
      preloadLink.onload = function () {
        (this as HTMLLinkElement).onload = null;
        (this as HTMLLinkElement).rel = "stylesheet";
        if ("fonts" in document) {
          document.fonts.ready.then(() => {
            document.fonts.load("400 24px Material Symbols Outlined").then(() => setFontLoaded(true)).catch(() => setFontLoaded(true));
          });
        } else {
          setTimeout(() => setFontLoaded(true), 1000);
        }
      };
      document.getElementsByTagName("HEAD")[0].appendChild(preloadLink);
    } else {
      setFontLoaded(true);
    }
  }, [dialog.enabled]);

  // Reset focus on filter changes
  useEffect(() => {
    setFocusedIconIndex(0);
    setFocusedSvgIconIndex(0);
  }, [activeTab, category, searchValue, svgCategory, svgSearchValue]);

  // ─── Handlers ───

  const changed = (iconName: string) => {
    if (dialog.changed) {
      const iconRef = `ref-google:${iconName}`;
      setDialog({ ...dialog, value: iconRef, enabled: false });
      dialog.changed(iconRef);
    }
  };

  const handleIconClick = (iconName: string) => {
    const iconRef = `ref-google:${iconName}`;
    setSelectedIcon(iconRef);
    dialog.changed?.(iconRef);
  };

  const handleIconDoubleClick = (iconName: string) => changed(iconName);

  const handleSvgIconClick = async (iconRef: string, iconPath: string) => {
    setSelectedIcon(iconRef);
    if (dialog.changed) {
      try {
        const response = await fetch(iconPath);
        dialog.changed(await response.text());
      } catch (error) { console.error("Error loading SVG:", error); }
    }
  };

  const handleSvgIconDoubleClick = async (icon: string) => {
    if (dialog.changed) {
      try {
        const response = await fetch(icon);
        const svgText = await response.text();
        setDialog({ ...dialog, value: svgText, enabled: false });
        dialog.changed(svgText);
      } catch (error) { console.error("Error loading SVG:", error); }
    }
  };

  const handleMediaSelect = (mediaId: string) => {
    if (!mediaId || !dialog.changed) return;
    const imageRef = `ref-image:${mediaId}`;
    setDialog({ ...dialog, value: imageRef, enabled: false });
    dialog.changed(imageRef);
    setShowMediaBrowser(false);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    gridRef.current?.scrollTo({ scrollLeft: 0, scrollTop: 0 });
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    gridRef.current?.scrollTo({ scrollLeft: 0, scrollTop: 0 });
  };

  const handleStyleChange = (style: string, fillValue: number) => {
    setIconStyle(style);
    setFill(fillValue);
  };

  const closeDialog = () => setDialog({ ...dialog, enabled: false });

  // ─── Keyboard navigation ───

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!dialog.enabled) return;
    const icons = activeTab === "google" ? filteredIcons : filteredSvgIcons;
    const focusIdx = activeTab === "google" ? focusedIconIndex : focusedSvgIconIndex;
    const ref = activeTab === "google" ? gridRef : svgGridRef;
    const setIdx = activeTab === "google" ? setFocusedIconIndex : setFocusedSvgIconIndex;

    if (icons.length === 0) return;

    const scrollTo = (idx: number) => {
      ref.current?.scrollToItem({ rowIndex: Math.floor(idx / COLUMN_COUNT), columnIndex: idx % COLUMN_COUNT });
    };

    switch (e.key) {
      case "ArrowRight": e.preventDefault(); if (focusIdx < icons.length - 1) { setIdx(focusIdx + 1); scrollTo(focusIdx + 1); } break;
      case "ArrowLeft": e.preventDefault(); if (focusIdx > 0) { setIdx(focusIdx - 1); scrollTo(focusIdx - 1); } break;
      case "ArrowDown": e.preventDefault(); { const n = focusIdx + COLUMN_COUNT; if (n < icons.length) { setIdx(n); scrollTo(n); } } break;
      case "ArrowUp": e.preventDefault(); { const n = focusIdx - COLUMN_COUNT; if (n >= 0) { setIdx(n); scrollTo(n); } } break;
      case "Enter":
        e.preventDefault();
        if (activeTab === "google" && icons[focusIdx]) { setSelectedIcon(`ref-google:${icons[focusIdx]}`); changed(icons[focusIdx]); }
        else if (activeTab === "icons" && icons[focusIdx]) { setSelectedIcon(`ref-icon:${icons[focusIdx]}`); handleSvgIconDoubleClick(icons[focusIdx]); }
        break;
      case "Escape": e.preventDefault(); closeDialog(); break;
    }
  }, [dialog, activeTab, filteredIcons, filteredSvgIcons, focusedIconIndex, focusedSvgIconIndex]);

  useEffect(() => {
    if (!dialog.enabled) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dialog.enabled, handleKeyDown]);

  return {
    // Dialog
    dialog, closeDialog, isClient,
    // Tabs
    activeTab, setActiveTab,
    // Google
    category, searchValue, iconStyle, fill, weight, grade, opticalSize, fontLoaded,
    filteredIcons, rowCount, selectedIcon, focusedIconIndex, gridRef,
    handleSearch, handleCategoryChange, handleStyleChange,
    handleIconClick, handleIconDoubleClick,
    setWeight, setGrade, setOpticalSize,
    // SVG
    svgCategory, setSvgCategory, svgSearchValue, setSvgSearchValue,
    filteredSvgIcons, svgRowCount, focusedSvgIconIndex, svgGridRef,
    handleSvgIconClick, handleSvgIconDoubleClick,
    // Media
    showMediaBrowser, setShowMediaBrowser, handleMediaSelect,
    // Helpers
    query, getMediaContent,
  };
}

export type UseIconDialogReturn = ReturnType<typeof useIconDialog>;
