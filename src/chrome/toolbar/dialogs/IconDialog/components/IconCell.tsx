import { memo } from "react";

interface IconCellProps {
  iconRef: string;
  isSelected: boolean;
  isFocused?: boolean;
  isFavorite?: boolean;
  onClick: (iconRef: string) => void;
  onDoubleClick: (iconRef: string) => void;
  onContextMenu: (iconRef: string) => void;
  onHover?: (iconRef: string | null) => void;
}

function IconCellImpl({
  iconRef,
  isSelected,
  isFocused,
  isFavorite,
  onClick,
  onDoubleClick,
  onContextMenu,
  onHover,
}: IconCellProps) {
  const slash = iconRef.indexOf("/");
  const name = slash > 0 ? iconRef.slice(slash + 1) : iconRef;

  return (
    <button
      type="button"
      onClick={() => onClick(iconRef)}
      onDoubleClick={() => onDoubleClick(iconRef)}
      onContextMenu={e => {
        e.preventDefault();
        onContextMenu(iconRef);
      }}
      onMouseEnter={onHover ? () => onHover(iconRef) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
      onFocus={onHover ? () => onHover(iconRef) : undefined}
      className={`relative flex size-full cursor-pointer items-center justify-center rounded-md transition-colors ${
        isSelected
          ? "bg-primary/10 text-primary"
          : isFocused
            ? "ring-primary/40 bg-primary/5 ring-1"
            : "text-base-content/80 hover:bg-neutral hover:text-base-content"
      }`}
      aria-label={`Icon: ${name}${isFavorite ? " (favorite)" : ""}`}
      tabIndex={isFocused ? 0 : -1}
      role="gridcell"
      aria-selected={isSelected}
    >
      <svg className="h-[18px] w-[18px]" aria-hidden="true" fill="currentColor">
        <use href={`#${name}`} />
      </svg>
      {isFavorite && (
        <span
          aria-hidden="true"
          className="bg-primary absolute top-1 right-1 size-1 rounded-full"
        />
      )}
    </button>
  );
}

export const IconCell = memo(IconCellImpl);
