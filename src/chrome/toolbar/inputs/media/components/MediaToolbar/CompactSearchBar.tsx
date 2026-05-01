import { TbSearch } from "react-icons/tb";
import { TOOLBAR_BAR_H } from "./styles";

interface CompactSearchBarProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  searchQuery: string;
  onSearch: (q: string) => void;
}

export function CompactSearchBar({ inputRef, searchQuery, onSearch }: CompactSearchBarProps) {
  return (
    <div className="mt-2">
      <div
        className={`input-wrapper input-hover relative flex min-h-0 w-full items-center ${TOOLBAR_BAR_H}`}
      >
        <TbSearch className="text-neutral-content pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search media..."
          className="input-plain-search h-full! min-h-0 pl-10"
        />
      </div>
    </div>
  );
}
