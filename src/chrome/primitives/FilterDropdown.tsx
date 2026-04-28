import type { ComponentType } from "react";
import { TbChevronDown, TbX } from "react-icons/tb";
import { PAGEHUB_RTT_GLOBAL_ID } from "./layout/tooltipSurface";

export interface FilterDropdownItem {
  name: string;
  count: number;
}

export interface FilterDropdownProps {
  label: string;
  activeValue: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onClear: () => void;
  items: FilterDropdownItem[];
  activeKey: string | null;
  onSelect: (name: string) => void;
  icon?: ComponentType<{ className?: string }>;
  isAutoApplied?: boolean;
  align?: "left" | "right";
}

/**
 * Shared filter chip used by panel headers (Components category, Blocks style /
 * subcategory). Trigger collapses to an icon when `icon` is provided. Active
 * state is a primary pill with an inline clear-X.
 */
export function FilterDropdown({
  label,
  activeValue,
  isOpen,
  onToggle,
  onClose,
  onClear,
  items,
  activeKey,
  onSelect,
  icon: Icon,
  isAutoApplied,
  align = "right",
}: FilterDropdownProps) {
  const alignClass = align === "left" ? "left-0" : "right-0";
  return (
    <div className="relative">
      {activeValue ? (
        <div className="flex items-center gap-1">
          <span className="bg-primary text-primary-content inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
            {Icon ? <Icon className="size-3" /> : null}
            <span>{activeValue}</span>
            {isAutoApplied ? (
              <span
                className="bg-primary-content/60 size-1 rounded-full"
                data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
                data-tooltip-content="Auto-applied from your site's style"
              />
            ) : null}
          </span>
          <button
            onClick={onClear}
            className="hover:bg-neutral cursor-pointer rounded-full p-0.5 transition-colors"
            aria-label={`Clear ${label}`}
            data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
            data-tooltip-content={`Clear ${label}`}
          >
            <TbX className="text-neutral-content size-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={onToggle}
          className="text-neutral-content hover:bg-neutral flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
          aria-label={label}
          data-tooltip-id={PAGEHUB_RTT_GLOBAL_ID}
          data-tooltip-content={label}
        >
          {Icon ? <Icon className="size-3.5" /> : <span>{label}</span>}
          <TbChevronDown className={`size-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      )}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div
            className={`border-base-300 bg-base-100 absolute top-full ${alignClass} z-50 mt-1 min-w-[160px] rounded-xl border py-1 shadow-lg`}
          >
            {items.map(item => (
              <button
                key={item.name}
                onClick={() => onSelect(item.name)}
                className={`hover:bg-neutral flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                  activeKey === item.name ? "text-primary font-medium" : "text-base-content"
                }`}
              >
                <span>{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</span>
                <span className="text-neutral-content">{item.count}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
