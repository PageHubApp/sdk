import { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { FixedSizeList as List } from "react-window";
import { useAtomState } from "@zedux/react";
import { FontFamilyDialogAtom } from "./dialogAtoms";
import { OVERLAY_Z_MODAL } from "@/chrome/overlays/overlayZIndex";
import {
  fetchGoogleFonts,
  getFunkyFonts,
  getPopularFonts,
  loadGoogleFont,
} from "@/utils/fonts/googleFonts";
import { fonts } from "@/utils/tailwind";
import { ItemToggle } from "../helpers/ItemSelector";

export { FontFamilyDialogAtom } from "./dialogAtoms";

export const FontFamilyDialog = () => {
  const [dialog, setDialog] = useAtomState(FontFamilyDialogAtom);
  const [allFonts, setAllFonts] = useState<string[][]>(fonts); // Start with legacy fonts
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [hoveredIndex, setHoveredIndex] = useState(-1);

  // Fetch all Google Fonts on mount
  useEffect(() => {
    const loadFonts = async () => {
      try {
        setLoading(true);

        // Fetch all fonts from Google Fonts API
        const googleFonts = await fetchGoogleFonts();

        // Convert to array format for compatibility: [["Font Name"]]
        const popularFonts = getPopularFonts();
        const funkyFonts = getFunkyFonts();

        // Organize fonts: Popular first, then Funky, then all others alphabetically
        const popularList = popularFonts.map(f => [f]);
        const funkyList = funkyFonts.filter(f => !popularFonts.includes(f)).map(f => [f]);
        const otherFonts = googleFonts
          .filter(f => !popularFonts.includes(f.family) && !funkyFonts.includes(f.family))
          .map(f => [f.family])
          .sort((a, b) => a[0].localeCompare(b[0]));

        const allFontsList = [...popularList, ...funkyList, ...otherFonts];
        setAllFonts(allFontsList);
      } catch (error) {
        console.error("Error loading fonts:", error);
        // Fallback to legacy fonts
        setAllFonts(fonts);
      } finally {
        setLoading(false);
      }
    };

    loadFonts();
  }, []);

  // Font categories
  const fontCategories = {
    Popular: allFonts.slice(0, 20), // First 20 fonts (already sorted by popularity)
    Serif: allFonts.filter(
      font =>
        font[0].toLowerCase().includes("serif") ||
        font[0].toLowerCase().includes("times") ||
        font[0].toLowerCase().includes("georgia") ||
        font[0].toLowerCase().includes("garamond") ||
        font[0].toLowerCase().includes("baskerville")
    ),
    "Sans Serif": allFonts.filter(
      font =>
        font[0].toLowerCase().includes("sans") ||
        font[0].toLowerCase().includes("helvetica") ||
        font[0].toLowerCase().includes("arial") ||
        font[0].toLowerCase().includes("roboto") ||
        font[0].toLowerCase().includes("open sans")
    ),
    Display: allFonts.filter(
      font =>
        font[0].toLowerCase().includes("display") ||
        font[0].toLowerCase().includes("impact") ||
        font[0].toLowerCase().includes("oswald") ||
        font[0].toLowerCase().includes("bebas")
    ),
    Handwriting: allFonts.filter(
      font =>
        font[0].toLowerCase().includes("script") ||
        font[0].toLowerCase().includes("hand") ||
        font[0].toLowerCase().includes("cursive") ||
        font[0].toLowerCase().includes("brush")
    ),
    Monospace: allFonts.filter(
      font =>
        font[0].toLowerCase().includes("mono") ||
        font[0].toLowerCase().includes("code") ||
        font[0].toLowerCase().includes("courier") ||
        font[0].toLowerCase().includes("consolas")
    ),
    "All Fonts": allFonts,
  };

  const [selectedCategory, setSelectedCategory] =
    useState<keyof typeof fontCategories>("All Fonts");

  // Preload Google Fonts when dialog opens or category changes
  useEffect(() => {
    if (dialog.enabled && !loading && allFonts.length > 0) {
      // Preload fonts based on current category
      const fontsToPreload = fontCategories[selectedCategory].slice(0, 30); // Load first 30 fonts of current category
      fontsToPreload.forEach(font => {
        if (font && font[0]) {
          loadGoogleFont(font[0], ["400"]);
        }
      });
    }
  }, [dialog.enabled, loading, allFonts, selectedCategory]);

  // Filter fonts based on search term and category
  const filteredFonts = fontCategories[selectedCategory].filter(
    font => !searchTerm || font[0].toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle arrow key navigation
  useEffect(() => {
    if (!dialog.enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!dialog.enabled) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHoveredIndex(prev => {
            const next = Math.min(prev + 1, filteredFonts.length - 1);
            const fontName = filteredFonts[next]?.[0];
            if (fontName) {
              // Preview the font on the actual component
              if (dialog.preview) {
                dialog.preview([fontName]);
              }
            }
            return next;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setHoveredIndex(prev => {
            const next = Math.max(prev - 1, 0);
            const fontName = filteredFonts[next]?.[0];
            if (fontName) {
              // Preview the font on the actual component
              if (dialog.preview) {
                dialog.preview([fontName]);
              }
            }
            return next;
          });
          break;
        case "Enter":
          e.preventDefault();
          if (hoveredIndex >= 0 && filteredFonts[hoveredIndex]) {
            changed(filteredFonts[hoveredIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeDialog();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dialog.enabled, hoveredIndex, filteredFonts]);

  const closeDialog = () => {
    // Reset to original value when closing without selecting
    if (dialog.preview && dialog.originalValue) {
      dialog.preview(dialog.originalValue);
    }
    setDialog({ ...dialog, enabled: false });
  };

  const changed = value => {
    if (!dialog.changed) return;

    // Lazy load the selected font
    if (value && value[0]) {
      loadGoogleFont(value[0], ["400", "700"]);
    }

    setDialog({ ...dialog, value, enabled: false });
    dialog.changed(value);
  };

  const handleMouseEnter = (index: number, fontName: string) => {
    setHoveredIndex(index);
    // Preview the font on the actual component
    if (dialog.preview) {
      dialog.preview([fontName]);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(-1);
    // Reset to original font when leaving
    if (dialog.preview && dialog.originalValue) {
      dialog.preview(dialog.originalValue);
    }
  };

  // Virtualized font item renderer
  const FontItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const font = filteredFonts[index];

    if (!font) return null;

    return (
      <div style={style}>
        <button
          id={`fontFamily-${font}`}
          className={`text-neutral-content hover:bg-neutral flex w-full cursor-pointer flex-row truncate rounded-md p-1 text-xs whitespace-nowrap transition-colors ${
            JSON.stringify(dialog.value) === JSON.stringify(font)
              ? "bg-primary text-primary-content"
              : ""
          } ${hoveredIndex === index ? "border-primary/20 bg-primary/10 border" : ""}`}
          style={{
            fontFamily: font.join(", "),
            fontSize: "14px",
            fontWeight: "400",
            height: "32px",
            width: "100%",
          }}
          onClick={() => changed(font)}
          onMouseEnter={() => handleMouseEnter(index, font[0])}
          onMouseLeave={handleMouseLeave}
        >
          <span className="flex-1 text-left">{font.join(", ")}</span>
          {hoveredIndex === index && <span className="text-primary/60 ml-2 text-xs">Preview</span>}
        </button>
      </div>
    );
  };

  if (!dialog.enabled) return null;

  const rect = dialog.e;
  if (!rect) return null;

  // Calculate position like the original Dialog component
  const availableHeight = window.innerHeight - rect.bottom - 20;
  const maxHeight = Math.min(400, availableHeight, window.innerHeight * 0.6);
  const isUpward = availableHeight < 200;

  const style = isUpward
    ? {
        position: "absolute" as const,
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        zIndex: OVERLAY_Z_MODAL,
        maxHeight: Math.min(400, rect.top - 20, window.innerHeight * 0.6),
        width: rect.width || 308,
      }
    : {
        position: "absolute" as const,
        top: rect.bottom + 6,
        left: rect.left,
        zIndex: OVERLAY_Z_MODAL,
        maxHeight,
        width: rect.width || 308,
      };

  return ReactDOM.createPortal(
    <>
      {/* Backdrop to close dialog when clicking outside */}
      <div
        role="presentation"
        aria-hidden="true"
        className="pointer-events-auto fixed inset-0"
        style={{ zIndex: OVERLAY_Z_MODAL - 1 }}
        onClick={closeDialog}
      />

      <div style={style} className="pagehub-sdk-root pointer-events-auto">
        <div className="ph-panel overflow-hidden p-0">
          {/* Search and Category Filter */}
          <div className="border-base-300 bg-neutral shrink-0 border-b px-2 pt-2 pb-1">
            <div className="flex gap-2">
              <input
                type="text"
                className="input-dialog-sm flex-1"
                placeholder="Search fonts..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus={true}
              />
              <ItemToggle
                items={Object.keys(fontCategories).map(category => ({
                  id: category,
                  content: `${category} (${fontCategories[category as keyof typeof fontCategories].length})`,
                  icon: "",
                }))}
                selected={selectedCategory}
                onChange={category => setSelectedCategory(category as keyof typeof fontCategories)}
                option={true}
              />
            </div>
          </div>

          {/* Virtualized List */}
          <div className="px-2 py-1">
            <List
              height={Math.min(maxHeight - 100, 300)} // Account for search bar + category selector
              itemCount={filteredFonts.length}
              itemSize={32}
              width="100%"
            >
              {FontItem}
            </List>
          </div>
        </div>
      </div>
    </>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};
