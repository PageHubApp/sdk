import { FixedSizeGrid as Grid } from "react-window";
import { useIconSvg } from "../../../../../utils/icons/IconSvgMapContext";
import {
  COLUMN_COUNT,
  COLUMN_WIDTH,
  ROW_HEIGHT,
  CONTAINER_WIDTH,
  VISIBLE_ROWS,
  type UseIconDialogReturn,
} from "../hooks/useIconDialog";

interface IconsTabProps {
  d: UseIconDialogReturn;
}

export function IconsTab({ d }: IconsTabProps) {
  return (
    <div
      role="tabpanel"
      id="icons-tabpanel"
      aria-labelledby="icons-tab"
      aria-label="Icon selection"
    >
      {/* Search + set selector */}
      <div className="border-base-300 bg-neutral flex items-center gap-2 border-b px-3 py-2">
        <input
          ref={el => {
            if (el) el.focus();
          }}
          type="text"
          className="input-dialog-sm py-1.5! flex-1"
          placeholder="Search icons..."
          value={d.search}
          onChange={e => d.handleSearch(e.target.value)}
          aria-label="Search icons"
        />
        <select
          className="input-dialog-sm py-1.5! w-24"
          value={d.set}
          onChange={e => d.handleSetChange(e.target.value)}
          aria-label="Icon set"
        >
          {(d.setIndex ?? [{ id: d.set, name: d.set, count: 0 } as any]).map(s => (
            <option key={s.id} value={s.id}>
              {s.id}
            </option>
          ))}
        </select>
      </div>

      <div className="border-base-300 bg-base-200 text-base-content flex items-center justify-between border-b px-3 py-1.5 text-xs">
        <span>
          {d.setIndex?.find(s => s.id === d.set)?.name ?? d.set}
        </span>
        <span className="text-neutral-content">
          {d.loadingNames ? "Loading…" : `${d.filteredIcons.length} icon${d.filteredIcons.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Grid */}
      <div
        role="grid"
        aria-label="Icons grid"
        aria-rowcount={d.rowCount}
        aria-colcount={COLUMN_COUNT}
      >
        <Grid
          ref={d.gridRef}
          columnCount={COLUMN_COUNT}
          columnWidth={COLUMN_WIDTH}
          height={VISIBLE_ROWS * ROW_HEIGHT}
          rowCount={d.rowCount}
          rowHeight={ROW_HEIGHT}
          width={CONTAINER_WIDTH}
          className="scrollbar-light border-base-300 bg-base-200 text-base-content border-b"
        >
          {({ columnIndex, rowIndex, style }) => {
            const index = rowIndex * COLUMN_COUNT + columnIndex;
            if (index >= d.filteredIcons.length) return null;

            const name = d.filteredIcons[index];
            const iconRef = `ref-icon:${d.set}/${name}`;
            const isSelected = d.selectedIcon === iconRef;
            const isFocused = d.focusedIndex === index;

            return (
              <div style={style}>
                <button
                  onClick={() => d.handleIconClick(name)}
                  onDoubleClick={() => d.handleIconDoubleClick(name)}
                  className={`flex size-full cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border p-1 ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary"
                      : isFocused
                        ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                        : "hover:border-base-300 hover:bg-neutral border-transparent"
                  }`}
                  aria-label={`Icon: ${name}`}
                  tabIndex={isFocused ? 0 : -1}
                  role="gridcell"
                  aria-selected={isSelected}
                >
                  <IconPreview iconRef={iconRef} />
                  <span className="text-neutral-content w-full truncate text-center text-[8px] leading-tight">
                    {name}
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

function IconPreview({ iconRef }: { iconRef: string }) {
  const entry = useIconSvg(iconRef);
  if (!entry) {
    return <div className="h-6 w-6 opacity-30" aria-hidden="true" />;
  }
  return (
    <svg
      aria-hidden="true"
      viewBox={entry.viewBox}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className="h-6 w-6"
      dangerouslySetInnerHTML={{ __html: entry.svg }}
    />
  );
}
