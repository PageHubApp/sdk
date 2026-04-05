// @ts-nocheck
import { useEditor } from "@craftjs/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbBrandGoogle, TbIcons, TbPhoto } from "react-icons/tb";
import { FixedSizeGrid as Grid } from "react-window";
import { useAtomState } from "@zedux/react";
import { GoogleIconDialogAtom } from "./dialogAtoms";
import googleIcons from "utils/googleIcons.json";
import { getMediaContent, getStyleSheets } from "utils/lib";
import { MediaManagerModal } from "../Inputs/media/MediaManagerModal";
import { IconLoader } from "./IconLoader";
import { LeftSidebarDialog } from "./LeftSidebarDialog";

import iconList from "utils/icons.json";

export { GoogleIconDialogAtom } from "./dialogAtoms";

export const GoogleIconDialog = () => {
  const [dialog, setDialog] = useAtomState(GoogleIconDialogAtom);
  const { query } = useEditor();

  // Auto-select tab based on current value
  const getInitialTab = (): "google" | "media" | "icons" => {
    if (dialog.value?.startsWith("ref-image:")) return "media";
    if (dialog.value?.startsWith("ref-icon:")) return "icons";
    if (dialog.value?.startsWith("ref-google:")) return "google";
    return "google"; // default
  };

  const [activeTab, setActiveTab] = useState<"google" | "media" | "icons">(getInitialTab());

  // Google Material Symbols state
  const [category, setCategory] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const [iconStyle, setIconStyle] = useState("outlined"); // outlined, filled, rounded, sharp
  const [fill, setFill] = useState(0); // 0 or 1
  const [weight, setWeight] = useState(400); // 100-700
  const [grade, setGrade] = useState(0); // -25 to 200
  const [opticalSize, setOpticalSize] = useState(24); // 20-48
  const [fontLoaded, setFontLoaded] = useState(false);

  // FontAwesome/SVG icons state
  const [svgCategory, setSvgCategory] = useState("all");
  const [svgSearchValue, setSvgSearchValue] = useState("");

  // Media picker state
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);

  // Keyboard navigation state
  const [focusedIconIndex, setFocusedIconIndex] = useState(0);
  const [focusedSvgIconIndex, setFocusedSvgIconIndex] = useState(0);

  const gridRef = useRef(null);
  const svgGridRef = useRef(null);

  // Update tab when dialog value changes
  useEffect(() => {
    if (dialog.enabled) {
      const newTab = getInitialTab();
      setActiveTab(newTab);
    }
  }, [dialog.value, dialog.enabled]);

  // Dynamically load Google Material Symbols font only when dialog is used
  useEffect(() => {
    if (!dialog.enabled) return;

    const sheetrefs = getStyleSheets();
    const href =
      "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap";

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

        // Wait for font to be ready
        if ("fonts" in document) {
          document.fonts.ready.then(() => {
            document.fonts
              .load("400 24px Material Symbols Outlined")
              .then(() => {
                setFontLoaded(true);
              })
              .catch(() => {
                setFontLoaded(true);
              });
          });
        } else {
          // Fallback
          setTimeout(() => setFontLoaded(true), 1000);
        }
      };

      head.appendChild(preloadLink);
    } else {
      // Font already loaded
      setFontLoaded(true);
    }
  }, [dialog.enabled]);

  const [selectedIcon, setSelectedIcon] = useState(dialog.value);

  // Sync selectedIcon with dialog value when dialog opens
  useEffect(() => {
    if (dialog.enabled) {
      setSelectedIcon(dialog.value);
    } else {
      // Reset states when dialog closes
      setFontLoaded(false);
      setActiveTab("google");
      setSearchValue("");
      setSvgSearchValue("");
      setShowMediaBrowser(false);
    }
  }, [dialog.enabled, dialog.value]);

  const changed = async (iconName: string) => {
    if (dialog.changed) {
      // For Google Material Symbols, keep the reference format for now
      // since they rely on the Material Symbols font
      const iconRef = `ref-google:${iconName}`;
      setDialog({ ...dialog, value: iconRef, enabled: false });
      dialog.changed(iconRef);
    }
  };

  const handleIconClick = (iconName: string) => {
    const iconRef = `ref-google:${iconName}`;
    setSelectedIcon(iconRef);
    // Single click also sets the icon (but doesn't close dialog)
    if (dialog.changed) {
      dialog.changed(iconRef);
    }
  };

  const handleIconDoubleClick = (iconName: string) => {
    // Double click sets and closes
    changed(iconName);
  };

  const handleUseMedia = () => {
    if (dialog.onUseMedia) {
      dialog.onUseMedia();
      setDialog({ ...dialog, enabled: false });
    } else {
      // Show media browser
      setShowMediaBrowser(true);
    }
  };

  const handleMediaSelect = (mediaId: string) => {
    if (!mediaId) return;
    if (dialog.changed) {
      // Save media reference with ref-image: prefix
      const imageRef = `ref-image:${mediaId}`;
      setDialog({ ...dialog, value: imageRef, enabled: false });
      dialog.changed(imageRef);
    }
    setShowMediaBrowser(false);
  };

  // SVG Icons logic (FontAwesome, local SVGs)
  const svgIcons = useMemo(() => {
    let icons = [];
    if (svgCategory === "all") {
      icons = [...iconList.regular, ...iconList.brands, ...iconList.solid];
    } else if (svgCategory === "regular") {
      icons = iconList.regular;
    } else if (svgCategory === "brands") {
      icons = iconList.brands;
    } else if (svgCategory === "solid") {
      icons = iconList.solid;
    }
    return icons;
  }, [svgCategory]);

  const filteredSvgIcons = useMemo(() => {
    if (!svgSearchValue) {
      return svgIcons;
    }
    return svgIcons.filter(
      _ => _.search(new RegExp(svgSearchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")) > -1
    );
  }, [svgIcons, svgSearchValue]);

  // Single click on SVG icon - select and set (but don't close)
  const handleSvgIconClick = async (iconRef: string, iconPath: string) => {
    setSelectedIcon(iconRef);
    // Single click also sets the icon (but doesn't close dialog)
    if (dialog.changed) {
      try {
        const response = await fetch(iconPath);
        const svgText = await response.text();
        dialog.changed(svgText);
      } catch (error) {
        console.error("Error loading SVG:", error);
      }
    }
  };

  // Double click on SVG icon - set and close
  const handleSvgIconDoubleClick = async (icon: string) => {
    if (dialog.changed) {
      try {
        const response = await fetch(icon);
        const svgText = await response.text();
        setDialog({ ...dialog, value: svgText, enabled: false });
        dialog.changed(svgText);
      } catch (error) {
        console.error("Error loading SVG:", error);
      }
    }
  };

  const _icons = useMemo(() => {
    let icons: string[] = [];
    if (category === "all") {
      // Flatten all categories
      Object.values(googleIcons).forEach(categoryIcons => {
        icons = [...icons, ...categoryIcons];
      });
    } else {
      icons = googleIcons[category] || [];
    }
    return icons;
  }, [category]);

  const filteredIcons = useMemo(() => {
    if (!searchValue) {
      return _icons;
    }
    return _icons.filter(
      icon => icon.search(new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")) > -1
    );
  }, [_icons, searchValue]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    // Reset scroll position when search changes
    if (gridRef.current) {
      gridRef.current.scrollTo({ scrollLeft: 0, scrollTop: 0 });
    }
  };

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    if (gridRef.current) {
      gridRef.current.scrollTo({ scrollLeft: 0, scrollTop: 0 });
    }
  };

  // Grid configuration - matches nav sidebar width (360px)
  const columnCount = 5;
  const columnWidth = 68;
  const rowHeight = 70;
  const containerWidth = 359;
  const visibleRows = 6; // Show 6 rows
  const rowCount = Math.ceil(filteredIcons.length / columnCount);

  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= filteredIcons.length) return null;

    const iconName = filteredIcons[index];
    const iconRef = `ref-google:${iconName}`;
    const isSelected = selectedIcon === iconRef;
    const isFocused = focusedIconIndex === index;

    return (
      <div style={{ ...style, padding: "3px" }}>
        <button
          id={`googleIconPicker-${iconName}`}
          className={`flex size-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border p-1 transition-all ${
            isSelected
              ? "border-primary bg-primary/10 text-primary"
              : isFocused
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                : "border-transparent hover:border-border hover:bg-muted"
          }`}
          onClick={() => handleIconClick(iconName)}
          onDoubleClick={() => handleIconDoubleClick(iconName)}
          aria-label={`Google icon: ${iconName.replace(/_/g, " ")}`}
          aria-describedby={`googleIconPicker-${iconName}-desc`}
          tabIndex={isFocused ? 0 : -1}
          role="gridcell"
          aria-selected={isSelected}
        >
          <span
            className="google-icons pointer-events-none text-lg"
            style={{
              fontVariationSettings: `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`,
            }}
            aria-hidden="true"
          >
            {iconName}
          </span>
          <span
            id={`googleIconPicker-${iconName}-desc`}
            className="w-full truncate text-center text-[8px] leading-tight text-muted-foreground"
          >
            {iconName.replace(/_/g, " ")}
          </span>
        </button>
      </div>
    );
  };

  const categories = [
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

  const iconStyles = [
    { id: "outlined", label: "Outlined", fill: 0 },
    { id: "filled", label: "Filled", fill: 1 },
  ];

  const handleStyleChange = (style: string, fillValue: number) => {
    setIconStyle(style);
    setFill(fillValue);
  };

  // Keyboard navigation handlers
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!dialog.enabled) return;

      const currentIcons = activeTab === "google" ? filteredIcons : filteredSvgIcons;
      const currentFocusedIndex = activeTab === "google" ? focusedIconIndex : focusedSvgIconIndex;
      const currentGridRef = activeTab === "google" ? gridRef : svgGridRef;
      const setFocusedIndex = activeTab === "google" ? setFocusedIconIndex : setFocusedSvgIconIndex;

      if (currentIcons.length === 0) return;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          if (currentFocusedIndex < currentIcons.length - 1) {
            const newIndex = currentFocusedIndex + 1;
            setFocusedIndex(newIndex);
            // Scroll to keep focused item visible
            const row = Math.floor(newIndex / columnCount);
            const col = newIndex % columnCount;
            if (currentGridRef.current) {
              currentGridRef.current.scrollToItem({
                rowIndex: row,
                columnIndex: col,
              });
            }
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (currentFocusedIndex > 0) {
            const newIndex = currentFocusedIndex - 1;
            setFocusedIndex(newIndex);
            // Scroll to keep focused item visible
            const row = Math.floor(newIndex / columnCount);
            const col = newIndex % columnCount;
            if (currentGridRef.current) {
              currentGridRef.current.scrollToItem({
                rowIndex: row,
                columnIndex: col,
              });
            }
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          const nextRowIndex = currentFocusedIndex + columnCount;
          if (nextRowIndex < currentIcons.length) {
            setFocusedIndex(nextRowIndex);
            // Scroll to keep focused item visible
            const row = Math.floor(nextRowIndex / columnCount);
            const col = nextRowIndex % columnCount;
            if (currentGridRef.current) {
              currentGridRef.current.scrollToItem({
                rowIndex: row,
                columnIndex: col,
              });
            }
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          const prevRowIndex = currentFocusedIndex - columnCount;
          if (prevRowIndex >= 0) {
            setFocusedIndex(prevRowIndex);
            // Scroll to keep focused item visible
            const row = Math.floor(prevRowIndex / columnCount);
            const col = prevRowIndex % columnCount;
            if (currentGridRef.current) {
              currentGridRef.current.scrollToItem({
                rowIndex: row,
                columnIndex: col,
              });
            }
          }
          break;
        case "Enter":
          e.preventDefault();
          if (activeTab === "google") {
            const iconName = currentIcons[currentFocusedIndex];
            if (iconName) {
              // First select the icon visually, then close dialog
              setSelectedIcon(`ref-google:${iconName}`);
              changed(iconName);
            }
          } else if (activeTab === "icons") {
            const icon = currentIcons[currentFocusedIndex];
            if (icon) {
              // First select the icon visually, then close dialog
              setSelectedIcon(`ref-icon:${icon}`);
              handleSvgIconDoubleClick(icon);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          setDialog({ ...dialog, enabled: false });
          break;
      }
    },
    [
      dialog,
      activeTab,
      filteredIcons,
      filteredSvgIcons,
      focusedIconIndex,
      focusedSvgIconIndex,
      columnCount,
    ]
  );

  // Add keyboard event listener
  useEffect(() => {
    if (dialog.enabled) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [dialog.enabled, handleKeyDown]);

  // Reset focus when switching tabs or changing filters
  useEffect(() => {
    setFocusedIconIndex(0);
    setFocusedSvgIconIndex(0);
  }, [activeTab, category, searchValue, svgCategory, svgSearchValue]);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Don't render portal on server-side or before client hydration
  if (typeof document === "undefined" || !isClient) {
    return null;
  }

  return (
    <>
      <LeftSidebarDialog
        isOpen={dialog.enabled}
        onClose={() => setDialog({ ...dialog, enabled: false })}
        title="Select Icon"
        icon={<TbIcons />}
      >
        {/* Tabs */}
        <div
          className="flex border-b border-border bg-muted"
          role="tablist"
          aria-label="Icon selection tabs"
        >
          <button
            onClick={() => setActiveTab("google")}
            className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "google"
                ? "border-b-2 border-primary bg-background text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            role="tab"
            aria-selected={activeTab === "google"}
            aria-controls="google-tabpanel"
            id="google-tab"
            tabIndex={activeTab === "google" ? 0 : -1}
          >
            <TbBrandGoogle size={18} aria-hidden="true" />
            Google
          </button>
          <button
            onClick={() => setActiveTab("media")}
            className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "media"
                ? "border-b-2 border-primary bg-background text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            role="tab"
            aria-selected={activeTab === "media"}
            aria-controls="media-tabpanel"
            id="media-tab"
            tabIndex={activeTab === "media" ? 0 : -1}
          >
            <TbPhoto size={18} aria-hidden="true" />
            Media
          </button>
          <button
            onClick={() => setActiveTab("icons")}
            className={`flex flex-1 items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "icons"
                ? "border-b-2 border-primary bg-background text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            role="tab"
            aria-selected={activeTab === "icons"}
            aria-controls="icons-tabpanel"
            id="icons-tab"
            tabIndex={activeTab === "icons" ? 0 : -1}
          >
            <TbIcons size={18} aria-hidden="true" />
            Icons
          </button>
        </div>

        {/* Google Tab Content */}
        {activeTab === "google" && (
          <div
            role="tabpanel"
            id="google-tabpanel"
            aria-labelledby="google-tab"
            aria-label="Google Material Icons"
          >
            {/* Search */}
            <div className="border-b border-border bg-muted px-3 py-2">
              <input
                type="text"
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Search icons..."
                onChange={e => handleSearch(e.target.value)}
                autoFocus={true}
                aria-label="Search Google Material Icons"
                aria-describedby="google-search-help"
              />
              <div id="google-search-help" className="sr-only">
                Search through Google Material Icons. Use arrow keys to navigate, Enter to select,
                Escape to close.
              </div>
            </div>

            {/* Filters - Fixed at top */}
            <div className="shrink-0 border-b border-border bg-background p-3">
              {/* Category Tabs - Horizontal scroll, no visible scrollbar */}
              <div className="mb-3">
                <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground">
                  Category
                  {/* Icon count */}
                  <div className="text-xs text-muted-foreground">
                    {filteredIcons.length} icon
                    {filteredIcons.length !== 1 ? "s" : ""}
                  </div>
                </div>

                <div
                  className="scrollbar flex gap-1.5 overflow-x-auto py-1"
                  role="group"
                  aria-label="Icon categories"
                >
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                        category === cat.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      onClick={() => handleCategoryChange(cat.id)}
                      aria-pressed={category === cat.id}
                      aria-label={`Filter by ${cat.label} category`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style & Weight - Line 1 */}
              <div className="mb-3">
                <div className="scrollbar-hide flex items-center gap-3">
                  {/* Style Buttons */}
                  <div
                    className="flex shrink-0 gap-1.5"
                    role="group"
                    aria-label="Icon style options"
                  >
                    {iconStyles.map(style => (
                      <button
                        key={style.id}
                        className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                          iconStyle === style.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        onClick={() => handleStyleChange(style.id, style.fill)}
                        aria-pressed={iconStyle === style.id}
                        aria-label={`Set icon style to ${style.label}`}
                      >
                        {style.label}
                      </button>
                    ))}
                  </div>

                  {/* Weight Slider */}
                  <div className="flex shrink-0 items-center gap-2 border-l border-border pl-3">
                    <label htmlFor="weight-slider" className="text-xs font-medium text-foreground">
                      Weight
                    </label>
                    <input
                      id="weight-slider"
                      type="range"
                      min="100"
                      max="700"
                      step="100"
                      value={weight}
                      onChange={e => setWeight(Number(e.target.value))}
                      className="w-20 accent-primary"
                      aria-label={`Icon weight: ${weight}`}
                      aria-valuemin={100}
                      aria-valuemax={700}
                      aria-valuenow={weight}
                    />
                    <span className="text-xs text-muted-foreground" aria-live="polite">
                      {weight}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grade & Size - Line 2 */}
              <div className="mb-3">
                <div className="scrollbar-hide flex items-center gap-3 overflow-x-auto">
                  {/* Grade Slider */}
                  <div className="flex shrink-0 items-center gap-2">
                    <label htmlFor="grade-slider" className="text-xs font-medium text-foreground">
                      Grade
                    </label>
                    <input
                      id="grade-slider"
                      type="range"
                      min="-25"
                      max="200"
                      step="25"
                      value={grade}
                      onChange={e => setGrade(Number(e.target.value))}
                      className="w-20 accent-primary"
                      aria-label={`Icon grade: ${grade}`}
                      aria-valuemin={-25}
                      aria-valuemax={200}
                      aria-valuenow={grade}
                    />
                    <span className="text-xs text-muted-foreground" aria-live="polite">
                      {grade}
                    </span>
                  </div>

                  {/* Optical Size Slider */}
                  <div className="flex shrink-0 items-center gap-2">
                    <label htmlFor="size-slider" className="text-xs font-medium text-foreground">
                      Size
                    </label>
                    <input
                      id="size-slider"
                      type="range"
                      min="20"
                      max="48"
                      step="1"
                      value={opticalSize}
                      onChange={e => setOpticalSize(Number(e.target.value))}
                      className="w-20 accent-primary"
                      aria-label={`Icon size: ${opticalSize}`}
                      aria-valuemin={20}
                      aria-valuemax={48}
                      aria-valuenow={opticalSize}
                    />
                    <span className="text-xs text-muted-foreground" aria-live="polite">
                      {opticalSize}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Icon Grid - Scrollable with auto-hide scrollbar */}

            {!fontLoaded && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
                  <p className="text-sm text-muted-foreground">Loading icons...</p>
                </div>
              </div>
            )}
            <div
              role="grid"
              aria-label="Google Material Icons grid"
              aria-rowcount={rowCount}
              aria-colcount={columnCount}
            >
              <Grid
                ref={gridRef}
                columnCount={columnCount}
                columnWidth={columnWidth}
                height={visibleRows * rowHeight}
                rowCount={rowCount}
                rowHeight={rowHeight}
                width={containerWidth}
                className="scrollbar border-b border-border bg-background text-foreground"
              >
                {Cell}
              </Grid>
            </div>
          </div>
        )}

        {/* Media Tab Content */}
        {activeTab === "media" && (
          <div
            className="flex flex-1 flex-col items-center justify-center gap-4 p-8"
            role="tabpanel"
            id="media-tabpanel"
            aria-labelledby="media-tab"
            aria-label="Media selection"
          >
            {dialog.value?.startsWith("ref-image:") ? (
              <>
                {/* Preview of selected media */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getMediaContent(query, dialog.value.replace("ref-image:", "")) || ""}
                      alt="Selected media"
                      className="size-full object-contain"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowMediaBrowser(true)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  aria-label="Change selected image"
                >
                  Change Image
                </button>
              </>
            ) : (
              <>
                {/* No selection - show placeholder */}
                <TbPhoto size={48} className="text-muted-foreground" />
                <p className="text-center text-sm text-muted-foreground">
                  Select an image from your media library
                </p>
                <button
                  onClick={() => setShowMediaBrowser(true)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  aria-label="Browse media library to select an image"
                >
                  Browse Media
                </button>
              </>
            )}
          </div>
        )}

        {/* Icons Tab Content (FontAwesome/SVG) */}
        {activeTab === "icons" && (
          <div
            role="tabpanel"
            id="icons-tabpanel"
            aria-labelledby="icons-tab"
            aria-label="SVG Icons selection"
          >
            {/* Search */}
            <div className="border-b border-border bg-muted px-3 py-2">
              <input
                ref={el => {
                  if (el && activeTab === "icons") {
                    el.focus();
                  }
                }}
                type="text"
                className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Search icons..."
                onChange={e => setSvgSearchValue(e.target.value)}
                aria-label="Search SVG icons"
                aria-describedby="svg-search-help"
              />
              <div id="svg-search-help" className="sr-only">
                Search through SVG icons. Use arrow keys to navigate, Enter to select, Escape to
                close.
              </div>
            </div>

            {/* Categories */}
            <div className="border-b border-border bg-background p-3">
              <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-foreground">
                Category
                <div className="text-xs text-muted-foreground">
                  {filteredSvgIcons.length} icon
                  {filteredSvgIcons.length !== 1 ? "s" : ""}
                </div>
              </div>
              <div
                className="scrollbar flex gap-1.5 overflow-x-auto py-1"
                role="group"
                aria-label="SVG icon categories"
              >
                {[
                  { id: "all", label: "All" },
                  { id: "solid", label: "Solid" },
                  { id: "regular", label: "Regular" },
                  { id: "brands", label: "Brands" },
                ].map(cat => (
                  <button
                    key={cat.id}
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                      svgCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    onClick={() => {
                      setSvgCategory(cat.id);
                      if (svgGridRef.current) {
                        svgGridRef.current.scrollTo({
                          scrollLeft: 0,
                          scrollTop: 0,
                        });
                      }
                    }}
                    aria-pressed={svgCategory === cat.id}
                    aria-label={`Filter by ${cat.label} category`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Icon Grid */}

            <div
              role="grid"
              aria-label="SVG Icons grid"
              aria-rowcount={rowCount}
              aria-colcount={columnCount}
            >
              <Grid
                ref={svgGridRef}
                columnCount={columnCount}
                columnWidth={columnWidth}
                height={visibleRows * rowHeight}
                rowCount={rowCount}
                rowHeight={rowHeight}
                width={containerWidth}
                className="scrollbar border-b border-border bg-background text-foreground"
              >
                {({ columnIndex, rowIndex, style }) => {
                  const index = rowIndex * 5 + columnIndex;
                  if (index >= filteredSvgIcons.length) return null;

                  const icon = filteredSvgIcons[index];
                  const iconRef = `ref-icon:${icon}`;
                  const isSelected = selectedIcon === iconRef;
                  const isFocused = focusedSvgIconIndex === index;
                  const iconName =
                    icon
                      .split("/")
                      .pop()
                      ?.replace(/\.svg$/, "")
                      .replace(/-/g, " ") || "";

                  return (
                    <div style={style}>
                      <button
                        onClick={() => handleSvgIconClick(iconRef, icon)}
                        onDoubleClick={() => handleSvgIconDoubleClick(icon)}
                        className={`flex size-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border p-1 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary"
                            : isFocused
                              ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                              : "border-transparent hover:border-border hover:bg-muted"
                        }`}
                        aria-label={`SVG icon: ${iconName}`}
                        aria-describedby={`svgIconPicker-${index}-desc`}
                        tabIndex={isFocused ? 0 : -1}
                        role="gridcell"
                        aria-selected={isSelected}
                      >
                        <IconLoader icon={icon} />
                        <span
                          id={`svgIconPicker-${index}-desc`}
                          className="w-full truncate text-center text-[8px] leading-tight text-muted-foreground"
                        >
                          {iconName}
                        </span>
                      </button>
                    </div>
                  );
                }}
              </Grid>
            </div>
          </div>
        )}
      </LeftSidebarDialog>

      {/* Media Manager Modal - Outside sidebar to prevent click conflicts */}
      {showMediaBrowser && (
        <MediaManagerModal
          isOpen={showMediaBrowser}
          onClose={() => setShowMediaBrowser(false)}
          onSelect={handleMediaSelect}
          selectionMode={true}
        />
      )}
    </>
  );
};
