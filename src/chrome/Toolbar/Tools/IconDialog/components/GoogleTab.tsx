import { FixedSizeGrid as Grid } from "react-window";
import {
  GOOGLE_CATEGORIES,
  ICON_STYLES,
  COLUMN_COUNT,
  COLUMN_WIDTH,
  ROW_HEIGHT,
  CONTAINER_WIDTH,
  VISIBLE_ROWS,
  type UseIconDialogReturn,
} from "../hooks/useIconDialog";

interface GoogleTabProps {
  d: UseIconDialogReturn;
}

export function GoogleTab({ d }: GoogleTabProps) {
  const Cell = ({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
    const index = rowIndex * COLUMN_COUNT + columnIndex;
    if (index >= d.filteredIcons.length) return null;

    const iconName = d.filteredIcons[index];
    const iconRef = `ref-google:${iconName}`;
    const isSelected = d.selectedIcon === iconRef;
    const isFocused = d.focusedIconIndex === index;

    return (
      <div style={{ ...style, padding: "3px" }}>
        <button
          id={`googleIconPicker-${iconName}`}
          className={`flex size-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border p-1 ${
            isSelected
              ? "border-primary bg-primary/10 text-primary"
              : isFocused
                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                : "border-transparent hover:border-base-300 hover:bg-neutral"
          }`}
          onClick={() => d.handleIconClick(iconName)}
          onDoubleClick={() => d.handleIconDoubleClick(iconName)}
          aria-label={`Google icon: ${iconName.replace(/_/g, " ")}`}
          tabIndex={isFocused ? 0 : -1}
          role="gridcell"
          aria-selected={isSelected}
        >
          <span
            className="google-icons pointer-events-none text-lg"
            style={{ fontVariationSettings: `'FILL' ${d.fill}, 'wght' ${d.weight}, 'GRAD' ${d.grade}, 'opsz' ${d.opticalSize}` }}
            aria-hidden="true"
          >
            {iconName}
          </span>
          <span className="w-full truncate text-center text-[8px] leading-tight text-neutral-content">
            {iconName.replace(/_/g, " ")}
          </span>
        </button>
      </div>
    );
  };

  return (
    <div role="tabpanel" id="google-tabpanel" aria-labelledby="google-tab" aria-label="Google Material Icons">
      {/* Search */}
      <div className="border-b border-base-300 bg-neutral px-3 py-2">
        <input
          type="text"
          className="input-dialog-sm py-1.5!"
          placeholder="Search icons..."
          onChange={e => d.handleSearch(e.target.value)}
          autoFocus
          aria-label="Search Google Material Icons"
        />
      </div>

      {/* Filters */}
      <div className="shrink-0 border-b border-base-300 bg-base-100 p-3">
        {/* Categories */}
        <div className="mb-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-base-content">
            Category
            <div className="text-xs text-neutral-content">{d.filteredIcons.length} icon{d.filteredIcons.length !== 1 ? "s" : ""}</div>
          </div>
          <div className="scrollbar-light flex gap-1.5 overflow-x-auto py-1" role="group" aria-label="Icon categories">
            {GOOGLE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${d.category === cat.id ? "bg-primary text-primary-content" : "bg-neutral text-neutral-content hover:bg-neutral/80"}`}
                onClick={() => d.handleCategoryChange(cat.id)}
                aria-pressed={d.category === cat.id}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style & Weight */}
        <div className="mb-3">
          <div className="scrollbar-hide flex items-center gap-3">
            <div className="flex shrink-0 gap-1.5" role="group" aria-label="Icon style">
              {ICON_STYLES.map(style => (
                <button
                  key={style.id}
                  className={`shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors ${d.iconStyle === style.id ? "bg-primary text-primary-content" : "bg-neutral text-neutral-content hover:bg-neutral/80"}`}
                  onClick={() => d.handleStyleChange(style.id, style.fill)}
                  aria-pressed={d.iconStyle === style.id}
                >
                  {style.label}
                </button>
              ))}
            </div>
            <SliderControl id="weight-slider" label="Weight" min={100} max={700} step={100} value={d.weight} onChange={d.setWeight} />
          </div>
        </div>

        {/* Grade & Size */}
        <div className="mb-3">
          <div className="scrollbar-hide flex items-center gap-3 overflow-x-auto">
            <SliderControl id="grade-slider" label="Grade" min={-25} max={200} step={25} value={d.grade} onChange={d.setGrade} />
            <SliderControl id="size-slider" label="Size" min={20} max={48} step={1} value={d.opticalSize} onChange={d.setOpticalSize} />
          </div>
        </div>
      </div>

      {/* Loading */}
      {!d.fontLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-base-100/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="size-8 animate-spin rounded-full border-4 border-neutral border-t-primary" />
            <p className="text-sm text-neutral-content">Loading icons...</p>
          </div>
        </div>
      )}

      {/* Grid */}
      <div role="grid" aria-label="Google Material Icons grid" aria-rowcount={d.rowCount} aria-colcount={COLUMN_COUNT}>
        <Grid
          ref={d.gridRef}
          columnCount={COLUMN_COUNT}
          columnWidth={COLUMN_WIDTH}
          height={VISIBLE_ROWS * ROW_HEIGHT}
          rowCount={d.rowCount}
          rowHeight={ROW_HEIGHT}
          width={CONTAINER_WIDTH}
          className="scrollbar-light border-b border-base-300 bg-base-100 text-base-content"
        >
          {Cell}
        </Grid>
      </div>
    </div>
  );
}

function SliderControl({ id, label, min, max, step, value, onChange }: {
  id: string; label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-l border-base-300 pl-3 first:border-l-0 first:pl-0">
      <label htmlFor={id} className="text-xs font-medium text-base-content">{label}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="slider h-2 w-20 cursor-pointer appearance-none rounded-lg bg-neutral"
      />
      <span className="text-xs text-neutral-content">{value}</span>
    </div>
  );
}
