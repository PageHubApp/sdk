import React, { useEffect, useRef } from "react";
import { SearchInput } from "../primitives/SearchInput";

export interface EditorListPickerProps {
  /** Merged onto the root `relative` wrapper (layout, width). */
  className?: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  /** Only invoked when the menu closes due to an outside pointer event. */
  onDismiss?: () => void;
  /** Trigger control(s); typically a `button` toggling `setIsOpen`. */
  trigger: React.ReactNode;
  /** Optional node between trigger and flyout (e.g. external preview link). */
  afterTrigger?: React.ReactNode;
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Hide the search field (e.g. for short lists). Defaults to true. */
  showSearch?: boolean;
  /** Header label shown above the list when search is hidden. */
  title?: string;
  /** Scrollable list body (items, empty states). */
  children: React.ReactNode;
  /** Footer block (create actions, secondary rows). Top border is applied by this shell. */
  footer?: React.ReactNode;
}

/**
 * Shared chrome: anchored flyout with search field, scroll region, optional footer,
 * and outside-dismiss handling (matches Page / Component selector UX).
 */
export function EditorListPicker({
  className = "",
  isOpen,
  setIsOpen,
  onDismiss,
  trigger,
  afterTrigger,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  showSearch = true,
  title,
  children,
  footer,
}: EditorListPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePointerDownOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onDismiss?.();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handlePointerDownOutside);
      if (showSearch) searchRef.current?.focus();
      return () => document.removeEventListener("mousedown", handlePointerDownOutside);
    }
  }, [isOpen, setIsOpen, onDismiss, showSearch]);

  return (
    <div className={`relative ${className}`.trim()} ref={rootRef}>
      {trigger}
      {afterTrigger}
      {isOpen ? (
        <div className="ph-panel text-base-content absolute inset-x-0 top-full z-50 mt-1 flex max-h-[500px] min-w-[280px] flex-col overflow-hidden">
          {showSearch ? (
            <div className="border-base-300 border-b p-2">
              <SearchInput
                ref={searchRef}
                size="slim"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={onSearchChange}
              />
            </div>
          ) : title ? (
            <div className="border-base-300 text-neutral-content border-b px-3 py-2 text-[10px] font-medium tracking-wide uppercase">
              {title}
            </div>
          ) : null}
          <div className="scrollbar bg-base-100 text-base-content flex-1 overflow-y-auto">
            {children}
          </div>
          {footer != null ? (
            <div className="border-base-300 shrink-0 border-t">{footer}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
