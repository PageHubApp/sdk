interface ItemCountTextProps {
  selectionMode: boolean;
  selectedCount: number;
  filteredCount: number;
  totalCount: number;
  searchQuery: string;
}

export function ItemCountText({
  selectionMode,
  selectedCount,
  filteredCount,
  totalCount,
  searchQuery,
}: ItemCountTextProps) {
  return (
    <div className="text-neutral-content order-3 ml-auto shrink-0 text-[11px]">
      {selectionMode
        ? `${filteredCount} ${filteredCount === 1 ? "item" : "items"}`
        : selectedCount > 0
          ? `${selectedCount} selected`
          : searchQuery
            ? `${filteredCount} of ${totalCount}`
            : `${filteredCount} ${filteredCount === 1 ? "item" : "items"}`}
    </div>
  );
}
