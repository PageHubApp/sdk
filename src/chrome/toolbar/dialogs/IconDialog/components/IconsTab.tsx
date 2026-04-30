import { useEffect, useState } from "react";
import { FixedSizeGrid as Grid } from "react-window";
import { loadIconSprite } from "../../../../../utils/icons/IconSvgMapContext";
import { AutoHideScrollbar } from "../../../../primitives/layout/AutoHideScrollbar";
import { SearchInput } from "../../../../primitives/SearchInput";
import { ToolbarDropdown } from "../../../ToolbarDropdown";
import { ToolbarSection } from "../../../ToolbarSection";
import { IconCell } from "./IconCell";
import { IconGrid } from "./IconGrid";
import commonIcons from "../constants/commonIcons";
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
  useEffect(() => {
    loadIconSprite(d.set);
  }, [d.set]);

  const [hoveredRef, setHoveredRef] = useState<string | null>(null);
  const isSearching = d.search.length > 0;

  const selectedRef = d.selectedIcon?.startsWith("ref-icon:")
    ? d.selectedIcon.slice("ref-icon:".length)
    : null;
  const captionRef = hoveredRef ?? selectedRef;
  const captionName = captionRef ? captionRef.slice(captionRef.indexOf("/") + 1) : null;
  const captionSet = captionRef ? captionRef.slice(0, captionRef.indexOf("/")) : null;

  return (
    <div
      role="tabpanel"
      id="icons-tabpanel"
      aria-labelledby="icons-tab"
      aria-label="Icon selection"
      className="flex min-h-0 flex-1 flex-col"
    >
      {/* Search + set selector */}
      <div className="flex shrink-0 items-center gap-2 px-3 py-2">
        <SearchInput
          value={d.search}
          onChange={d.handleSearch}
          placeholder="Search icons..."
          size="slim"
          className="flex-1"
        />
        <div className="w-32 shrink-0">
          <ToolbarDropdown
            value={d.set}
            onChange={d.handleSetChange}
            placeholder="Icon set"
          >
            {(d.setIndex ?? [{ id: d.set, name: d.set, count: 0 } as any]).map(s => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </ToolbarDropdown>
        </div>
      </div>

      {/* Inline count under the search row — removed the separate sub-header band. */}
      {(isSearching || d.loadingNames) && (
        <div className="text-neutral-content shrink-0 px-3 pb-1 text-[10px]">
          {d.loadingNames
            ? "Loading…"
            : `${d.filteredIcons.length} result${d.filteredIcons.length !== 1 ? "s" : ""}`}
        </div>
      )}

      {isSearching ? (
        <div
          role="grid"
          aria-label="Icons grid"
          aria-rowcount={d.rowCount}
          aria-colcount={COLUMN_COUNT}
          className="min-h-0 flex-1 overflow-hidden"
        >
          <Grid
            ref={d.gridRef}
            columnCount={COLUMN_COUNT}
            columnWidth={COLUMN_WIDTH}
            height={VISIBLE_ROWS * ROW_HEIGHT}
            rowCount={d.rowCount}
            rowHeight={ROW_HEIGHT}
            width={CONTAINER_WIDTH}
            className="scrollbar-light text-base-content"
          >
            {({ columnIndex, rowIndex, style }) => {
              const index = rowIndex * COLUMN_COUNT + columnIndex;
              if (index >= d.filteredIcons.length) return null;
              const name = d.filteredIcons[index];
              const iconRef = `${d.set}/${name}`;
              const fullRef = `ref-icon:${iconRef}`;
              const isFocused = d.focusedIndex === index;
              return (
                <div style={style} className="p-0.5">
                  <IconCell
                    iconRef={iconRef}
                    isSelected={d.selectedIcon === fullRef}
                    isFocused={isFocused}
                    isFavorite={d.favorites.includes(iconRef)}
                    onClick={d.handleIconClick}
                    onDoubleClick={d.handleIconDoubleClick}
                    onContextMenu={d.toggleFavorite}
                    onHover={setHoveredRef}
                  />
                </div>
              );
            }}
          </Grid>
        </div>
      ) : (
        <AutoHideScrollbar className="min-h-0 flex-1">
          <ToolbarSection title="Common" defaultOpen full={1}>
            <IconGrid
              refs={commonIcons}
              selectedIcon={d.selectedIcon}
              favorites={d.favorites}
              onPick={d.handleIconClick}
              onDoublePick={d.handleIconDoubleClick}
              onToggleFavorite={d.toggleFavorite}
              onHover={setHoveredRef}
            />
          </ToolbarSection>

          {d.recents.length > 0 && (
            <ToolbarSection
              title={`Recents · ${d.recents.length}`}
              defaultOpen={false}
              full={1}
            >
              <IconGrid
                refs={d.recents}
                selectedIcon={d.selectedIcon}
                favorites={d.favorites}
                onPick={d.handleIconClick}
                onDoublePick={d.handleIconDoubleClick}
                onToggleFavorite={d.toggleFavorite}
              />
            </ToolbarSection>
          )}

          {d.favorites.length > 0 && (
            <ToolbarSection
              title={`Favorites · ${d.favorites.length}`}
              defaultOpen={false}
              full={1}
            >
              <IconGrid
                refs={d.favorites}
                selectedIcon={d.selectedIcon}
                favorites={d.favorites}
                onPick={d.handleIconClick}
                onDoublePick={d.handleIconDoubleClick}
                onToggleFavorite={d.toggleFavorite}
              />
            </ToolbarSection>
          )}

          {d.categories.map(cat => (
            <ToolbarSection
              key={`${d.set}:${cat.key}`}
              title={`${cat.label} · ${cat.refs.length}`}
              defaultOpen={false}
              full={1}
              scrollable={cat.refs.length > 50}
              maxHeight="280px"
            >
              <IconGrid
                refs={cat.refs}
                selectedIcon={d.selectedIcon}
                favorites={d.favorites}
                onPick={d.handleIconClick}
                onDoublePick={d.handleIconDoubleClick}
                onToggleFavorite={d.toggleFavorite}
              />
            </ToolbarSection>
          ))}

          {(d.setNames?.length ?? 0) > 0 && (
            <ToolbarSection
              key={`${d.set}:__all__`}
              title={`All · ${(d.setNames?.length ?? 0).toLocaleString()}`}
              defaultOpen={d.categories.length === 0}
              full={1}
            >
              <div
                role="grid"
                aria-label={`All ${d.set} icons`}
                style={{ width: CONTAINER_WIDTH, height: VISIBLE_ROWS * ROW_HEIGHT }}
              >
                <Grid
                  columnCount={COLUMN_COUNT}
                  columnWidth={COLUMN_WIDTH}
                  height={VISIBLE_ROWS * ROW_HEIGHT}
                  rowCount={Math.ceil((d.setNames?.length ?? 0) / COLUMN_COUNT)}
                  rowHeight={ROW_HEIGHT}
                  width={CONTAINER_WIDTH}
                  className="scrollbar-light"
                >
                  {({ columnIndex, rowIndex, style }) => {
                    const index = rowIndex * COLUMN_COUNT + columnIndex;
                    const names = d.setNames || [];
                    if (index >= names.length) return null;
                    const name = names[index];
                    const iconRef = `${d.set}/${name}`;
                    const fullRef = `ref-icon:${iconRef}`;
                    return (
                      <div style={style} className="p-1">
                        <IconCell
                          iconRef={iconRef}
                          isSelected={d.selectedIcon === fullRef}
                          isFocused={false}
                          isFavorite={d.favorites.includes(iconRef)}
                          onClick={d.handleIconClick}
                          onDoubleClick={d.handleIconDoubleClick}
                          onContextMenu={d.toggleFavorite}
                          onHover={setHoveredRef}
                        />
                      </div>
                    );
                  }}
                </Grid>
              </div>
            </ToolbarSection>
          )}
        </AutoHideScrollbar>
      )}

      <div className="border-base-300 bg-neutral text-neutral-content flex h-10 shrink-0 items-center gap-2 border-t px-3 text-xs">
        {captionName ? (
          <>
            <svg className="text-base-content size-5 shrink-0" aria-hidden="true" fill="currentColor">
              <use href={`#${captionName}`} />
            </svg>
            <span className="text-base-content truncate font-mono text-[11px]">{captionName}</span>
            <span className="text-neutral-content/60 shrink-0 uppercase tracking-wide">{captionSet}</span>
          </>
        ) : (
          <span className="text-neutral-content/60">Hover an icon to preview</span>
        )}
      </div>
    </div>
  );
}
