import { FixedSizeGrid as Grid } from "react-window";
import { IconLoader } from "../../IconLoader";
import {
  SVG_CATEGORIES,
  COLUMN_COUNT,
  COLUMN_WIDTH,
  ROW_HEIGHT,
  CONTAINER_WIDTH,
  VISIBLE_ROWS,
  type UseIconDialogReturn,
} from "../hooks/useIconDialog";

interface SvgIconsTabProps {
  d: UseIconDialogReturn;
}

export function SvgIconsTab({ d }: SvgIconsTabProps) {
  return (
    <div
      role="tabpanel"
      id="icons-tabpanel"
      aria-labelledby="icons-tab"
      aria-label="SVG Icons selection"
    >
      {/* Search */}
      <div className="border-base-300 bg-neutral border-b px-3 py-2">
        <input
          ref={el => {
            if (el) el.focus();
          }}
          type="text"
          className="input-dialog-sm py-1.5!"
          placeholder="Search icons..."
          onChange={e => d.setSvgSearchValue(e.target.value)}
          aria-label="Search SVG icons"
        />
      </div>

      {/* Categories */}
      <div className="border-base-300 bg-base-200 border-b p-3">
        <div className="text-base-content mb-1.5 flex items-center justify-between text-xs font-medium">
          Category
          <div className="text-neutral-content text-xs">
            {d.filteredSvgIcons.length} icon{d.filteredSvgIcons.length !== 1 ? "s" : ""}
          </div>
        </div>
        <div
          className="scrollbar-light flex gap-1.5 overflow-x-auto py-1"
          role="group"
          aria-label="SVG icon categories"
        >
          {SVG_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${d.svgCategory === cat.id ? "bg-primary text-primary-content" : "bg-neutral text-neutral-content hover:bg-neutral/80"}`}
              onClick={() => {
                d.setSvgCategory(cat.id);
                d.svgGridRef.current?.scrollTo({ scrollLeft: 0, scrollTop: 0 });
              }}
              aria-pressed={d.svgCategory === cat.id}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div
        role="grid"
        aria-label="SVG Icons grid"
        aria-rowcount={d.svgRowCount}
        aria-colcount={COLUMN_COUNT}
      >
        <Grid
          ref={d.svgGridRef}
          columnCount={COLUMN_COUNT}
          columnWidth={COLUMN_WIDTH}
          height={VISIBLE_ROWS * ROW_HEIGHT}
          rowCount={d.svgRowCount}
          rowHeight={ROW_HEIGHT}
          width={CONTAINER_WIDTH}
          className="scrollbar-light border-base-300 bg-base-200 text-base-content border-b"
        >
          {({ columnIndex, rowIndex, style }) => {
            const index = rowIndex * COLUMN_COUNT + columnIndex;
            if (index >= d.filteredSvgIcons.length) return null;

            const icon = d.filteredSvgIcons[index];
            // Convert path "/icons/fa/brands/facebook.svg" → "brands/facebook"
            const key = icon.replace(/^\/icons\/fa\//, "").replace(/\.svg$/, "");
            const iconRef = `ref-icon:${key}`;
            const isSelected = d.selectedIcon === iconRef;
            const isFocused = d.focusedSvgIconIndex === index;
            const iconName =
              key
                .split("/")
                .pop()
                ?.replace(/-/g, " ") || "";

            return (
              <div style={style}>
                <button
                  onClick={() => d.handleSvgIconClick(iconRef)}
                  onDoubleClick={() => d.handleSvgIconDoubleClick(iconRef)}
                  className={`flex size-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border p-1 ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : isFocused
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "hover:border-base-300 hover:bg-neutral border-transparent"
                  }`}
                  aria-label={`SVG icon: ${iconName}`}
                  tabIndex={isFocused ? 0 : -1}
                  role="gridcell"
                  aria-selected={isSelected}
                >
                  <IconLoader icon={icon} />
                  <span className="text-neutral-content w-full truncate text-center text-[8px] leading-tight">
                    {iconName}
                  </span>
                </button>
              </div>
            );
          }}
        </Grid>
      </div>
    </div>
  );
}
