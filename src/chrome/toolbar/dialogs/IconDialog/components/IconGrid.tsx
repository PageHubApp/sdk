import { IconCell } from "./IconCell";

interface IconGridProps {
  refs: string[];
  selectedIcon: string | undefined;
  favorites: string[];
  onPick: (iconRef: string) => void;
  onDoublePick: (iconRef: string) => void;
  onToggleFavorite: (iconRef: string) => void;
  onHover?: (iconRef: string | null) => void;
}

export function IconGrid({
  refs,
  selectedIcon,
  favorites,
  onPick,
  onDoublePick,
  onToggleFavorite,
  onHover,
}: IconGridProps) {
  if (refs.length === 0) {
    return (
      <div className="text-neutral-content px-3 py-4 text-center text-xs">
        No icons.
      </div>
    );
  }

  const favSet = new Set(favorites);

  return (
    <div
      role="grid"
      aria-label="Icons"
      className="grid grid-cols-5 gap-1"
    >
      {refs.map(ref => (
        <div key={ref} className="aspect-square">
          <IconCell
            iconRef={ref}
            isSelected={selectedIcon === `ref-icon:${ref}`}
            isFavorite={favSet.has(ref)}
            onClick={onPick}
            onDoubleClick={onDoublePick}
            onContextMenu={onToggleFavorite}
            onHover={onHover}
          />
        </div>
      ))}
    </div>
  );
}
