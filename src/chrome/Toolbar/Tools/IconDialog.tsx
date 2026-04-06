import { useMemo, useRef, useState } from "react";
import { FixedSizeGrid as Grid } from "react-window";
import { useAtomState } from "@zedux/react";
import { IconDialogAtom } from "./dialogAtoms";
import { Dialog } from "./Dialog";
import { IconLoader } from "./IconLoader";

import iconList from "utils/icons.json";

export { IconDialogAtom } from "./dialogAtoms";

export const IconDialogDialog = () => {
  const [dialog, setDialog] = useAtomState(IconDialogAtom);
  const [svgDataUri, setSvgDataUri] = useState("");
  const [category, setCategory] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const gridRef = useRef(null);

  const changed = async (value) => {
    if (dialog.changed) {
      const response = await fetch(value);
      const svgText = await response.text();
      setSvgDataUri(svgText);

      setDialog({ ...dialog, value: svgText, enabled: false });
      dialog.changed(svgText);
    }
  };

  const _icons = useMemo(() => {
    let icons = [];
    if (category === "all") {
      icons = [...iconList.regular, ...iconList.brands, ...iconList.solid];
    } else if (category === "regular") {
      icons = iconList.regular;
    } else if (category === "brands") {
      icons = iconList.brands;
    } else if (category === "solid") {
      icons = iconList.solid;
    }
    return icons;
  }, [category]);

  const filteredIcons = useMemo(() => {
    if (!searchValue) {
      return _icons;
    }
    return _icons.filter(
      _ => _.search(new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")) > -1
    );
  }, [_icons, searchValue]);

  const handleSearch = value => {
    setSearchValue(value);
    // Reset scroll position when search changes
    if (gridRef.current) {
      gridRef.current.scrollTo({ scrollLeft: 0, scrollTop: 0 });
    }
  };

  const handleCategoryChange = newCategory => {
    setCategory(newCategory);
    if (gridRef.current) {
      gridRef.current.scrollTo({ scrollLeft: 0, scrollTop: 0 });
    }
  };

  // Grid configuration - show ~24 icons (6 cols x 4 rows = 24)
  const columnCount = 6;
  const columnWidth = 60;
  const rowHeight = 60;
  const containerWidth = 400;
  const visibleRows = 4; // Show 4 rows (~24 icons)
  const containerHeight = visibleRows * rowHeight + 120; // Extra space for search + tabs
  const rowCount = Math.ceil(filteredIcons.length / columnCount);

  const Cell = ({ columnIndex, rowIndex, style }) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= filteredIcons.length) return null;

    const icon = filteredIcons[index];

    return (
      <div style={style}>
        <button
          id={`iconPicker-${icon}`}
          className={`flex size-full cursor-pointer flex-row items-center justify-center rounded-lg hover:bg-muted hover:text-foreground ${
            dialog.value === icon
              ? "border-2 border-primary bg-primary text-primary-foreground"
              : ""
          }`}
          onClick={e => changed(icon)}
        >
          <div className="pointer-events-none flex items-center justify-center">
            <IconLoader icon={icon} />
          </div>
        </button>
      </div>
    );
  };

  return (
    <Dialog
      dialogAtom={IconDialogAtom}
      dialogName="iconPicker"
      value={dialog.value}
      items={filteredIcons}
      height={containerHeight}
      customOnSearch={handleSearch}
      customRenderer={
        <div className="flex h-full flex-col overflow-hidden">
          {/* Category Tabs - Scrollable with max height */}
          <div className="scrollbar-light mb-2 max-h-20 shrink-0 overflow-y-auto">
            <div className="flex flex-wrap gap-1.5">
              <button
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  category === "all" ? "bg-background text-foreground" : "bg-muted hover:bg-muted"
                }`}
                onClick={() => handleCategoryChange("all")}
              >
                All
              </button>
              <button
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  category === "regular"
                    ? "bg-background text-foreground"
                    : "bg-muted hover:bg-muted"
                }`}
                onClick={() => handleCategoryChange("regular")}
              >
                Regular
              </button>
              <button
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  category === "brands"
                    ? "bg-background text-foreground"
                    : "bg-muted hover:bg-muted"
                }`}
                onClick={() => handleCategoryChange("brands")}
              >
                Brands
              </button>
              <button
                className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                  category === "solid" ? "bg-background text-foreground" : "bg-muted hover:bg-muted"
                }`}
                onClick={() => handleCategoryChange("solid")}
              >
                Solid
              </button>
            </div>
          </div>

          {/* Icon count */}
          <div className="mb-2 shrink-0 text-xs text-muted-foreground">
            {filteredIcons.length} icon{filteredIcons.length !== 1 ? "s" : ""}
          </div>

          {/* Virtualized Grid - Takes remaining space, scrolls independently */}
          <div className="-mx-3 min-h-0 flex-1 overflow-hidden px-3">
            <Grid
              ref={gridRef}
              columnCount={columnCount}
              columnWidth={columnWidth}
              height={visibleRows * rowHeight}
              rowCount={rowCount}
              rowHeight={rowHeight}
              width={containerWidth - 24}
              className="scrollbar-light"
            >
              {Cell}
            </Grid>
          </div>
        </div>
      }
    />
  );
};
